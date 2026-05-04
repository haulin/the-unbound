import { RNG } from '../../rng'
import {
  FISHING_LAKE_COOLDOWN_LINES,
  FISHING_LAKE_COOLDOWN_MOVES,
  FISHING_LAKE_READY_LINES,
} from '../../constants'
import { getCellAt, setCellAt } from '../../cells'
import type { FishingLakeCell } from '../../types'
import type { MechanicDef, TileEnterHandler } from '../types'

const onEnterFishingLake: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'fishingLake') return { message: '' }

  const lake = getCellAt(world, pos)
  if (!lake || lake.kind !== 'fishingLake') return { message: '' }

  if (stepCount < lake.nextReadyStep) {
    const r = RNG.createTileRandom({ world, stepCount, pos })
    return {
      message: r.perMoveLine(FISHING_LAKE_COOLDOWN_LINES, { cellId: lake.id }),
    }
  }

  const sr = RNG.createStreamRandom(world.rngState)
  const gain = sr.intExclusive(3) + 1

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.perMoveLine(FISHING_LAKE_READY_LINES, { cellId: lake.id })

  const nextLake: FishingLakeCell = { ...lake, nextReadyStep: stepCount + FISHING_LAKE_COOLDOWN_MOVES }
  const nextWorld = setCellAt({ ...world, rngState: sr.rngState }, pos, nextLake)

  return {
    world: nextWorld,
    resources: {
      ...resources,
      food: resources.food + gain,
    },
    foodDeltas: [gain],
    message: line,
  }
}

export const fishingLakeMechanic: MechanicDef = {
  id: 'fishingLake',
  kinds: ['fishingLake'],
  onEnter: onEnterFishingLake,
}
