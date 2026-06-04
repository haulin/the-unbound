import { terrainLoreLinesForKind } from '../../constants'
import {
  GOBLIN_ENCOUNTER_LINES,
  GOBLIN_FLEE_LINES,
  GOBLIN_FOOD_FACTOR,
  GOBLIN_FOOD_NOISE,
  GOBLIN_GOLD_MAX,
  GOBLIN_NOT_RECRUITABLE_LINES,
  GOBLIN_VICTORY_LINES,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../constants'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CombatEncounter, Resources } from '../../types'
import {
  resolveTerrainMove,
  tileEnterFromTerrainMove,
} from '../encounterHelpers'
import type { MechanicDef, MoveEventPolicy, OnEnterTile } from '../types'
import {
  enemyCountOnlyPlateLines,
  rolledEnemySpawn,
  startCombatEncounter,
  type CombatVariantConfig,
} from './combat'

const woodsPolicy: MoveEventPolicy = {
  ambushPercent: WOODS_AMBUSH_PERCENT,
  lostPercent: WOODS_LOST_PERCENT,
  scoutLostHalves: true,
}

// RNG draw order: gold then food. Reordering shifts world rngState across
// a goblin-victory transition and invalidates every fixture that pins it.
function goblinVictoryReward(
  resources: Resources,
  rngState: number,
  enc: CombatEncounter,
): { resources: Resources; rngState: number } {
  const r = RNG.createStreamRandom(rngState)
  const gold = r.intExclusive(GOBLIN_GOLD_MAX + 1)
  const foodBase = Math.round(GOBLIN_FOOD_FACTOR * enc.initialSpawn)
  const food = Math.max(0, foodBase + r.intInRange(-GOBLIN_FOOD_NOISE, GOBLIN_FOOD_NOISE))
  const next: Resources = {
    ...resources,
    gold: resources.gold + gold,
    food: resources.food + food,
  }
  return { resources: next, rngState: r.rngState }
}

export const goblinCombatVariant: CombatVariantConfig = {
  centerSpriteId: SPRITES.enemies.goblin,
  previewPlateLines: enemyCountOnlyPlateLines,
  encounterLines: GOBLIN_ENCOUNTER_LINES,
  victoryLines: GOBLIN_VICTORY_LINES,
  fleeLines: GOBLIN_FLEE_LINES,
  playerRollBonus: 6,
  enemyRollBonus: 3,
  payment: {
    computeCost: () => 0,
    isEligible: () => 'unrecruitable',
    successLines: [],
    failLines: { unrecruitable: GOBLIN_NOT_RECRUITABLE_LINES },
    onSuccess: (resources) => resources,
  },
  victoryReward: goblinVictoryReward,
}

const onEnterWoods: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'woods') return {}

  const tileRand = RNG.createTileRandom({ world, stepCount, pos })
  const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind('woods'))
  const { tileMessage: restoreMessage, resolved } = resolveTerrainMove({
    moveEventSource: 'woods',
    policy: woodsPolicy,
    world,
    pos,
    stepCount,
    resources,
    hasScout: resources.party.includes('scout'),
    tileMessage,
  })

  return tileEnterFromTerrainMove(resolved, () =>
    startCombatEncounter({
      world,
      pos,
      playerArmySize: resources.armySize,
      spawnEnemy: rolledEnemySpawn(resources.armySize),
      encounterMessage: tileRand.perMoveLine(goblinCombatVariant.encounterLines),
      restoreMessage,
    }),
  )
}

export const woodsMechanic: MechanicDef = {
  id: 'woods',
  kinds: ['woods'],
  moveEventPolicyByKind: { woods: woodsPolicy },
  onEnterTile: onEnterWoods,
  combatVariantByKind: { woods: goblinCombatVariant },
}
