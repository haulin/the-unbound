import { ENABLE_ANIMATIONS } from '../../constants'
import { cellIdForPos, getCellAt, posForCellId } from '../../cells'
import { applyFoodCapOnGain } from '../../foodCarry'
import { gameOverMessage } from '../../gameOver'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Action, CombatEncounter, Encounter, Resources, State, Ui, Vec2, World } from '../../types'
import { enqueueDeltas, enqueueGridTransition } from '../../uiAnim'
import { gridButton, makeRightGrid } from '../encounterHelpers'
import type {
  MechanicDef,
  PreviewPlateProvider,
  ReduceEncounterAction,
  TileEnterResult,
} from '../types'
// Lazy circular: `mechanics/index.ts` builds MECHANIC_INDEX from this file's
// `combatMechanic`, so the import binding here is only safe to dereference
// inside function bodies (post-module-graph load), never at module scope.
import { MECHANIC_INDEX } from '../index'

export const ACTION_FIGHT = 'FIGHT' as const
export const ACTION_COMBAT_PAY = 'COMBAT_PAY' as const
export const ACTION_RETURN = 'RETURN' as const

type CombatActionSpec = { spriteId: number; reduce: (s: State) => State }

const COMBAT_ACTIONS = {
  [ACTION_FIGHT]:      { spriteId: SPRITES.actions.fight,  reduce: reduceCombatFight  },
  [ACTION_COMBAT_PAY]: { spriteId: SPRITES.inventory.gold, reduce: reduceCombatPay    },
  [ACTION_RETURN]:     { spriteId: SPRITES.actions.return, reduce: reduceCombatReturn },
} as const satisfies Record<string, CombatActionSpec>

export type CombatAction = { type: keyof typeof COMBAT_ACTIONS }

// ---- Pure combat math -------------------------------------------------------------

// Ambush spawn formula: U[max(2, p-2) .. 2*p]. The `max(min, …)` ceiling
// guards `playerArmy ∈ {0, 1}` where `2 * playerArmy < min`.
export function spawnEnemyArmy(opts: { rngState: number; playerArmy: number }): { rngState: number; enemyArmy: number } {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const min = Math.max(2, playerArmy - 2)
  const max = Math.max(min, 2 * playerArmy)
  const r = RNG.createStreamRandom(opts.rngState)
  return { rngState: r.rngState, enemyArmy: r.intInRange(min, max) }
}

// One round: each side rolls U[0..size+bonus); ties go to the player. On
// player hit, enemy halves (floor); on enemy hit, caller loses 1 troop.
type FightRound = {
  rngState: number
  outcome: 'playerHit' | 'enemyHit'
  nextEnemyArmy: number
  enemyDelta: number
  killed: number
}
function resolveFightRound(opts: {
  rngState: number
  playerArmy: number
  enemyArmy: number
  playerRollBonus: number
  enemyRollBonus: number
}): FightRound {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const enemyArmy = Math.max(0, Math.trunc(opts.enemyArmy))
  const r = RNG.createStreamRandom(opts.rngState)
  const w = r.intExclusive(playerArmy + opts.playerRollBonus)
  const b = r.intExclusive(enemyArmy + opts.enemyRollBonus)
  if (w >= b) {
    const nextEnemyArmy = Math.floor(enemyArmy / 2)
    const killed = enemyArmy - nextEnemyArmy
    return { rngState: r.rngState, outcome: 'playerHit', nextEnemyArmy, enemyDelta: nextEnemyArmy - enemyArmy, killed }
  }
  return { rngState: r.rngState, outcome: 'enemyHit', nextEnemyArmy: enemyArmy, enemyDelta: 0, killed: 0 }
}

// ---- Right-grid + action dispatch -------------------------------------------------

// `previewEncounter()` carries `sourceCellId: -1` so the right-grid can
// pre-paint a combat cross during grid-slide transitions; the variant
// lookup short-circuits to the placeholder for that path.
function isPreviewSentinel(sourceCellId: number): boolean {
  return sourceCellId < 0
}

