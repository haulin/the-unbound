import {
  ACTION_FIGHT,
  ACTION_RETURN,
  COMBAT_FLEE_EXIT_LINES,
  COMBAT_FOOD_BONUS_MAX,
  COMBAT_GOLD_REWARD_MAX,
  COMBAT_GOLD_REWARD_MIN,
  COMBAT_VICTORY_EXIT_LINES,
  ENABLE_ANIMATIONS,
} from '../../constants'
import { cellIdForPos } from '../../cells'
import { resourcesWithClampedFoodIfNeeded } from '../../foodCarry'
import { gameOverMessage } from '../../gameOver'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { Action, CellKind, CombatEncounter, Encounter, Resources, State, Ui, Vec2, World } from '../../types'
import { enqueueDeltas, enqueueGridTransition } from '../../uiAnim'
import type { MechanicDef, ReduceEncounterAction, RightGridProvider, TileEnterResult } from '../types'

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

const combatRightGrid: RightGridProvider = (_s, row, col) => {
  if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.fight, action: { type: ACTION_FIGHT } }
  if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_RETURN } }
  if (row === 1 && col === 1) return { spriteId: SPRITES.stats.enemy, action: null }
  return { action: null }
}

const reduceCombatAction: ReduceEncounterAction = (prevState: State, action: Action): State | null => {
  if (action.type !== ACTION_FIGHT && action.type !== ACTION_RETURN) return null

  if (action.type === ACTION_RETURN) return reduceCombatReturn(prevState)
  return reduceCombatFight(prevState)
}

function reduceCombatReturn(prevState: State): State {
  if (!prevState.encounter) return prevState
  if (prevState.encounter.kind !== 'combat') return prevState
  const prevUi = prevState.ui

  const prevRes = prevState.resources
  const nextArmy = prevRes.armySize - 1
  const isGameOver = nextArmy <= 0
  const nextResources: Resources = { ...prevRes, armySize: Math.max(0, nextArmy) }
  const fleePick = isGameOver ? null : RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.flee', COMBAT_FLEE_EXIT_LINES)
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
  if (round.outcome === 'playerHit' && nextEncounter == null) {
    const goldSpan = COMBAT_GOLD_REWARD_MAX - COMBAT_GOLD_REWARD_MIN + 1
    const sr = RNG.createStreamRandom(nextWorld.rngState)
    const gold = COMBAT_GOLD_REWARD_MIN + sr.intExclusive(goldSpan)
    nextResources = { ...nextResources, gold: nextResources.gold + gold }
    goldDeltas.push(gold)

    const foodBonus = sr.intExclusive(COMBAT_FOOD_BONUS_MAX + 1)
    if (foodBonus) {
      nextResources = { ...nextResources, food: nextResources.food + foodBonus }
    }
    nextWorld = { ...nextWorld, rngState: sr.rngState }
  }
  nextResources = resourcesWithClampedFoodIfNeeded(nextResources)
  const appliedFoodDelta = nextResources.food - prevRes.food
  if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta)
  const isGameOver = nextResources.armySize <= 0
  const victoryPick =
    !isGameOver && nextEncounter == null ? RNG.createRunCopyRandom(prevState).advanceCursor('combat.exit.victory', COMBAT_VICTORY_EXIT_LINES) : null
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

// Open a combat encounter from a source tile (henge, woods, swamp, mountain). Spawns the
// enemy via the world's stream RNG, builds the CombatEncounter, and asks for the standard
// overworld→combat grid transition. Source mechanics own the messaging (encounterMessage
// for the ui.message during combat, restoreMessage for after the fight ends).
export function startCombatEncounter(args: {
  world: World
  pos: Vec2
  playerArmy: number
  sourceKind: CellKind
  encounterMessage: string
  restoreMessage: string
}): TileEnterResult & { world: World; encounter: CombatEncounter } {
  const spawned = spawnEnemyArmy({ rngState: args.world.rngState, playerArmy: args.playerArmy })
  const nextWorld: World = { ...args.world, rngState: spawned.rngState }
  const encounter: CombatEncounter = {
    kind: 'combat',
    enemyArmySize: spawned.enemyArmy,
    sourceKind: args.sourceKind,
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

export const combatMechanic: MechanicDef = {
  id: 'combat',
  kinds: [],
  encounterKind: 'combat',
  rightGrid: combatRightGrid,
  reduceEncounterAction: reduceCombatAction,
}
