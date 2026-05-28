import { SIGNPOST_COUNT } from '../../constants'
import { formatNearestPoiSignpostMessage } from '../../signpost'
import { isTerrainCell, placeFeature } from '../../worldgen'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

const onEnterSignpost: OnEnterTile = ({ world, pos }) => ({
  message: formatNearestPoiSignpostMessage(pos, world),
  knowsPosition: true,
})

const placeSignposts: PlaceWorldProvider = ({ cells, rngState }) => {
  const res = placeFeature(cells, rngState, {
    count: SIGNPOST_COUNT,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: () => ({ kind: 'signpost' }),
  })
  return { rngState: res.rngState }
}

export const signpostMechanic: MechanicDef = {
  id: 'signpost',
  kinds: ['signpost'],
  onEnterTile: onEnterSignpost,
  placeWorld: placeSignposts,
}
