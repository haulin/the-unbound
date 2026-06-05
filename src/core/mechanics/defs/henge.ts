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
import { loreMessage, poiTitleFor } from '../encounterHelpers'
import {
  brigandRecruitCost,
  brigandRecruitEligibility,
  brigandRecruitLootScale,
} from './mountain'
import {
  fixedEnemySpawn,
  startCombatEncounter,
  type CombatCloseOutcome,
  type CombatVariantConfig,
  type EnemySpawn,
} from './combat'
import { cellId, isTerrainCell, placeNamedFeatureFromSeed } from '../../worldgen'

function hengeVictoryReward(
  resources: Resources,
  rngState: number,
  enc: CombatEncounter,
): { resources: Resources; rngState: number } {
  const r = RNG.createStreamRandom(rngState)
  const baseGold =
    Math.max(0, enc.initialSpawn + r.intInRange(-HENGE_GOLD_NOISE, HENGE_GOLD_NOISE)) + HENGE_GOLD_BONUS
  const foodBase = Math.round(HENGE_FOOD_FACTOR * enc.initialSpawn)
  const food = Math.max(0, foodBase + r.intInRange(-HENGE_FOOD_NOISE, HENGE_FOOD_NOISE))
  const next: Resources = {
    ...resources,
    gold: resources.gold + baseGold,
    food: resources.food + food,
  }
  return { resources: next, rngState: r.rngState }
}

export const hengeCombatVariant: CombatVariantConfig = {
  illustrationSpriteId: SPRITES.enemies.enemy,
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

// Henge spawn: U[HENGE_BAND_MIN..HENGE_BAND_MAX], independent of player army.
const hengeSpawn: EnemySpawn = (rngState) => {
  const r = RNG.createStreamRandom(rngState)
  const span = HENGE_BAND_MAX - HENGE_BAND_MIN + 1
  const enemyArmy = HENGE_BAND_MIN + r.intExclusive(span)
  return { rngState: r.rngState, enemyArmy }
}

const onHengeCombatClosed = (state: State, outcome: CombatCloseOutcome, encounter: CombatEncounter): State => {
  const pos = posForCellId(state.world, encounter.sourceCellId)
  const cell = getCellAt(state.world, pos)
  if (cell.kind !== 'henge') return state

  if (outcome === 'flee') {
    const next: HengeCell = { ...cell, currentGroup: encounter.enemyArmySize }
    return { ...state, world: setCellAt(state.world, pos, next) }
  }
  const next: HengeCell = {
    ...cell,
    currentGroup: null,
    nextReadyStep: state.run.stepCount + HENGE_COOLDOWN_MOVES,
  }
  return { ...state, world: setCellAt(state.world, pos, next) }
}

const onEnterHenge: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'henge') return {}

  const hengeCell = getCellAt(world, pos)
  if (!hengeCell || hengeCell.kind !== 'henge') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const title = poiTitleFor(hengeCell.name, 'Henge')
  const readyAt = hengeCell.nextReadyStep ?? 0

  if (hengeCell.currentGroup == null && stepCount < readyAt) {
    const line = r.perMoveLine(HENGE_EMPTY_LINES, { cellId: hengeCell.id })
    return { message: loreMessage(title, line) }
  }

  if (hengeCell.currentGroup != null) {
    const tileMessage = loreMessage(title, r.perMoveLine(HENGE_ARRIVAL_LINES, { cellId: hengeCell.id }))
    return startCombatEncounter({
      world,
      pos,
      playerArmySize: resources.armySize,
      spawnEnemy: fixedEnemySpawn(hengeCell.currentGroup),
      encounterMessage: tileMessage,
      restoreMessage: tileMessage,
    })
  }

  const tileMessage = loreMessage(title, r.perMoveLine(HENGE_ARRIVAL_LINES, { cellId: hengeCell.id }))
  const result = startCombatEncounter({
    world,
    pos,
    playerArmySize: resources.armySize,
    spawnEnemy: hengeSpawn,
    encounterMessage: tileMessage,
    restoreMessage: tileMessage,
  })
  const nextHenge: HengeCell = { ...hengeCell, currentGroup: result.encounter.enemyArmySize }
  return { ...result, world: setCellAt(result.world, pos, nextHenge) }
}

const placeHenges: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  placeNamedFeatureFromSeed(cells, seed, 'place.henge', {
    count: HENGE_COUNT,
    namePool: HENGE_NAME_POOL,
    fallbackName: 'A Henge',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name }) => ({ kind: 'henge', id: cellId(x, y), name, nextReadyStep: 0, currentGroup: null }),
  })
  return { rngState }
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
