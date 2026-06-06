import { ENABLE_ANIMATIONS } from '../../constants'
import { cellIdForPos, getCellAt, posForCellId } from '../../cells'
import { applyFoodCapOnGain } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Action, CombatEncounter, Encounter, Resources, State, Ui, Vec2, World } from '../../types'
import { enqueueGridTransition } from '../../uiAnim'
import {
  applyDeltas,
  badgedGridButton,
  combatLoreMessage,
  encounterStableLine,
  makeRightGrid,
  pushResourceDeltas,
  resourceDeltasFromDiff,
  type CellBadge,
} from '../encounterHelpers'
import type { ResourceDelta } from '../encounterHelpers'
import type { MechanicDef, ReduceEncounterAction, TileEnterResult } from '../types'
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

// U[max(2, p-2) .. 2*p]; max(min,…) guards playerArmy ∈ {0,1} where 2*p < min.
export function spawnEnemyArmy(opts: { rngState: number; playerArmy: number }): { rngState: number; enemyArmy: number } {
  const playerArmy = Math.max(0, Math.trunc(opts.playerArmy))
  const min = Math.max(2, playerArmy - 2)
  const max = Math.max(min, 2 * playerArmy)
  const r = RNG.createStreamRandom(opts.rngState)
  return { rngState: r.rngState, enemyArmy: r.intInRange(min, max) }
}

// One round: U[0..size+bonus); ties go to the player. Player hit → enemy halves (floor).
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

/** P(w >= b) for one fight round, rounded; w ~ U[0..playerRollMax), b ~ U[0..enemyRollMax), ties → player. */
export function fightHitChancePercent(opts: {
  playerArmy: number
  enemyArmy: number
  playerRollBonus: number
  enemyRollBonus: number
}): number {
  const wMax = Math.max(1, Math.trunc(opts.playerArmy) + opts.playerRollBonus)
  const bMax = Math.max(1, Math.trunc(opts.enemyArmy) + opts.enemyRollBonus)
  let wins = 0
  for (let b = 0; b < wMax && b < bMax; b++) wins += wMax - b
  return Math.round((wins / (wMax * bMax)) * 100)
}

export function combatFightHitOddsPercent(state: State): number | null {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat' || enc.enemyArmySize <= 0 || state.resources.armySize <= 0) return null
  const variant = combatVariantForEncounter(state)
  return fightHitChancePercent({
    playerArmy: state.resources.armySize,
    enemyArmy: enc.enemyArmySize,
    playerRollBonus: variant.playerRollBonus,
    enemyRollBonus: variant.enemyRollBonus,
  })
}

// ---- Right-grid + action dispatch -------------------------------------------------

// Preview sentinel uses sourceCellId < 0 so grid-slide can paint combat before a real cell.
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

export type CombatCloseOutcome = 'victory' | 'flee' | 'recruit' | 'paid'

export function applyHealerMend(resources: Resources, enc: CombatEncounter): Resources {
  if (!resources.party.includes('healer')) return resources
  const roundLosses = Math.max(0, enc.armyAtCombatStart - resources.armySize)
  const mend = Math.min(2, roundLosses)
  if (mend <= 0) return resources
  return { ...resources, armySize: resources.armySize + mend }
}

function applyCombatClosed(state: State, outcome: CombatCloseOutcome, encounter: CombatEncounter): State {
  if (isPreviewSentinel(encounter.sourceCellId)) return state
  const cell = getCellAt(state.world, posForCellId(state.world, encounter.sourceCellId))
  const hook = MECHANIC_INDEX.onCombatClosedByKind[cell.kind]
  if (!hook) return state
  return hook(state, outcome, encounter)
}

