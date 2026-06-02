import { terrainLoreLinesForKind } from '../../constants'
import {
  FOOD_COST_SWAMP,
  SWAMP_FIND_FOOD_BASE,
  SWAMP_FIND_GOLD_BASE,
  SWAMP_FIND_PERCENT,
  SWAMP_LOST_PERCENT,
  TERRAIN_FIND_AMOUNT_NOISE,
} from '../../constants'
import { SWAMP_FIND_LINES } from '../../lore'
import {
  resolveTerrainMove,
  tileEnterFromTerrainMove,
  tryQuietFind,
  type QuietFindSpec,
} from '../encounterHelpers'
import { RNG } from '../../rng'
import type { MechanicDef, MoveEventPolicy, OnEnterTile } from '../types'

const swampPolicy: MoveEventPolicy = {
  ambushPercent: 0,
  lostPercent: SWAMP_LOST_PERCENT,
  scoutLostHalves: true,
}

export const SWAMP_QUIET_FIND: QuietFindSpec = {
  findPercent: SWAMP_FIND_PERCENT,
  lines: SWAMP_FIND_LINES,
  foodBase: SWAMP_FIND_FOOD_BASE,
  goldBase: SWAMP_FIND_GOLD_BASE,
  amountNoise: TERRAIN_FIND_AMOUNT_NOISE,
  rollSalt: 'swamp.find.roll',
  foodSalt: 'swamp.find.food',
  goldSalt: 'swamp.find.gold',
}

const onEnterSwamp: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'swamp') return {}

  const tileRand = RNG.createTileRandom({ world, stepCount, pos })
  const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind('swamp'))
  const { resolved } = resolveTerrainMove({
    moveEventSource: 'swamp',
    policy: swampPolicy,
    world,
    pos,
    stepCount,
    resources,
    hasScout: resources.party.includes('scout'),
    tileMessage,
    onQuiet: (ctx) => tryQuietFind(SWAMP_QUIET_FIND, ctx),
  })

  return tileEnterFromTerrainMove(resolved, () => ({}))
}

export const swampMechanic: MechanicDef = {
  id: 'swamp',
  kinds: ['swamp'],
  enterFoodCostByKind: { swamp: FOOD_COST_SWAMP },
  moveEventPolicyByKind: { swamp: swampPolicy },
  onEnterTile: onEnterSwamp,
}
