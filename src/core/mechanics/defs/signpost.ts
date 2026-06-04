import { SIGNPOST_COUNT } from '../../constants'
import { formatNearestPoiSignpostMessage } from '../../signpost'
import { isTerrainCell, placeFeatureFromSeed } from '../../worldgen'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

const onEnterSignpost: OnEnterTile = ({ world, pos }) => ({
  message: formatNearestPoiSignpostMessage(pos, world),
  knowsPosition: true,
})

const placeSignposts: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  placeFeatureFromSeed(cells, seed, 'place.signpost', {
    count: SIGNPOST_COUNT,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: () => ({ kind: 'signpost' }),
  })
  return { rngState }
}

export const signpostMechanic: MechanicDef = {
  id: 'signpost',
  kinds: ['signpost'],
  onEnterTile: onEnterSignpost,
  placeWorld: placeSignposts,
}
