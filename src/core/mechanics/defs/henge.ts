import {
  HENGE_BAND_MAX,
  HENGE_BAND_MIN,
  HENGE_COOLDOWN_MOVES,
  HENGE_ARRIVAL_LINES,
  HENGE_COUNT,
  HENGE_EMPTY_LINES,
  HENGE_ENCOUNTER_LINES,
  HENGE_FLEE_LINES,
  HENGE_FOOD_FACTOR,
  HENGE_FOOD_NOISE,
  HENGE_GOLD_BONUS,
  HENGE_GOLD_NOISE,
  HENGE_NAME_POOL,
  HENGE_RECRUIT_NO_FUNDS_LINES,
  HENGE_RECRUIT_NOT_WOUNDED_LINES,
  HENGE_RECRUIT_SUCCESS_LINES,
  HENGE_RECRUIT_TOO_MANY_LINES,
  HENGE_VICTORY_LINES,
} from '../../constants'
import { getCellAt, posForCellId, setCellAt } from '../../cells'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CombatEncounter, HengeCell, Resources, State } from '../../types'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'
import {
  brigandRecruitCost,
  brigandRecruitEligibility,
  brigandRecruitLootScale,
  fixedEnemySpawn,
  recruitablePreviewPlateLines,
  startCombatEncounter,
  type CombatVariantConfig,
  type EnemySpawn,
} from './combat'
import { cellId, isTerrainCell, placeNamedFeature } from '../../worldgen'

// Henge spawn: U[HENGE_BAND_MIN..HENGE_BAND_MAX], independent of player army.
// Henges hold sworn bands at fixed strength — the road's danger doesn't scale
// with your purse. RNG draws exactly one int from the world stream, matching
// the existing single-draw shape of `rolledEnemySpawn` so determinism goldens
// stay stable.
const hengeSpawn: EnemySpawn = (rngState) => {
  const r = RNG.createStreamRandom(rngState)
  const span = HENGE_BAND_MAX - HENGE_BAND_MIN + 1
  // intExclusive advances `r.rngState` as a side effect; compute the enemy
  // count first, then read the advanced state. Reversing the order returns
  // the unadvanced `rngState` and breaks determinism downstream.
  const enemyArmy = HENGE_BAND_MIN + r.intExclusive(span)
  return { rngState: r.rngState, enemyArmy }
}

// Returns the raw uncapped reward — the food cap is owned by the reducer.
// RNG draw order: gold noise, then food noise. Reordering invalidates
// determinism fixtures that pin world.rngState across a victory.
function hengeVictoryReward(
  resources: Resources,
  rngState: number,
  enc: CombatEncounter,
): { resources: Resources; rngState: number } {
  const r = RNG.createStreamRandom(rngState)
  const goldNoise = r.intExclusive(2 * HENGE_GOLD_NOISE + 1) - HENGE_GOLD_NOISE
  const baseGold = Math.max(0, enc.initialSpawn + goldNoise) + HENGE_GOLD_BONUS
  const foodNoise = r.intExclusive(2 * HENGE_FOOD_NOISE + 1) - HENGE_FOOD_NOISE
  const food = Math.max(0, Math.round(HENGE_FOOD_FACTOR * enc.initialSpawn) + foodNoise)
  const next: Resources = {
    ...resources,
    gold: resources.gold + baseGold,
    food: resources.food + food,
  }
  return { resources: next, rngState: r.rngState }
}

export const hengeCombatVariant: CombatVariantConfig = {
  centerSpriteId: SPRITES.enemies.enemy,
  previewPlateLines: recruitablePreviewPlateLines,
  encounterLines: HENGE_ENCOUNTER_LINES,
  victoryLines: HENGE_VICTORY_LINES,
  fleeLines: HENGE_FLEE_LINES,
  playerRollBonus: 5,
  enemyRollBonus: 5,
  payment: {
    computeCost: brigandRecruitCost,
    isEligible: brigandRecruitEligibility,
    successLines: HENGE_RECRUIT_SUCCESS_LINES,
    failLines: {
      noFunds: HENGE_RECRUIT_NO_FUNDS_LINES,
      notWounded: HENGE_RECRUIT_NOT_WOUNDED_LINES,
      tooMany: HENGE_RECRUIT_TOO_MANY_LINES,
    },
    onSuccess: (resources, enc) => ({ ...resources, armySize: resources.armySize + enc.enemyArmySize }),
  },
  victoryReward: hengeVictoryReward,
  recruitLootScale: brigandRecruitLootScale,
}