function combatVariantForEncounter(state: State): CombatVariantConfig {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') return previewPlaceholderVariant
  if (isPreviewSentinel(enc.sourceCellId)) return previewPlaceholderVariant
  const cell = getCellAt(state.world, posForCellId(state.world, enc.sourceCellId))
  return MECHANIC_INDEX.combatVariantByKind[cell.kind] ?? previewPlaceholderVariant
}

function applyCombatClosed(
  state: State,
  outcome: 'victory' | 'flee' | 'recruit',
  encounter: CombatEncounter,
): State {
  if (isPreviewSentinel(encounter.sourceCellId)) return state
  const cell = getCellAt(state.world, posForCellId(state.world, encounter.sourceCellId))
  const hook = MECHANIC_INDEX.onCombatClosedByKind[cell.kind]
  if (!hook) return state
  return hook(state, outcome, encounter)
}

// Top slot is the pay/recruit button — always rendered. Variants that
// don't recruit return `unrecruitable` from `isEligible`.
const combatRightGrid = makeRightGrid({
  leaveAction: { type: ACTION_RETURN },
  centerSpriteId: (s) => combatVariantForEncounter(s).centerSpriteId,
  left: gridButton(COMBAT_ACTIONS, ACTION_FIGHT),
  top: gridButton(COMBAT_ACTIONS, ACTION_COMBAT_PAY),
})

const combatPreviewPlate: PreviewPlateProvider = (s) => {
  const enc = s.encounter
  if (!enc || enc.kind !== 'combat') return null
  const variant = combatVariantForEncounter(s)
  return variant.previewPlateLines(s)
}

const reduceCombatAction: ReduceEncounterAction = (prevState: State, action: Action): State | null => {
  if (!(action.type in COMBAT_ACTIONS)) return null
  return COMBAT_ACTIONS[action.type as keyof typeof COMBAT_ACTIONS].reduce(prevState)
}

function reduceCombatPay(prevState: State): State {
  const enc = prevState.encounter
  if (!enc || enc.kind !== 'combat') return prevState
  const variant = combatVariantForEncounter(prevState)
  const payment = variant.payment
  const eligibility = payment.isEligible(enc, prevState.resources)

  if (eligibility !== 'ok') {
    const lines = payment.failLines[eligibility]
    if (!lines || lines.length === 0) {
      throw new Error(`combat.pay: variant has no failLines.${eligibility}`)
    }
    const pick = RNG.createRunCopyRandom(prevState).advanceCursor(`combat.pay.${eligibility}`, lines)
    return {
      world: prevState.world,
      player: prevState.player,
      run: pick.nextState.run,
      resources: prevState.resources,
      encounter: enc,
      ui: { ...prevState.ui, message: pick.line || prevState.ui.message },
    }
  }

  // Variants with a `recruitLootScale` draw the full `victoryReward`
  // (advancing world rngState exactly once, same as a fight victory) and
  // multiply gold/food gains by the returned scale.
  const cost = payment.computeCost(enc)
  const prevRes = prevState.resources
  const prevWorld = prevState.world
  const prevUi = prevState.ui
  const afterDeduct: Resources = { ...prevRes, gold: prevRes.gold - cost }
  const afterTroops = payment.onSuccess(afterDeduct, enc)
  let nextResources: Resources = afterTroops
  let nextWorld = prevWorld
  let lootGoldGain = 0
  let lootFoodGain = 0
  if (variant.recruitLootScale) {
    const scale = variant.recruitLootScale(enc)
    const reward = variant.victoryReward(afterTroops, prevWorld.rngState, enc)
    const fullGoldGain = reward.resources.gold - afterTroops.gold
    const fullFoodGain = reward.resources.food - afterTroops.food
    lootGoldGain = Math.floor(fullGoldGain * scale)
    lootFoodGain = Math.floor(fullFoodGain * scale)
    const withLoot: Resources = {
      ...afterTroops,
      gold: afterTroops.gold + lootGoldGain,
      food: afterTroops.food + lootFoodGain,
    }
    nextResources = applyFoodCapOnGain(prevRes, withLoot)
    // Recompute applied food gain after cap-on-gain clamp.
    lootFoodGain = nextResources.food - afterTroops.food
    nextWorld = { ...prevWorld, rngState: reward.rngState }
  }
  const successPick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.pay.success', payment.successLines)
  const baseUi: Ui = { ...prevUi, message: successPick.line || prevUi.message }
  const intermediate: State = {
    world: nextWorld,
    player: prevState.player,
    run: successPick.nextState.run,
    resources: nextResources,
    encounter: null,
    ui: baseUi,
  }
  const closed = applyCombatClosed(intermediate, 'recruit', enc)
  if (!ENABLE_ANIMATIONS) {
    return closed
  }

  // Cost deduction + partial-loot gains animate as separate deltas so
  // the UI fades each independently.
  const goldDeltas: number[] = [-cost]
  if (lootGoldGain > 0) goldDeltas.push(lootGoldGain)
  let uiWith = enqueueDeltas(closed.ui, { target: 'gold', deltas: goldDeltas })
  if (lootFoodGain > 0) {
    uiWith = enqueueDeltas(uiWith, { target: 'food', deltas: [lootFoodGain] })
  }
  uiWith = enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' })
  return { ...closed, ui: uiWith }
}

