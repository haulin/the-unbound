import { TERRAIN_MESSAGE_BY_TILE_ID } from '../constants'
import type { TileEnterHandler } from './types'

export const onEnterDefaultTerrain: TileEnterHandler = ({ tileId }) => ({
  message: TERRAIN_MESSAGE_BY_TILE_ID[tileId] || '',
})

