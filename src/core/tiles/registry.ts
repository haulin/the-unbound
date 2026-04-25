import { TILE_CASTLE, TILE_FARM, TILE_SIGNPOST } from '../constants'
import { onEnterCastle } from './onEnterCastle'
import { onEnterDefaultTerrain } from './onEnterDefaultTerrain'
import { onEnterFarm } from './onEnterFarm'
import { onEnterSignpost } from './onEnterSignpost'
import type { TileEnterHandler } from './types'

const onEnterByTileId: Partial<Record<number, TileEnterHandler>> = {
  [TILE_FARM]: onEnterFarm,
  [TILE_SIGNPOST]: onEnterSignpost,
  [TILE_CASTLE]: onEnterCastle,
}

export function getOnEnterHandler(tileId: number): TileEnterHandler {
  return onEnterByTileId[tileId] || onEnterDefaultTerrain
}