function finishCombatClose(
  intermediate: State,
  enc: CombatEncounter,
  outcome: CombatCloseOutcome,
  extraDeltas: readonly ResourceDelta[],
): State {
  const beforeMend = intermediate.resources
  const afterMend = applyHealerMend(beforeMend, enc)
  const closed = applyCombatClosed({ ...intermediate, resources: afterMend }, outcome, enc)
  const deltas = [...extraDeltas, ...resourceDeltasFromDiff(beforeMend, afterMend)]
  return applyDeltas(closed, {
    message: closed.ui.message,
    resources: afterMend,
    run: closed.run,
    deltas,
  })
}

function combatFightBadge(state: State): CellBadge | null {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') return null
  if (enc.enemyArmySize <= 0) return null
  return { variant: 'left', text: `${enc.enemyArmySize}` }
}

function combatPayBadge(state: State): CellBadge | null {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') return null
  const variant = combatVariantForEncounter(state)
  if (variant.payment.isEligible(enc, state.resources) !== 'ok') return null
  const cost = variant.payment.computeCost(enc)
  return { variant: 'price', text: `-${cost}` }
}

const { provider: combatRightGrid, illustrationFor: combatIllustration } = makeRightGrid({
  leaveAction: { type: ACTION_RETURN },
  leaveBadge: { variant: 'price', text: '-1' },
  illustrationSpriteId: (s) => combatVariantForEncounter(s).illustrationSpriteId,
  left: badgedGridButton(COMBAT_ACTIONS, ACTION_FIGHT, combatFightBadge),
  top: badgedGridButton(COMBAT_ACTIONS, ACTION_COMBAT_PAY, combatPayBadge),
})

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
    const line = encounterStableLine(prevState, `combat.pay.${eligibility}`, lines)
    return {
      ...prevState,
      encounter: enc,
      ui: { ...prevState.ui, message: combatLoreMessage(prevState, line) || prevState.ui.message },
    }
  }

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
    lootFoodGain = nextResources.food - afterTroops.food
    nextWorld = { ...prevWorld, rngState: reward.rngState }
  }
  const successPick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.pay.success', payment.successLines)
  const baseUi: Ui = { ...prevUi, message: combatLoreMessage(prevState, successPick.line || '') || prevUi.message }
  const intermediate: State = {
    world: nextWorld,
    player: prevState.player,
    run: successPick.nextState.run,
    resources: nextResources,
    encounter: null,
    ui: baseUi,
  }
  const closeOutcome: CombatCloseOutcome = variant.recruitLootScale ? 'recruit' : 'paid'
  const payDeltas: ResourceDelta[] = []
  pushResourceDeltas(payDeltas, 'gold', [-cost, ...(lootGoldGain > 0 ? [lootGoldGain] : [])])
  if (lootFoodGain > 0) pushResourceDeltas(payDeltas, 'food', [lootFoodGain])
  let next = finishCombatClose(intermediate, enc, closeOutcome, payDeltas)
  if (!ENABLE_ANIMATIONS) return next
  return { ...next, ui: enqueueGridTransition(next.ui, { from: 'combat', to: 'overworld' }) }
}

