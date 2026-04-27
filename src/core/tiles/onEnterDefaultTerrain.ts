import { terrainMessageForKind } from '../constants'
import type { TileEnterHandler } from './types'

export const onEnterDefaultTerrain: TileEnterHandler = ({ cell }) => ({
  message: terrainMessageForKind(cell.kind),
})