function reduceCombatReturn(prevState: State): State {
  if (!prevState.encounter) return prevState
  if (prevState.encounter.kind !== 'combat') return prevState
  const enc = prevState.encounter
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
  const intermediate: State = {
    world: prevState.world,
    player: prevState.player,
    run: nextRun,
    resources: nextResources,
    encounter: null,
    ui: baseUi,
  }
  const closed = isGameOver ? intermediate : applyCombatClosed(intermediate, 'flee', enc)
  if (!ENABLE_ANIMATIONS) {
    return closed
  }

  let uiWith = enqueueDeltas(closed.ui, { target: 'army', deltas: [-1] })
  return {
    ...closed,
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

  const variant = combatVariantForEncounter(prevState)
  const round = resolveFightRound({
    rngState: prevState.world.rngState,
    playerArmy: prevRes.armySize,
    enemyArmy: prevEnemy,
    playerRollBonus: variant.playerRollBonus,
    enemyRollBonus: variant.enemyRollBonus,
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

  if (round.outcome === 'playerHit' && nextEncounter == null) {
    const reward = variant.victoryReward(nextResources, nextWorld.rngState, enc)
    const goldDelta = reward.resources.gold - nextResources.gold
    if (goldDelta) goldDeltas.push(goldDelta)
    nextResources = reward.resources
    nextWorld = { ...nextWorld, rngState: reward.rngState }
  }
  nextResources = applyFoodCapOnGain(prevRes, nextResources)
  const appliedFoodDelta = nextResources.food - prevRes.food
  if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta)
  const isGameOver = nextResources.armySize <= 0
  const victoryPick =
    !isGameOver && nextEncounter == null
      ? RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.victory', variant.victoryLines)
      : null
  const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : nextEncounter == null ? victoryPick!.nextState.run : prevState.run
  const nextMessage = isGameOver
    ? gameOverMessage(nextWorld.seed, prevState.run.stepCount)
    : nextEncounter == null
      ? victoryPick!.line || prevUi.message
      : prevUi.message

  const baseUi: Ui = { message: nextMessage, leftPanel: prevUi.leftPanel, clock: prevUi.clock, anim: prevUi.anim }
  const intermediate: State = {
    world: nextWorld,
    player: prevState.player,
    run: nextRun,
    resources: nextResources,
    encounter: isGameOver ? null : nextEncounter,
    ui: baseUi,
  }
  const closed =
    !isGameOver && nextEncounter == null ? applyCombatClosed(intermediate, 'victory', enc) : intermediate
  if (!ENABLE_ANIMATIONS) {
    return closed
  }

  let uiWith = closed.ui
  uiWith = enqueueDeltas(uiWith, { target: 'food', deltas: foodDeltas })
  uiWith = enqueueDeltas(uiWith, { target: 'gold', deltas: goldDeltas })
  uiWith = enqueueDeltas(uiWith, { target: 'army', deltas: armyDeltas })
  uiWith = enqueueDeltas(uiWith, { target: 'enemyArmy', deltas: enemyDeltas })

  if (!isGameOver && nextEncounter == null) {
    uiWith = enqueueGridTransition(uiWith, { from: 'combat', to: 'overworld' })
  }

  return { ...closed, ui: uiWith }
}

// Source mechanics pick their `spawnEnemy` (rolled vs fixed) and own the
// messaging — encounterMessage during combat, restoreMessage after.
export type EnemySpawn = (rngState: number) => { rngState: number; enemyArmy: number }

export function rolledEnemySpawn(playerArmy: number): EnemySpawn {
  return (rngState) => spawnEnemyArmy({ rngState, playerArmy })
}

// Fixed spawn that leaves the stream RNG untouched.
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
    initialSpawn: spawned.enemyArmy,
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

// ---- Combat variant ---------------------------------------------------------

export type CombatVariantPlateLine = { spriteId: number; text: string }

export type EligibilityKind = 'ok' | 'noFunds' | 'notWounded' | 'tooMany' | 'unrecruitable'

// Shared enemy-count line, anchored at `lineIndex: 0` so
// `previewPlateDeltaAnchors` can target enemy-army deltas reliably.
export function enemyCountPlateLine(state: State): CombatVariantPlateLine | null {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') return null
  const variant = combatVariantForEncounter(state)
  return { spriteId: variant.centerSpriteId, text: `${enc.enemyArmySize}` }
}

// Plate for variants that show only the enemy-count row (no recruit cost).
export function enemyCountOnlyPlateLines(state: State): readonly CombatVariantPlateLine[] {
  const line = enemyCountPlateLine(state)
  return line ? [line] : []
}

// Plate for recruitable variants: enemy count always, plus a recruit-cost
// row when payment is eligible.
export function recruitablePreviewPlateLines(state: State): readonly CombatVariantPlateLine[] {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') return []
  const enemyLine = enemyCountPlateLine(state)
  if (!enemyLine) return []
  const variant = combatVariantForEncounter(state)
  if (variant.payment.isEligible(enc, state.resources) === 'ok') {
    const cost = variant.payment.computeCost(enc)
    return [
      enemyLine,
      { spriteId: SPRITES.inventory.gold, text: `-${cost}` },
    ]
  }
  return [enemyLine]
}

export type CombatVariantConfig = {
  centerSpriteId: number
  previewPlateLines: (state: State) => readonly CombatVariantPlateLine[]
  encounterLines: readonly string[]
  victoryLines: readonly string[]
  fleeLines: readonly string[]
  playerRollBonus: number
  enemyRollBonus: number
  payment: {
    computeCost: (encounter: CombatEncounter) => number
    isEligible: (encounter: CombatEncounter, resources: Resources) => EligibilityKind
    successLines: readonly string[]
    failLines: Partial<Record<Exclude<EligibilityKind, 'ok'>, readonly string[]>>
    onSuccess: (resources: Resources, encounter: CombatEncounter) => Resources
  }
  victoryReward: (
    resources: Resources,
    rngState: number,
    encounter: CombatEncounter,
  ) => { resources: Resources; rngState: number }
  // Optional partial-loot scale (0..1) applied to gold/food gains when a
  // recruit succeeds. Without this field, recruit grants troops only.
  recruitLootScale?: (encounter: CombatEncounter) => number
}

// Placeholder for the preview-sentinel and registry-hole paths. Only
// `centerSpriteId` and `previewPlateLines` are ever read; reducer fields
// satisfy the type but never dispatch.
const previewPlaceholderVariant: CombatVariantConfig = {
  centerSpriteId: SPRITES.enemies.enemy,
  previewPlateLines: enemyCountOnlyPlateLines,
  encounterLines: [],
  victoryLines: [],
  fleeLines: [],
  playerRollBonus: 0,
  enemyRollBonus: 0,
  payment: {
    computeCost: () => 0,
    isEligible: () => 'unrecruitable',
    successLines: [],
    failLines: { unrecruitable: [] },
    onSuccess: (resources) => resources,
  },
  victoryReward: (resources, rngState) => ({ resources, rngState }),
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
      initialSpawn: 0,
      sourceCellId: -1,
      restoreMessage: '',
    }),
  },
}
