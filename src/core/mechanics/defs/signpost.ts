import { formatNearestPoiSignpostMessage } from '../../signpost'
import type { MechanicDef } from '../types'
import type { TileEnterHandler } from '../types'

const onEnterSignpost: TileEnterHandler = ({ world, pos }) => ({
  message: formatNearestPoiSignpostMessage(pos, world),
  knowsPosition: true,
})

export const signpostMechanic: MechanicDef = {
  id: 'signpost',
  kinds: ['signpost'],
  onEnter: onEnterSignpost,
}
