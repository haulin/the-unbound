import { GATE_LOCKED_LINES, GATE_NAME, GATE_OPEN_LINES } from '../constants'
import { setCellAt } from '../cells'
import { pickDeterministicLine } from './poiUtils'
import type { TileEnterHandler } from './types'

export const onEnterGate: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'gate' && cell.kind !== 'gateOpen') return { message: '' }

  const cellId = pos.y * world.width + pos.x

  if (!resources.hasBronzeKey) {
    const line = pickDeterministicLine(GATE_LOCKED_LINES, world.seed, cellId, stepCount)
    return { message: `${GATE_NAME}\n${line}` }
  }

  const nextWorld = cell.kind === 'gateOpen' ? world : setCellAt(world, pos, { kind: 'gateOpen' })
  const line = pickDeterministicLine(GATE_OPEN_LINES, world.seed, cellId, stepCount)
  return { world: nextWorld, hasWon: true, message: `${GATE_NAME}\n${line}` }
}

