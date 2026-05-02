import { onEnterCamp } from './onEnterCamp'
import { onEnterDefaultTerrain } from './onEnterDefaultTerrain'
import { onEnterFarm } from './onEnterFarm'
import { onEnterGate } from './onEnterGate'
import { onEnterHenge } from './onEnterHenge'
import { onEnterLocksmith } from './onEnterLocksmith'
import { onEnterSignpost } from './onEnterSignpost'
import { onEnterTown } from './onEnterTown'
import type { TileEnterHandler } from './types'
import type { CellKind } from '../types'

const onEnterByKind: Partial<Record<CellKind, TileEnterHandler>> = {
  camp: onEnterCamp,
  farm: onEnterFarm,
  gate: onEnterGate,
  gateOpen: onEnterGate,
  henge: onEnterHenge,
  locksmith: onEnterLocksmith,
  signpost: onEnterSignpost,
  town: onEnterTown,
}

export function getOnEnterHandler(kind: CellKind): TileEnterHandler {
  return onEnterByKind[kind] || onEnterDefaultTerrain
}

