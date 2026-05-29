import {
  COMBAT_ENCOUNTER_LINES,
  COMBAT_FLEE_EXIT_LINES,
  COMBAT_FOOD_BONUS_MAX,
  COMBAT_GOLD_REWARD_MAX,
  COMBAT_GOLD_REWARD_MIN,
  COMBAT_VICTORY_EXIT_LINES,
  ENABLE_ANIMATIONS,
} from '../../constants'
import { cellIdForPos, getCellAt } from '../../cells'
import { resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
import { gameOverMessage } from '../../gameOver'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Action, CombatEncounter, Encounter, Resources, State, Ui, Vec2, World } from '../../types'
import { enqueueDeltas, enqueueGridTransition } from '../../uiAnim'
import type {
  MechanicDef,
  PreviewPlateProvider,
  ReduceEncounterAction,
  RightGridProvider,
  TileEnterResult,
} from '../types'
// Lazy circular: `mechanics/index.ts` builds MECHANIC_INDEX from this file's
// `combatMechanic`, so the import binding here is only safe to dereference
// inside function bodies (post-module-graph load), never at module scope.
import { MECHANIC_INDEX } from '../index'

export const ACTION_FIGHT = 'FIGHT' as const
export const ACTION_COMBAT_PAY = 'COMBAT_PAY' as const
export const ACTION_RETURN = 'RETURN' as const
export type CombatAction =
  | { type: typeof ACTION_FIGHT }
  | { type: typeof ACTION_COMBAT_PAY }
  | { type: typeof ACTION_RETURN }

// ---- Pure combat math -------------------------------------------------------------

// Roll the enemy army size from the world's stream RNG: U[playerArmy..playerArmy*2].
// Exported for tests that need to predict the spawn deterministically.
export function spawnEnemyArmy(opts: { rngState: number; playerArmy: number }): { rngState: number; enemyArmy: number } {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const r = RNG.createStreamRandom(opts.rngState)
  const delta = r.intExclusive(playerArmy + 1)
  return { rngState: r.rngState, enemyArmy: playerArmy + delta }
}

// One round: each side rolls U[0..size+5); ties go to the player. On player hit, enemy
// army halves (floor); on enemy hit, player loses 1 troop (handled by the caller).
type FightRound = {
  rngState: number
  outcome: 'playerHit' | 'enemyHit'
  nextEnemyArmy: number
  enemyDelta: number
  killed: number
}
function resolveFightRound(opts: { rngState: number; playerArmy: number; enemyArmy: number }): FightRound {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const enemyArmy = Math.max(0, Math.trunc(opts.enemyArmy))
  const r = RNG.createStreamRandom(opts.rngState)
  const w = r.intExclusive(playerArmy + 5)
  const b = r.intExclusive(enemyArmy + 5)
  if (w >= b) {
    const nextEnemyArmy = Math.floor(enemyArmy / 2)
    const killed = enemyArmy - nextEnemyArmy
    return { rngState: r.rngState, outcome: 'playerHit', nextEnemyArmy, enemyDelta: nextEnemyArmy - enemyArmy, killed }
  }
  return { rngState: r.rngState, outcome: 'enemyHit', nextEnemyArmy: enemyArmy, enemyDelta: 0, killed: 0 }
}

// ---- Right-grid + action dispatch -------------------------------------------------

// `previewEncounter()` synthesizes a placeholder with `sourceCellId: -1` so
// the right-grid renderer can pre-paint a combat cross during grid-slide
// transitions. Variant lookup must tolerate that sentinel.
function isValidSourceCellId(world: World, sourceCellId: number): boolean {
  return sourceCellId >= 0 && sourceCellId < world.width * world.height
}

function combatVariantForEncounter(state: State): CombatVariantConfig {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') return STANDARD_COMBAT_VARIANT
  if (!isValidSourceCellId(state.world, enc.sourceCellId)) return STANDARD_COMBAT_VARIANT
  const width = state.world.width
  const pos = { x: enc.sourceCellId % width, y: Math.floor(enc.sourceCellId / width) }
  const cell = getCellAt(state.world, pos)
  return MECHANIC_INDEX.combatVariantByKind[cell.kind] ?? STANDARD_COMBAT_VARIANT
}

function applyCombatResolved(world: World, sourceCellId: number): World {
  if (!isValidSourceCellId(world, sourceCellId)) return world
  const width = world.width
  const pos = { x: sourceCellId % width, y: Math.floor(sourceCellId / width) }
  const cell = getCellAt(world, pos)
  const hook = MECHANIC_INDEX.onCombatResolvedByKind[cell.kind]
  if (!hook) return world
  return hook(world, sourceCellId)
}

