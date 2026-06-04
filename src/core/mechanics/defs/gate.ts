import { GATE_LOCKED_LINES, GATE_LOCKSMITH_MIN_DISTANCE, GATE_NAME, GATE_OPEN_LINES } from '../../constants'
import { findCellByKind, setCellAt } from '../../cells'
import { RNG } from '../../rng'
import { isTerrainCell, placeFeatureFromSeed } from '../../worldgen'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

const onEnterGate: OnEnterTile = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'gate' && cell.kind !== 'gateOpen') return {}

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (!resources.inventory.includes('bronzeKey')) {
    const line = r.perMoveLine(GATE_LOCKED_LINES)
    return { message: `${GATE_NAME}\n${line}` }
  }

  const nextWorld = cell.kind === 'gateOpen' ? world : setCellAt(world, pos, { kind: 'gateOpen' })
  const line = r.perMoveLine(GATE_OPEN_LINES)
  return { world: nextWorld, hasWon: true, message: `${GATE_NAME}\n${line}` }
}

const placeGate: PlaceWorldProvider = ({ cells, rngState, seed }) => {
  const locksmithPos = findCellByKind(cells, 'locksmith')
  if (!locksmithPos) throw new Error('placeGate: locksmith must be placed before gate')
  placeFeatureFromSeed(cells, seed, 'place.gate', {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    awayFrom: { pos: locksmithPos, minDistance: GATE_LOCKSMITH_MIN_DISTANCE },
    buildCell: () => ({ kind: 'gate' }),
  })
  return { rngState }
}

export const gateMechanic: MechanicDef = {
  id: 'gate',
  kinds: ['gate', 'gateOpen'],
  mapLabel: 'G',
  onEnterTile: onEnterGate,
  poiSignpost: {
    rank: 0,
    name: () => GATE_NAME,
  },
  placeWorld: placeGate,
}
