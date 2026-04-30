import { cellIdForPos } from '../combat'
import { terrainLoreLinesForKind } from '../constants'
import { pickDeterministicLine } from './poiUtils'
import type { TileEnterHandler } from './types'

export const onEnterDefaultTerrain: TileEnterHandler = ({ cell, world, pos, stepCount }) => ({
  message: pickDeterministicLine(terrainLoreLinesForKind(cell.kind), world.seed, cellIdForPos(world, pos), stepCount),
})