const combatRightGrid: RightGridProvider = (s, row, col) => {
  if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.fight, action: { type: ACTION_FIGHT } }
  if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_RETURN } }
  if (row === 1 && col === 1) {
    const variant = combatVariantForEncounter(s)
    return { spriteId: variant.centerSpriteId, action: null }
  }
  // Pay button (top-row middle): only rendered when the active variant declares
  // a `payment` config (e.g. wyrm bribe). Standard combat leaves this slot empty.
  if (row === 0 && col === 1) {
    const variant = combatVariantForEncounter(s)
    if (!variant.payment) return { action: null }
    return { spriteId: SPRITES.buttons.gold, action: { type: ACTION_COMBAT_PAY } }
  }
  return { action: null }
}

// Combat preview plate is the static enemy-army count (and any variant-specific
// extra lines, e.g. the wyrm pay cost). Animated +/- popups are regular
// `enqueueDeltas({ target: 'enemyArmy', ... })` calls — same path as food/gold/
// army — rendered by the platform's shared `drawDeltaOverlays` anchored to the
// plate's first-line icon.
const combatPreviewPlate: PreviewPlateProvider = (s) => {
  const enc = s.encounter
  if (!enc || enc.kind !== 'combat') return null
  const variant = combatVariantForEncounter(s)
  return variant.previewPlateLines(s)
}

const reduceCombatAction: ReduceEncounterAction = (prevState: State, action: Action): State | null => {
  if (action.type !== ACTION_FIGHT && action.type !== ACTION_RETURN && action.type !== ACTION_COMBAT_PAY) return null

  if (action.type === ACTION_RETURN) return reduceCombatReturn(prevState)
  if (action.type === ACTION_COMBAT_PAY) return reduceCombatPay(prevState)
  return reduceCombatFight(prevState)
}

// Pay-button reducer (variant-driven). Standard combat has no `payment` config
// and is short-circuited; wyrm/brigand variants supply computeCost / onSuccess
// / successLines / noFundsLines and this reducer applies them. On success the
// encounter closes (mirrors fight-victory close path); on insufficient funds the
// modal stays open with a no-funds line.
function reduceCombatPay(prevState: State): State {
  const enc = prevState.encounter
  if (!enc || enc.kind !== 'combat') return prevState
  const variant = combatVariantForEncounter(prevState)
  const payment = variant.payment
  if (!payment) return prevState

  const cost = payment.computeCost(enc.enemyArmySize)
  const prevRes = prevState.resources
  const prevUi = prevState.ui

  // Insufficient funds: keep the encounter open, just update the message line.
  if (prevRes.gold < cost) {
    const noFundsPick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.pay.noFunds', payment.noFundsLines)
    return {
      world: prevState.world,
      player: prevState.player,
      run: noFundsPick.nextState.run,
      resources: prevRes,
      encounter: enc,
      ui: { ...prevUi, message: noFundsPick.line || prevUi.message },
    }
  }

  // Success: deduct gold, apply onSuccess (e.g. inventory += 'blood'), close
  // the encounter with a successLines pick, and queue the same gold-delta +
  // grid-transition animation as fight-victory. The source mechanic's
  // `onCombatResolved` hook (if any) runs against the source cell — wyrm uses
  // this to flip its lair's `isBled` flag.
  const afterDeduct: Resources = { ...prevRes, gold: prevRes.gold - cost }
  const nextResources = payment.onSuccess(afterDeduct)
  const successPick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.pay.success', payment.successLines)
  const nextWorld = applyCombatResolved(prevState.world, enc.sourceCellId)
  const baseUi: Ui = { ...prevUi, message: successPick.line || prevUi.message }
  if (!ENABLE_ANIMATIONS) {
    return {
      world: nextWorld,
      player: prevState.player,
      run: successPick.nextState.run,
      resources: nextResources,
      encounter: null,
      ui: baseUi,
    }
  }

  let uiWith = enqueueDeltas(baseUi, { target: 'gold', deltas: [-cost] })
  uiWith = enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' })
  return {
    world: nextWorld,
    player: prevState.player,
    run: successPick.nextState.run,
    resources: nextResources,
    encounter: null,
    ui: uiWith,
  }
}

function reduceCombatReturn(prevState: State): State {
  if (!prevState.encounter) return prevState
  if (prevState.encounter.kind !== 'combat') return prevState
  const prevUi = prevState.ui

  const prevRes = prevState.resources
  const nextArmy = prevRes.armySize - 1
  const isGameOver = nextArmy <= 0
  const nextResources: Resources = { ...prevRes, armySize: Math.max(0, nextArmy) }
  const fleeVariant = combatVariantForEncounter(prevState)
  const fleePick = isGameOver
    ? null
    : RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.flee', fleeVariant.fleeLines)
  const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : fleePick!.nextState.run
  const nextMessage = isGameOver ? gameOverMessage(prevState.world.seed, prevState.run.stepCount) : fleePick!.line || prevUi.message
  const baseUi: Ui = { ...prevUi, message: nextMessage }
  if (!ENABLE_ANIMATIONS) {
    return {
      world: prevState.world,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: null,
      ui: baseUi,
    }
  }

  let uiWith = enqueueDeltas(baseUi, { target: 'army', deltas: [-1] })
  return {
    world: prevState.world,
    player: prevState.player,
    run: nextRun,
    resources: nextResources,
    encounter: null,
    ui: isGameOver ? uiWith : enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' }),
  }
}

