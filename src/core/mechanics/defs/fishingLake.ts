import { RNG } from '../../rng'
import {
  FISHING_LAKE_COOLDOWN_LINES,
  FISHING_LAKE_COOLDOWN_MOVES,
  FISHING_LAKE_COUNT,
  FISHING_LAKE_READY_LINES,
} from '../../constants'
import { getCellAt, setCellAt } from '../../cells'
import { cellId, isTerrainCell, placeFeatureFromSeed } from '../../worldgen'
import type { FishingLakeCell } from '../../types'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

const onEnterFishingLake: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'fishingLake') return {}

  const lake = getCellAt(world, pos)
  if (!lake || lake.kind !== 'fishingLake') return {}

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
    message: line,
  }
}

const placeFishingLakes: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  placeFeatureFromSeed(cells, seed, 'place.fishingLake', {
    count: FISHING_LAKE_COUNT,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y }) => ({ kind: 'fishingLake', id: cellId(x, y), nextReadyStep: 0 }),
  })
  return { rngState }
}

export const fishingLakeMechanic: MechanicDef = {
  id: 'fishingLake',
  kinds: ['fishingLake'],
  onEnterTile: onEnterFishingLake,
  placeWorld: placeFishingLakes,
}