function reduceCombatReturn(prevState: State): State {
  if (!prevState.encounter) return prevState
  if (prevState.encounter.kind !== 'combat') return prevState
  const enc = prevState.encounter
  const prevUi = prevState.ui

  const prevRes = prevState.resources
  const nextArmy = prevRes.armySize - 1
  const armyDepleted = nextArmy <= 0
  const nextResources: Resources = { ...prevRes, armySize: Math.max(0, nextArmy) }
  const fleeVariant = combatVariantForEncounter(prevState)
  const fleePick = armyDepleted
    ? null
    : RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.flee', fleeVariant.fleeLines)
  const nextRun = armyDepleted ? prevState.run : fleePick!.nextState.run
  const nextMessage = armyDepleted
    ? prevUi.message
    : combatLoreMessage(prevState, fleePick!.line || '') || prevUi.message
  const baseUi: Ui = { ...prevUi, message: nextMessage }
  const intermediate: State = {
    world: prevState.world,
    player: prevState.player,
    run: nextRun,
    resources: nextResources,
    encounter: null,
    ui: baseUi,
  }
  const closed = armyDepleted ? intermediate : applyCombatClosed(intermediate, 'flee', enc)
  let next = applyDeltas(closed, {
    message: closed.ui.message,
    resources: nextResources,
    run: closed.run,
    deltas: [{ target: 'army', delta: -1 }],
  })
  if (!ENABLE_ANIMATIONS) return next
  return {
    ...next,
    ui: armyDepleted ? next.ui : enqueueGridTransition(next.ui, { from: 'combat', to: 'overworld' }),
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
  const armyDepleted = nextResources.armySize <= 0
  const victoryPick =
    !armyDepleted && nextEncounter == null
      ? RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.victory', variant.victoryLines)
      : null
  const nextRun = armyDepleted
    ? prevState.run
    : nextEncounter == null
      ? victoryPick!.nextState.run
      : prevState.run
  const nextMessage =
    nextEncounter == null && !armyDepleted
      ? combatLoreMessage(prevState, victoryPick!.line || '') || prevUi.message
      : prevUi.message

  const baseUi: Ui = { message: nextMessage, leftPanel: prevUi.leftPanel, clock: prevUi.clock, anim: prevUi.anim }
  const intermediate: State = {
    world: nextWorld,
    player: prevState.player,
    run: nextRun,
    resources: nextResources,
    encounter: armyDepleted ? null : nextEncounter,
    ui: baseUi,
  }
  const fightDeltas: ResourceDelta[] = []
  pushResourceDeltas(fightDeltas, 'food', foodDeltas)
  pushResourceDeltas(fightDeltas, 'gold', goldDeltas)
  pushResourceDeltas(fightDeltas, 'army', armyDeltas)
  pushResourceDeltas(fightDeltas, 'enemyArmy', enemyDeltas)

  let next: State
  if (!armyDepleted && nextEncounter == null) {
    next = finishCombatClose(intermediate, enc, 'victory', fightDeltas)
  } else {
    next = applyDeltas(intermediate, {
      message: intermediate.ui.message,
      resources: nextResources,
      run: nextRun,
      deltas: fightDeltas,
    })
  }
  next = { ...next, encounter: armyDepleted ? null : nextEncounter }
  if (!ENABLE_ANIMATIONS) return next

  if (!armyDepleted && nextEncounter == null) {
    next = { ...next, ui: enqueueGridTransition(next.ui, { from: 'combat', to: 'overworld' }) }
  }
  return next
}

export type EnemySpawn = (rngState: number) => { rngState: number; enemyArmy: number }

export function rolledEnemySpawn(playerArmy: number): EnemySpawn {
  return (rngState) => spawnEnemyArmy({ rngState, playerArmy })
}

export function fixedEnemySpawn(enemyArmy: number): EnemySpawn {
  const clamped = Math.max(0, Math.trunc(enemyArmy))
  return (rngState) => ({ rngState, enemyArmy: clamped })
}

export function startCombatEncounter(args: {
  world: World
  pos: Vec2
  playerArmySize: number
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
    armyAtCombatStart: Math.max(0, args.playerArmySize),
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

export type EligibilityKind = 'ok' | 'noFunds' | 'notWounded' | 'tooMany' | 'unrecruitable'

export type CombatVariantConfig = {
  illustrationSpriteId: number
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
  recruitLootScale?: (encounter: CombatEncounter) => number
}

const previewPlaceholderVariant: CombatVariantConfig = {
  illustrationSpriteId: SPRITES.enemies.enemy,
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
    illustrationSpriteId: combatIllustration,
    reduceAction: reduceCombatAction,
    deltaAnchorsByTarget: { enemyArmy: { row: 1, col: 0, goodSign: -1 } },
    previewEncounter: (): CombatEncounter => ({
      kind: 'combat',
      enemyArmySize: 0,
      initialSpawn: 0,
      armyAtCombatStart: 0,
      sourceCellId: -1,
      restoreMessage: '',
    }),
  },
}