function reduceCombatFight(prevState: State): State {
  const enc = prevState.encounter
  if (!enc || enc.kind !== 'combat') return prevState

  const prevEnemy = enc.enemyArmySize
  if (prevEnemy <= 0) {
    return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, encounter: null, ui: prevState.ui }
  }

  const prevRes = prevState.resources
  const prevUi = prevState.ui

  const round = resolveFightRound({
    rngState: prevState.world.rngState,
    playerArmy: prevRes.armySize,
    enemyArmy: prevEnemy,
  })

  const foodDeltas: number[] = []
  const goldDeltas: number[] = []
  const armyDeltas: number[] = []
  const enemyDeltas: number[] = []

  let nextResources = prevRes
  let nextEncounter: Encounter | null = enc

  if (round.outcome === 'playerHit') {
    const nextEnemy = round.nextEnemyArmy
    const killed = round.killed
    if (killed) enemyDeltas.push(-killed)

    nextEncounter = nextEnemy <= 0 ? null : { ...enc, enemyArmySize: nextEnemy }
  } else {
    nextResources = { ...nextResources, armySize: nextResources.armySize - 1 }
    armyDeltas.push(-1)
  }

  let nextWorld = { ...prevState.world, rngState: round.rngState }

  // Combat reward is paid once, at the end, when the enemy is eliminated.
  // Variant-driven: STANDARD_COMBAT_VARIANT rolls gold + food bonus from the
  // world rngState (the historical inline behavior); wyrm/brigand variants
  // grant slot tokens (e.g. 'blood') instead.
  if (round.outcome === 'playerHit' && nextEncounter == null) {
    const variant = combatVariantForEncounter(prevState)
    const reward = variant.victoryReward(nextResources, nextWorld.rngState)
    const goldDelta = reward.resources.gold - nextResources.gold
    if (goldDelta) goldDeltas.push(goldDelta)
    nextResources = reward.resources
    nextWorld = { ...nextWorld, rngState: reward.rngState }
    // Source-mechanic post-combat hook (e.g. wyrm flips `isBled`). Runs once,
    // only on victory close — flee/defeat never trigger it.
    nextWorld = applyCombatResolved(nextWorld, enc.sourceCellId)
  }
  nextResources = resourcesWithClampedFoodIfNeeded(nextResources)
  const appliedFoodDelta = nextResources.food - prevRes.food
  if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta)
  const isGameOver = nextResources.armySize <= 0
  const victoryVariant = combatVariantForEncounter(prevState)
  const victoryPick =
    !isGameOver && nextEncounter == null
      ? RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.victory', victoryVariant.victoryLines)
      : null
  const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : nextEncounter == null ? victoryPick!.nextState.run : prevState.run
  const nextMessage = isGameOver
    ? gameOverMessage(nextWorld.seed, prevState.run.stepCount)
    : nextEncounter == null
      ? victoryPick!.line || prevUi.message
      : prevUi.message

  const baseUi: Ui = { message: nextMessage, leftPanel: prevUi.leftPanel, clock: prevUi.clock, anim: prevUi.anim }
  if (!ENABLE_ANIMATIONS) {
    return {
      world: nextWorld,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: isGameOver ? null : nextEncounter,
      ui: baseUi,
    }
  }

  let uiWith = baseUi
  uiWith = enqueueDeltas(uiWith, { target: 'food', deltas: foodDeltas })
  uiWith = enqueueDeltas(uiWith, { target: 'gold', deltas: goldDeltas })
  uiWith = enqueueDeltas(uiWith, { target: 'army', deltas: armyDeltas })
  uiWith = enqueueDeltas(uiWith, { target: 'enemyArmy', deltas: enemyDeltas })

  if (!isGameOver && nextEncounter == null) {
    uiWith = enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' })
  }

  return {
    world: nextWorld,
    player: prevState.player,
    run: nextRun,
    resources: nextResources,
    encounter: isGameOver ? null : nextEncounter,
    ui: uiWith,
  }
}

// Open a combat encounter from a source tile (henge, woods, swamp, mountain).
// Source mechanics pick their `spawnEnemy` (rolled vs fixed) and own the
// messaging — encounterMessage during combat, restoreMessage after.
export type EnemySpawn = (rngState: number) => { rngState: number; enemyArmy: number }

