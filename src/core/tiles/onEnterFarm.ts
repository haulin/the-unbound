import { RNG } from '../rng'
import {
  FARM_COOLDOWN_MOVES,
  FARM_HARVEST_LINES,
  FARM_REVISIT_LINES,
} from '../constants'
import { getCellAt, setCellAt } from '../cells'
import type { TileEnterHandler } from './types'
import type { FarmCell } from '../types'

export const onEnterFarm: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'farm') return { message: '' }

  const farmCell = getCellAt(world, pos)
  if (!farmCell || farmCell.kind !== 'farm') return { message: '' }

  const farmName = farmCell.name || 'A Farm'
  const readyAt = farmCell.nextReadyStep ?? 0
  if (stepCount < readyAt) {
    const r = RNG.createTileRandom({ world, stepCount, pos })
    return {
      message: `${farmName} Farm\n${r.perMoveLine(FARM_REVISIT_LINES, { cellId: farmCell.id })}`,
      knowsPosition: true,
    }
  }

  const sr = RNG.createStreamRandom(world.rngState)
  const gain = sr.intExclusive(8) + 3

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const harvestLine = r.stableLine(FARM_HARVEST_LINES, { placeId: farmCell.id })

  const nextFarmCell: FarmCell = { ...farmCell, nextReadyStep: stepCount + FARM_COOLDOWN_MOVES }
  const nextWorld = setCellAt({ ...world, rngState: sr.rngState }, pos, nextFarmCell)

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

