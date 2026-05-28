import { GATE_LOCKED_LINES, GATE_NAME, GATE_OPEN_LINES } from '../../constants'
import { setCellAt } from '../../cells'
import { RNG } from '../../rng'
import { isTerrainCell, placeFeature } from '../../worldgen'
import type { MechanicDef, OnEnterTile, PlaceWorldProvider } from '../types'

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

// Uniformly-random terrain cell. The gate-locksmith min-distance constraint is
// enforced by the locksmith placer, not here.
const placeGate: PlaceWorldProvider = ({ cells, rngState }) => {
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: () => ({ kind: 'gate' }),
  })
  return { rngState: res.rngState }
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
