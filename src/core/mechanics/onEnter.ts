import type { TileEnterCtx, TileEnterResult } from './types'
import { terrainLoreLinesForKind } from '../constants'
import { RNG } from '../rng'

// Default tile-enter handler used by reduceMove when a cell kind has no registered
// `onEnterTile` mechanic (plains, water, road, etc.). Always supplies a message.
type DefaultTileEnterHandler = (ctx: TileEnterCtx) => TileEnterResult & { message: string }

export const onEnterDefaultTerrain: DefaultTileEnterHandler = ({ cell, world, pos, stepCount }) => {
  const r = RNG.createTileRandom({ world, stepCount, pos })
  return { message: r.perMoveLine(terrainLoreLinesForKind(cell.kind)) }
}
