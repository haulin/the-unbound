import {
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from './constants'
import { pickIntExclusive } from './prng'
import type { CellKind } from './types'

export type TileEventSource = 'woods' | 'mountain' | 'swamp' | 'henge'

export type TileEvent =
  | { kind: 'fight'; source: TileEventSource }
  | { kind: 'lost'; source: 'woods' | 'swamp' }

export function rollTileEvent(args: {
  seed: number
  stepCount: number
  cellId: number
  kind: CellKind
  hengeReady: boolean
  hasScout: boolean
}): TileEvent | null {
  const { seed, stepCount, cellId, kind, hengeReady, hasScout } = args

  if (kind === 'henge') {
    return hengeReady ? { kind: 'fight', source: 'henge' } : null
  }

  let ambushPct = 0
  let lostPct = 0
  if (kind === 'woods') {
    ambushPct = WOODS_AMBUSH_PERCENT
    lostPct = WOODS_LOST_PERCENT
  } else if (kind === 'mountain') {
    ambushPct = MOUNTAIN_AMBUSH_PERCENT
    lostPct = 0
  } else if (kind === 'swamp') {
    ambushPct = 0
    lostPct = SWAMP_LOST_PERCENT
  } else {
    return null
  }

  if (hasScout && (kind === 'woods' || kind === 'swamp')) {
    lostPct = Math.floor(lostPct / 2)
  }

  if (ambushPct + lostPct === 0) return null
  const p = pickIntExclusive({ seed, stepCount, cellId }, 100)
  if (p < ambushPct) return { kind: 'fight', source: kind as TileEventSource }
  if (p < ambushPct + lostPct) return { kind: 'lost', source: kind as 'woods' | 'swamp' }
  return null
}
