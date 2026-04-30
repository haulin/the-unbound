import {
  BRONZE_KEY_FOOD_COST,
  LOCKSMITH_NAME,
  LOCKSMITH_NO_FOOD_LINES,
  LOCKSMITH_PURCHASE_LINES,
  LOCKSMITH_VISITED_LINES,
} from '../constants'
import { pickDeterministicLine } from './poiUtils'
import type { TileEnterHandler } from './types'

export const onEnterLocksmith: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'locksmith') return { message: '' }

  const cellId = pos.y * world.width + pos.x

  if (resources.hasBronzeKey) {
    const line = pickDeterministicLine(LOCKSMITH_VISITED_LINES, world.seed, cellId, stepCount)
    return { message: `${LOCKSMITH_NAME}\n${line}` }
  }

  if (resources.food >= BRONZE_KEY_FOOD_COST) {
    const line = pickDeterministicLine(LOCKSMITH_PURCHASE_LINES, world.seed, cellId, stepCount)
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

  const line = pickDeterministicLine(LOCKSMITH_NO_FOOD_LINES, world.seed, cellId, stepCount)
  return { message: `${LOCKSMITH_NAME}\n${line}` }
}

