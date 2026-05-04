import type { TileEnterHandler } from './types'
import { MECHANIC_INDEX } from './index'
import { terrainLoreLinesForKind } from '../constants'
import { RNG } from '../rng'
import type { CellKind } from '../types'

const { onEnterByKind } = MECHANIC_INDEX

export const onEnterDefaultTerrain: TileEnterHandler = ({ cell, world, pos, stepCount }) => {
  const r = RNG.createTileRandom({ world, stepCount, pos })
  return { message: r.perMoveLine(terrainLoreLinesForKind(cell.kind)) }
}

export function getOnEnterHandler(kind: CellKind): TileEnterHandler {
  return onEnterByKind[kind] || onEnterDefaultTerrain
}

