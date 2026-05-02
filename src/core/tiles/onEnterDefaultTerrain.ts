import { terrainLoreLinesForKind } from '../constants'
import { RNG } from '../rng'
import type { TileEnterHandler } from './types'

export const onEnterDefaultTerrain: TileEnterHandler = ({ cell, world, pos, stepCount }) => {
  const r = RNG.createTileRandom({ world, stepCount, pos })
  return { message: r.perMoveLine(terrainLoreLinesForKind(cell.kind)) }
}