// Default spawn: U[playerArmy..2*playerArmy], advancing the stream RNG.
export function rolledEnemySpawn(playerArmy: number): EnemySpawn {
  return (rngState) => spawnEnemyArmy({ rngState, playerArmy })
}

// Fixed-size spawn that leaves the stream RNG untouched. Used for deterministic
// boss-style encounters (e.g. the wyrm's initial health) where future picks
// must stay stable across balance tweaks.
export function fixedEnemySpawn(enemyArmy: number): EnemySpawn {
  const clamped = Math.max(0, Math.trunc(enemyArmy))
  return (rngState) => ({ rngState, enemyArmy: clamped })
}

export function startCombatEncounter(args: {
  world: World
  pos: Vec2
  spawnEnemy: EnemySpawn
  encounterMessage: string
  restoreMessage: string
}): TileEnterResult & { world: World; encounter: CombatEncounter } {
  const spawned = args.spawnEnemy(args.world.rngState)
  const nextWorld: World = { ...args.world, rngState: spawned.rngState }
  const encounter: CombatEncounter = {
    kind: 'combat',
    enemyArmySize: spawned.enemyArmy,
    sourceCellId: cellIdForPos(nextWorld, args.pos),
    restoreMessage: args.restoreMessage,
  }
  return {
    world: nextWorld,
    encounter,
    message: args.encounterMessage,
    enterAnims: [{ kind: 'gridTransition', from: 'overworld', to: 'combat' }],
  }
}

// ---- Combat variant injection -----------------------------------------------
//
// Combat encounters share one shape (right-grid, preview-plate, fight reducer)
// but the per-source flavor — center sprite, line pools, optional Pay button,
// victory loot — varies. Each combat-source mechanic exposes a CombatVariantConfig
// via `MechanicDef.combatVariant`; combat reads the variant by walking
// `cell.kind → mechanic → mechanic.combatVariant` from the encounter's
// `sourceCellId`. STANDARD_COMBAT_VARIANT preserves today's behavior for henge
// and terrainHazards; v0.5's wyrm and v0.7's brigand recruit instantiate their
// own variants without touching the combat reducer.
export type CombatVariantPlateLine = { spriteId: number; text: string }

export type CombatVariantConfig = {
  centerSpriteId: number
  previewPlateLines: (state: State) => readonly CombatVariantPlateLine[]
  encounterLines: readonly string[]
  victoryLines: readonly string[]
  fleeLines: readonly string[]
  payment?: {
    computeCost: (enemyArmySize: number) => number
    successLines: readonly string[]
    noFundsLines: readonly string[]
    onSuccess: (resources: Resources) => Resources
  }
  victoryReward: (resources: Resources, rngState: number) => { resources: Resources; rngState: number }
}

export const STANDARD_COMBAT_VARIANT: CombatVariantConfig = {
  centerSpriteId: SPRITES.stats.enemy,
  previewPlateLines: (s) => {
    const enc = s.encounter
    if (!enc || enc.kind !== 'combat') return []
    return [{ spriteId: SPRITES.stats.enemy, text: `${enc.enemyArmySize}` }]
  },
  encounterLines: COMBAT_ENCOUNTER_LINES,
  victoryLines: COMBAT_VICTORY_EXIT_LINES,
  fleeLines: COMBAT_FLEE_EXIT_LINES,
  victoryReward: (resources, rngState) => {
    const sr = RNG.createStreamRandom(rngState)
    const goldSpan = COMBAT_GOLD_REWARD_MAX - COMBAT_GOLD_REWARD_MIN + 1
    const gold = COMBAT_GOLD_REWARD_MIN + sr.intExclusive(goldSpan)
    const foodBonus = sr.intExclusive(COMBAT_FOOD_BONUS_MAX + 1)
    return {
      resources: {
        ...resources,
        gold: resources.gold + gold,
        food: resources.food + foodBonus,
      },
      rngState: sr.rngState,
    }
  },
}

export const combatMechanic: MechanicDef = {
  id: 'combat',
  kinds: [],
  encounter: {
    kind: 'combat',
    rightGrid: combatRightGrid,
    reduceAction: reduceCombatAction,
    previewPlate: combatPreviewPlate,
    // Enemy-army delta popups land on the plate's enemy line. Negative deltas
    // (enemy losing troops) are "good" for the player → green.
    previewPlateDeltaAnchors: [{ target: 'enemyArmy', lineIndex: 0, goodSign: -1 }],
    previewEncounter: (): CombatEncounter => ({
      kind: 'combat',
      enemyArmySize: 0,
      sourceCellId: -1,
      restoreMessage: '',
    }),
  },
}
