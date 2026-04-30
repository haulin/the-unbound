import { randInt } from '../prng'
import {
  FARM_COOLDOWN_MOVES,
  FARM_HARVEST_LINES,
  FARM_REVISIT_LINES,
} from '../constants'
import { getCellAt, setCellAt } from '../cells'
import type { TileEnterHandler } from './types'
import { pickDeterministicLine } from './poiUtils'
import type { FarmCell } from '../types'

export const onEnterFarm: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'farm') return { message: '' }

  const farmCell = getCellAt(world, pos)
  if (!farmCell || farmCell.kind !== 'farm') return { message: '' }

  const farmName = farmCell.name || 'A Farm'
  const readyAt = farmCell.nextReadyStep ?? 0
  if (stepCount < readyAt) {
    return {
      message: `${farmName} Farm\n${pickDeterministicLine(FARM_REVISIT_LINES, world.seed, farmCell.id, stepCount)}`,
      knowsPosition: true,
    }
  }

  let rngState = world.rngState
  const rGain = randInt(rngState, 8)
  rngState = rGain.rngState
  const gain = rGain.value + 3

  const rLine = randInt(rngState, FARM_HARVEST_LINES.length)
  rngState = rLine.rngState
  const harvestLine = FARM_HARVEST_LINES[rLine.value] || FARM_HARVEST_LINES[0] || ''

  const nextFarmCell: FarmCell = { ...farmCell, nextReadyStep: stepCount + FARM_COOLDOWN_MOVES }
  const nextWorld = setCellAt({ ...world, rngState }, pos, nextFarmCell)

  return {
    world: nextWorld,
    resources: {
      ...resources,
      food: resources.food + gain,
    },
    foodDeltas: [gain],
    message: `${farmName} Farm\n${harvestLine}`,
    knowsPosition: true,
  }
}

