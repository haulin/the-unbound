import { terrainLoreLinesForKind } from '../../constants'
import {
  BRIGAND_ENCOUNTER_LINES,
  BRIGAND_FLEE_LINES,
  BRIGAND_FOOD_MAX,
  BRIGAND_GOLD_NOISE,
  BRIGAND_RECRUIT_MAX_REMAINING,
  BRIGAND_RECRUIT_NO_FUNDS_LINES,
  BRIGAND_RECRUIT_NOT_WOUNDED_LINES,
  BRIGAND_RECRUIT_SUCCESS_LINES,
  BRIGAND_RECRUIT_TOO_MANY_LINES,
  BRIGAND_VICTORY_LINES,
  FOOD_COST_MOUNTAIN,
  MOUNTAIN_AMBUSH_PERCENT,
  MOUNTAIN_FIND_FOOD_BASE,
  MOUNTAIN_FIND_GOLD_BASE,
  MOUNTAIN_FIND_PERCENT,
  TERRAIN_FIND_AMOUNT_NOISE,
} from '../../constants'
import { MOUNTAIN_FIND_LINES } from '../../lore'
import { RNG } from '../../rng'
import { SPRITES } from '../../spriteIds'
import type { CombatEncounter, Resources } from '../../types'
import {
  resolveTerrainMove,
  tileEnterFromTerrainMove,
  tryQuietFind,
  type QuietFindSpec,
} from '../encounterHelpers'
import type { MechanicDef, MoveEventPolicy, OnEnterTile } from '../types'
import {
  recruitablePreviewPlateLines,
  rolledEnemySpawn,
  startCombatEncounter,
  type CombatVariantConfig,
  type EligibilityKind,
} from './combat'

const mountainPolicy: MoveEventPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 }

export const MOUNTAIN_QUIET_FIND: QuietFindSpec = {
  findPercent: MOUNTAIN_FIND_PERCENT,
  lines: MOUNTAIN_FIND_LINES,
  foodBase: MOUNTAIN_FIND_FOOD_BASE,
  goldBase: MOUNTAIN_FIND_GOLD_BASE,
  amountNoise: TERRAIN_FIND_AMOUNT_NOISE,
  rollSalt: 'mountain.find.roll',
  foodSalt: 'mountain.find.food',
  goldSalt: 'mountain.find.gold',
}

export function brigandRecruitCost(enc: CombatEncounter): number {
  return enc.enemyArmySize * enc.enemyArmySize
}

export function brigandRecruitEligibility(enc: CombatEncounter, resources: Resources): EligibilityKind {
  if (enc.enemyArmySize > BRIGAND_RECRUIT_MAX_REMAINING) return 'tooMany'
  if (enc.enemyArmySize >= enc.initialSpawn) return 'notWounded'
  if (resources.gold < brigandRecruitCost(enc)) return 'noFunds'
  return 'ok'
}

export function brigandRecruitLootScale(enc: CombatEncounter): number {
  if (enc.initialSpawn <= 0) return 0
  return (enc.initialSpawn - enc.enemyArmySize) / enc.initialSpawn
}

function brigandVictoryReward(
  resources: Resources,
  rngState: number,
  enc: CombatEncounter,
): { resources: Resources; rngState: number } {
  const r = RNG.createStreamRandom(rngState)
  const baseGold = Math.max(0, enc.initialSpawn + r.intInRange(-BRIGAND_GOLD_NOISE, BRIGAND_GOLD_NOISE))
  const foodBonus = r.intExclusive(BRIGAND_FOOD_MAX + 1)
  const next: Resources = {
    ...resources,
    gold: resources.gold + baseGold,
    food: resources.food + foodBonus,
  }
  return { resources: next, rngState: r.rngState }
}

export const brigandCombatVariant: CombatVariantConfig = {
  centerSpriteId: SPRITES.enemies.enemy,
  previewPlateLines: recruitablePreviewPlateLines,
  encounterLines: BRIGAND_ENCOUNTER_LINES,
  victoryLines: BRIGAND_VICTORY_LINES,
  fleeLines: BRIGAND_FLEE_LINES,
  playerRollBonus: 5,
  enemyRollBonus: 5,
  payment: {
    computeCost: brigandRecruitCost,
    isEligible: brigandRecruitEligibility,
    successLines: BRIGAND_RECRUIT_SUCCESS_LINES,
    failLines: {
      noFunds: BRIGAND_RECRUIT_NO_FUNDS_LINES,
      notWounded: BRIGAND_RECRUIT_NOT_WOUNDED_LINES,
      tooMany: BRIGAND_RECRUIT_TOO_MANY_LINES,
    },
    onSuccess: (resources, enc) => ({ ...resources, armySize: resources.armySize + enc.enemyArmySize }),
  },
  victoryReward: brigandVictoryReward,
  recruitLootScale: brigandRecruitLootScale,
}

const onEnterMountain: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'mountain') return {}

  const tileRand = RNG.createTileRandom({ world, stepCount, pos })
  const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind('mountain'))
  const { tileMessage: restoreMessage, resolved } = resolveTerrainMove({
    moveEventSource: 'mountain',
    policy: mountainPolicy,
    world,
    pos,
    stepCount,
    resources,
    hasScout: resources.party.includes('scout'),
    tileMessage,
    onQuiet: (ctx) => tryQuietFind(MOUNTAIN_QUIET_FIND, ctx),
  })

  return tileEnterFromTerrainMove(resolved, () =>
    startCombatEncounter({
      world,
      pos,
      playerArmySize: resources.armySize,
      spawnEnemy: rolledEnemySpawn(resources.armySize),
      encounterMessage: tileRand.perMoveLine(brigandCombatVariant.encounterLines),
      restoreMessage,
    }),
  )
}

export const mountainMechanic: MechanicDef = {
  id: 'mountain',
  kinds: ['mountain'],
  enterFoodCostByKind: { mountain: FOOD_COST_MOUNTAIN },
  moveEventPolicyByKind: { mountain: mountainPolicy },
  onEnterTile: onEnterMountain,
  combatVariantByKind: { mountain: brigandCombatVariant },
}
