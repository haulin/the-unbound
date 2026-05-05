import { formatNearestPoiSignpostMessage } from '../../signpost'
import type { MechanicDef, OnEnterTile } from '../types'

const onEnterSignpost: OnEnterTile = ({ world, pos }) => ({
  message: formatNearestPoiSignpostMessage(pos, world),
  knowsPosition: true,
})

export const signpostMechanic: MechanicDef = {
  id: 'signpost',
  kinds: ['signpost'],
  onEnterTile: onEnterSignpost,
}
