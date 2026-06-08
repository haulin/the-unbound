import { cellIdForPos, getCellAt, posForCellId } from '../../cells'
import { applyFoodCapOnGain } from '../../foodCarry'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type {
  Action,
  CombatEncounter,
  DomainEvent,
  Resources,
  Run,
  State,
  Vec2,
  World,
} from '../../types'
import {
  badgedGridButton,
  combatLoreMessage,
  encounterStableLine,
  makeRightGrid,
  type CellBadge,
} from '../encounterHelpers'
import type { Change } from '../../reducer'
import type { MechanicDef, ReduceEncounterAction, TileEnterResult } from '../types'
// Lazy circular: `mechanics/index.ts` builds MECHANIC_INDEX from this file's
// `combatMechanic`, so the import binding here is only safe to dereference
// inside function bodies (post-module-graph load), never at module scope.
import { MECHANIC_INDEX } from '../index'

export const ACTION_FIGHT = 'FIGHT' as const
export const ACTION_COMBAT_PAY = 'COMBAT_PAY' as const
export const ACTION_RETURN = 'RETURN' as const

type CombatActionResult = Change | readonly Change[] | null
type CombatActionSpec = { spriteId: number; reduce: (s: State) => CombatActionResult }

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

// Run the registered post-combat hook (wyrm sets `isBled`, henge starts
// cooldown) on a synthetic snapshot — the hook signature wants `state` with
// the encounter still set — and project the result down to the fields the
// close beat actually commits.
function applyCombatCloseHook(
  prev: State,
  args: {
    world: World
    resources: Resources
    run: Run
    encounter: CombatEncounter
    outcome: CombatCloseOutcome
  },
): { world: World; resources: Resources; run: Run } {
  const { world, resources, run, encounter, outcome } = args
  if (isPreviewSentinel(encounter.sourceCellId)) {
    return { world, resources, run }
  }
  const cell = getCellAt(world, posForCellId(world, encounter.sourceCellId))
  const hook = MECHANIC_INDEX.onCombatClosedByKind[cell.kind]
  if (!hook) return { world, resources, run }

  const snapshot: State = { ...prev, world, resources, run, encounter }
  const after = hook(snapshot, outcome, encounter)
  return { world: after.world, resources: after.resources, run: after.run }
}

