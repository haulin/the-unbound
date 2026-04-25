import { formatNearestPoiSignpostMessage } from '../signpost'
import type { TileEnterHandler } from './types'

export const onEnterSignpost: TileEnterHandler = ({ world, pos }) => ({
  message: formatNearestPoiSignpostMessage(pos, world),
})

