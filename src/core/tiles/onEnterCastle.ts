import { CASTLE_FOUND_MESSAGE } from '../constants'
import type { TileEnterHandler } from './types'

export const onEnterCastle: TileEnterHandler = () => ({
  message: CASTLE_FOUND_MESSAGE,
  hasFoundCastle: true,
})