// One Change that clears the encounter: applies healer-mend, runs the
// post-combat hook, sets the close message, and emits `encounterClosed`.
// `args.resources` is the player's resources at the moment the round resolved
// (pre-mend); the resource diff drives the close-side popups.
function buildCombatCloseBeat(
  prev: State,
  args: {
    world: World
    resources: Resources
    run: Run
    encounter: CombatEncounter
    outcome: CombatCloseOutcome
    message: string
  },
): Change {
  const mended = applyHealerMend(args.resources, args.encounter)
  const after = applyCombatCloseHook(prev, {
    world: args.world,
    resources: mended,
    run: args.run,
    encounter: args.encounter,
    outcome: args.outcome,
  })
  return {
    world: after.world,
    resources: after.resources,
    run: after.run,
    encounter: null,
    message: args.message,
    events: [{ kind: 'encounterClosed', encounterKind: 'combat', outcome: args.outcome }],
  }
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

const combatRightGrid = makeRightGrid({
  leaveAction: { type: ACTION_RETURN },
  leaveBadge: { variant: 'price', text: '-1' },
  left: badgedGridButton(COMBAT_ACTIONS, ACTION_FIGHT, combatFightBadge),
  top: badgedGridButton(COMBAT_ACTIONS, ACTION_COMBAT_PAY, combatPayBadge),
})

const reduceCombatAction: ReduceEncounterAction = (prevState: State, action: Action) => {
  switch (action.type) {
    case ACTION_FIGHT:
    case ACTION_COMBAT_PAY:
    case ACTION_RETURN:
      return COMBAT_ACTIONS[action.type].reduce(prevState)
    default:
      return null
  }
}

function reduceCombatPay(prevState: State): CombatActionResult {
  const enc = prevState.encounter
  if (!enc || enc.kind !== 'combat') return null
  const variant = combatVariantForEncounter(prevState)
  const payment = variant.payment
  const eligibility = payment.isEligible(enc, prevState.resources)

  // Eligibility refusal: just a message change, no resource diff, no close.
  if (eligibility !== 'ok') {
    const lines = payment.failLines[eligibility]
    if (!lines || lines.length === 0) {
      throw new Error(`combat.pay: variant has no failLines.${eligibility}`)
    }
    const line = encounterStableLine(prevState, `combat.pay.${eligibility}`, lines)
    const message = combatLoreMessage(prevState, line) || prevState.ui.message
    return { message }
  }

  const cost = payment.computeCost(enc)
  const prevRes = prevState.resources
  const afterDeduct: Resources = { ...prevRes, gold: prevRes.gold - cost }
  const afterTroops = payment.onSuccess(afterDeduct, enc)

  const successPick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.pay.success', payment.successLines)
  const successMessage = combatLoreMessage(prevState, successPick.line || '') || prevState.ui.message

  // Paid (no recruit loot): single beat — gold cost (and any troop gain from
  // onSuccess) auto-derived from the diff, encounter closes immediately.
  if (!variant.recruitLootScale) {
    return buildCombatCloseBeat(prevState, {
      world: prevState.world,
      resources: afterTroops,
      run: successPick.nextState.run,
      encounter: enc,
      outcome: 'paid',
      message: successMessage,
    })
  }

  // Recruit: two beats split cost-payment from close. Beat 1: cost (and any
  // troop gain) auto-derived. Beat 2: scaled loot diff + close hook +
  // `encounterClosed` transition; loot popups float over the transition.
  // Beat 1's popups are non-blocking, so the implicit `phaseBoundary` has no
  // visible effect — both beats start at the same frame.
  const scale = variant.recruitLootScale(enc)
  const reward = variant.victoryReward(afterTroops, prevState.world.rngState, enc)
  const fullGoldGain = reward.resources.gold - afterTroops.gold
  const fullFoodGain = reward.resources.food - afterTroops.food
  const lootGoldGain = Math.floor(fullGoldGain * scale)
  const lootFoodGain = Math.floor(fullFoodGain * scale)
  const withLoot: Resources = {
    ...afterTroops,
    gold: afterTroops.gold + lootGoldGain,
    food: afterTroops.food + lootFoodGain,
  }
  const cappedLoot = applyFoodCapOnGain(prevRes, withLoot)
  const nextWorld: World = { ...prevState.world, rngState: reward.rngState }

  const beat1: Change = { resources: afterTroops }
  const beat2 = buildCombatCloseBeat(prevState, {
    world: nextWorld,
    resources: cappedLoot,
    run: successPick.nextState.run,
    encounter: enc,
    outcome: 'recruit',
    message: successMessage,
  })
  return [beat1, beat2]
}

function reduceCombatReturn(prevState: State): CombatActionResult {
  const enc = prevState.encounter
  if (!enc || enc.kind !== 'combat') return null

  const prevRes = prevState.resources
  const nextArmy = prevRes.armySize - 1
  const armyDepleted = nextArmy <= 0
  const nextResources: Resources = { ...prevRes, armySize: Math.max(0, nextArmy) }

  // Army-depleted flee skips the close hook and the flee message — `applyArmyZeroGameOver`
  // in the dispatcher will turn this into game-over once it reads armySize <= 0.
  if (armyDepleted) {
    return { resources: nextResources, encounter: null }
  }

  const variant = combatVariantForEncounter(prevState)
  const fleePick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.flee', variant.fleeLines)
  const fleeMessage = combatLoreMessage(prevState, fleePick.line || '') || prevState.ui.message

  return buildCombatCloseBeat(prevState, {
    world: prevState.world,
    resources: nextResources,
    run: fleePick.nextState.run,
    encounter: enc,
    outcome: 'flee',
    message: fleeMessage,
  })
}

function reduceCombatFight(prevState: State): CombatActionResult {
  const enc = prevState.encounter
  if (!enc || enc.kind !== 'combat') return null

  const prevEnemy = enc.enemyArmySize
  const prevRes = prevState.resources
  const variant = combatVariantForEncounter(prevState)
  const round = resolveFightRound({
    rngState: prevState.world.rngState,
    playerArmy: prevRes.armySize,
    enemyArmy: prevEnemy,
    playerRollBonus: variant.playerRollBonus,
    enemyRollBonus: variant.enemyRollBonus,
  })

  const worldAfterRound: World = { ...prevState.world, rngState: round.rngState }

  // Player hit, enemy survives: encounter stays open with reduced enemy size.
  // Single beat — explicit `enemyArmy` event (not auto-derived; not a player
  // resource), no resource diff, no close.
  if (round.outcome === 'playerHit' && round.nextEnemyArmy > 0) {
    const nextEncounter: CombatEncounter = { ...enc, enemyArmySize: round.nextEnemyArmy }
    const events: DomainEvent[] = round.killed
      ? [{ kind: 'resourceChanged', target: 'enemyArmy', delta: round.enemyDelta }]
      : []
    return {
      world: worldAfterRound,
      encounter: nextEncounter,
      events,
    }
  }

  // Enemy hit: player loses one troop. If army survives, encounter stays open;
  // if depleted, encounter clears (game-over flips in the dispatcher).
  if (round.outcome === 'enemyHit') {
    const resAfterLoss: Resources = { ...prevRes, armySize: prevRes.armySize - 1 }
    const armyDepleted = resAfterLoss.armySize <= 0
    return {
      world: worldAfterRound,
      resources: resAfterLoss,
      encounter: armyDepleted ? null : enc,
    }
  }

  // Player hit, enemy dies → victory close.
  // Two beats keep round-result and close structurally distinct. Beat 1:
  // standalone enemy-delta popup. Beat 2: loot diff (auto-derived) +
  // healer-mend + close hook + `encounterClosed` grid transition; loot
  // popups float over the transition. The popup in beat 1 is non-blocking,
  // so in TIC-80 playback both beats start at the same frame — the split
  // shapes the code, not the timing.
  const reward = variant.victoryReward(prevRes, worldAfterRound.rngState, enc)
  const cappedReward = applyFoodCapOnGain(prevRes, reward.resources)
  const worldAfterReward: World = { ...worldAfterRound, rngState: reward.rngState }

  const victoryPick = RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.victory', variant.victoryLines)
  const victoryMessage = combatLoreMessage(prevState, victoryPick.line || '') || prevState.ui.message

  const enemyEvents: DomainEvent[] = round.killed
    ? [{ kind: 'resourceChanged', target: 'enemyArmy', delta: round.enemyDelta }]
    : []
  const beat1: Change = { world: worldAfterRound, events: enemyEvents }
  const beat2 = buildCombatCloseBeat(prevState, {
    world: worldAfterReward,
    resources: cappedReward,
    run: victoryPick.nextState.run,
    encounter: enc,
    outcome: 'victory',
    message: victoryMessage,
  })
  return [beat1, beat2]
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
    illustrationSpriteId: (s) => combatVariantForEncounter(s).illustrationSpriteId,
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
