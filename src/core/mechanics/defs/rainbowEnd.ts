import {
  RAINBOW_END_GOLD_PAYOUT,
  RAINBOW_END_MIN_DISTANCE,
  RAINBOW_END_PAYOUT_LINES,
  RAINBOW_END_SPENT_LINES,
} from '../../constants'
import { getCellAt, setCellAt } from '../../cells'
import { RNG } from '../../rng'
import type { RainbowEndCell } from '../../types'
import { cellId, isTerrainCell, placeFeature } from '../../worldgen'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

const onEnterRainbowEnd: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'rainbowEnd') return {}

  const rainbowEndCell = getCellAt(world, pos)
  if (!rainbowEndCell || rainbowEndCell.kind !== 'rainbowEnd') return {}

  const tileRand = RNG.createTileRandom({ world, stepCount, pos })

  if (rainbowEndCell.hasPaidOut) {
    return { message: tileRand.perMoveLine(RAINBOW_END_SPENT_LINES, { cellId: rainbowEndCell.id }) }
  }

  const nextCell: RainbowEndCell = { ...rainbowEndCell, hasPaidOut: true }
  const nextWorld = setCellAt(world, pos, nextCell)

  return {
    world: nextWorld,
    resources: { ...resources, gold: resources.gold + RAINBOW_END_GOLD_PAYOUT },
    message: tileRand.perMoveLine(RAINBOW_END_PAYOUT_LINES, { cellId: rainbowEndCell.id }),
  }
}

// Two rainbow-ends, kept at least `RAINBOW_END_MIN_DISTANCE` apart so they
// don't pair up.
const placeRainbowEnds: PlaceWorldProvider = ({ cells, rngState }) => {
  const first = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y }) => ({ kind: 'rainbowEnd', id: cellId(x, y), hasPaidOut: false }),
  })
  const second = placeFeature(cells, first.rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    awayFrom: { pos: first.placed[0]!, minDistance: RAINBOW_END_MIN_DISTANCE },
    buildCell: ({ x, y }) => ({ kind: 'rainbowEnd', id: cellId(x, y), hasPaidOut: false }),
  })
  return { rngState: second.rngState }
}

export const rainbowEndMechanic: MechanicDef = {
  id: 'rainbowEnd',
  kinds: ['rainbowEnd'],
  mapLabel: 'R',
  onEnterTile: onEnterRainbowEnd,
  placeWorld: placeRainbowEnds,
}