// Henge state-machine on combat close. Three branches:
//   - flee:    wounded count persists (`currentGroup = enc.enemyArmySize`),
//              no cooldown — the natural cost of re-entry is friction enough.
//   - victory: empty (`currentGroup = null`) + start cooldown.
//   - recruit: same as victory — band absorbed, henge empty.
// Cooldown timing: `nextReadyStep = state.run.stepCount + HENGE_COOLDOWN_MOVES`
// — same formula the previous on-entry path used.
const onHengeCombatClosed = (
  state: State,
  outcome: 'victory' | 'flee' | 'recruit',
  encounter: CombatEncounter,
): State => {
  const pos = posForCellId(state.world, encounter.sourceCellId)
  const cell = getCellAt(state.world, pos)
  if (cell.kind !== 'henge') return state

  if (outcome === 'flee') {
    const next: HengeCell = { ...cell, currentGroup: encounter.enemyArmySize }
    return { ...state, world: setCellAt(state.world, pos, next) }
  }
  // victory or recruit: empty + cooldown.
  const next: HengeCell = {
    ...cell,
    currentGroup: null,
    nextReadyStep: state.run.stepCount + HENGE_COOLDOWN_MOVES,
  }
  return { ...state, world: setCellAt(state.world, pos, next) }
}

// Henge handler: cooldown check, fresh roll vs wounded re-entry, combat-encounter
// open. State transitions per design § Henge persistence.
const onEnterHenge: OnEnterTile = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'henge') return {}

  const hengeCell = getCellAt(world, pos)
  if (!hengeCell || hengeCell.kind !== 'henge') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const name = hengeCell.name || 'A Henge'
  const readyAt = hengeCell.nextReadyStep ?? 0

  // Empty + cooldown: the fight is over for now. Walk through, get a quiet line.
  if (hengeCell.currentGroup == null && stepCount < readyAt) {
    const line = r.perMoveLine(HENGE_EMPTY_LINES, { cellId: hengeCell.id })
    return { message: `${name} Henge\n${line}` }
  }

  // Wounded re-entry: resume at the recorded count. `initialSpawn` matches
  // `enemyArmySize` so recruit eligibility ("wounded" = enemy < initialSpawn)
  // is comparable to the resumed band, never the original full count.
  if (hengeCell.currentGroup != null) {
    const tileMessage = `${name} Henge\n${r.perMoveLine(HENGE_ARRIVAL_LINES, { cellId: hengeCell.id })}`
    return startCombatEncounter({
      world,
      pos,
      spawnEnemy: fixedEnemySpawn(hengeCell.currentGroup),
      encounterMessage: tileMessage,
      restoreMessage: tileMessage,
    })
  }

  // Fresh arrival: persist the rolled band into `currentGroup` immediately
  // so the flee hook has a "home" to update on encounter close.
  const tileMessage = `${name} Henge\n${r.perMoveLine(HENGE_ARRIVAL_LINES, { cellId: hengeCell.id })}`
  const result = startCombatEncounter({
    world,
    pos,
    spawnEnemy: hengeSpawn,
    encounterMessage: tileMessage,
    restoreMessage: tileMessage,
  })
  const nextHenge: HengeCell = { ...hengeCell, currentGroup: result.encounter.enemyArmySize }
  return { ...result, world: setCellAt(result.world, pos, nextHenge) }
}

const placeHenges: PlaceWorldProvider = ({ cells, rngState }) => {
  const next = placeNamedFeature(cells, rngState, {
    count: HENGE_COUNT,
    namePool: HENGE_NAME_POOL,
    fallbackName: 'A Henge',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name }) => ({ kind: 'henge', id: cellId(x, y), name, nextReadyStep: 0, currentGroup: null }),
  })
  return { rngState: next }
}

export const hengeMechanic: MechanicDef = {
  id: 'henge',
  kinds: ['henge'],
  mapLabel: 'H',
  moveEventPolicyByKind: { henge: { ambushPercent: 100, lostPercent: 0 } },
  onEnterTile: onEnterHenge,
  poiSignpost: {
    rank: 50,
    name: (cell) => `${(cell as HengeCell).name || 'A Henge'} Henge`,
  },
  placeWorld: placeHenges,
  combatVariantByKind: { henge: hengeCombatVariant },
  onCombatClosed: onHengeCombatClosed,
}
