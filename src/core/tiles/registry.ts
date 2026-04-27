import { onEnterCastle } from './onEnterCastle'
import { onEnterCamp } from './onEnterCamp'
import { onEnterDefaultTerrain } from './onEnterDefaultTerrain'
import { onEnterFarm } from './onEnterFarm'
import { onEnterSignpost } from './onEnterSignpost'
import type { TileEnterHandler } from './types'
import type { CellKind } from '../types'

const onEnterByKind: Partial<Record<CellKind, TileEnterHandler>> = {
  camp: onEnterCamp,
  farm: onEnterFarm,
  signpost: onEnterSignpost,
  castle: onEnterCastle,
}

export function getOnEnterHandler(kind: CellKind): TileEnterHandler {
  return onEnterByKind[kind] || onEnterDefaultTerrain
}

