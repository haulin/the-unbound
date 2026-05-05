import { GATE_LOCKED_LINES, GATE_NAME, GATE_OPEN_LINES } from '../../constants'
import { setCellAt } from '../../cells'
import { RNG } from '../../rng'
import type { MechanicDef, OnEnterTile } from '../types'

const onEnterGate: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'gate' && cell.kind !== 'gateOpen') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (!resources.hasBronzeKey) {
    const line = r.perMoveLine(GATE_LOCKED_LINES)
    return { message: `${GATE_NAME}\n${line}` }
  }

  const nextWorld = cell.kind === 'gateOpen' ? world : setCellAt(world, pos, { kind: 'gateOpen' })
  const line = r.perMoveLine(GATE_OPEN_LINES)
  return { world: nextWorld, hasWon: true, message: `${GATE_NAME}\n${line}` }
}

export const gateMechanic: MechanicDef = {
  id: 'gate',
  kinds: ['gate', 'gateOpen'],
  mapLabel: 'G',
  onEnterTile: onEnterGate,
}
