import {
  BRONZE_KEY_FOOD_COST,
  LOCKSMITH_NAME,
  LOCKSMITH_NO_FOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
} from '../constants'
import { RNG } from '../rng'
import type { TileEnterHandler } from './types'

export const onEnterLocksmith: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'locksmith') return { message: '' }

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (resources.hasBronzeKey) {
    const line = r.perMoveLine(LOCKSMITH_VISITED_LINES)
    return { message: `${LOCKSMITH_NAME}\n${line}` }
  }

  if (resources.food >= BRONZE_KEY_FOOD_COST) {
    const line = r.perMoveLine(LOCKSMITH_PURCHASE_LINES)
    return {
      resources: {
        ...resources,
        food: resources.food - BRONZE_KEY_FOOD_COST,
        hasBronzeKey: true,
      },
      foodDeltas: [-BRONZE_KEY_FOOD_COST],
      message: `${LOCKSMITH_NAME}\n${line}`,
    }
  }

  const line = r.perMoveLine(LOCKSMITH_NO_FOOD_LINES)
  return { message: `${LOCKSMITH_NAME}\n${line}` }
}

