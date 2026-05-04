import {
  FOOD_COST_MOUNTAIN,
  FOOD_COST_SWAMP,
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../constants'
import type { MechanicDef, MoveEventPolicy } from '../types'

const woodsPolicy: MoveEventPolicy = {
  ambushPercent: WOODS_AMBUSH_PERCENT,
  lostPercent: WOODS_LOST_PERCENT,
  scoutLostHalves: true,
}
const swampPolicy: MoveEventPolicy = {
  ambushPercent: 0,
  lostPercent: SWAMP_LOST_PERCENT,
  scoutLostHalves: true,
}
const mountainPolicy: MoveEventPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 }

export const terrainHazardsMechanic: MechanicDef = {
  id: 'terrainHazards',
  kinds: ['woods', 'swamp', 'mountain'],
  enterFoodCostByKind: {
    swamp: FOOD_COST_SWAMP,
    mountain: FOOD_COST_MOUNTAIN,
  },
  moveEventPolicyByKind: {
    woods: woodsPolicy,
    swamp: swampPolicy,
    mountain: mountainPolicy,
  },
}
