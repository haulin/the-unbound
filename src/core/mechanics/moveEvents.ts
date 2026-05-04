import type { Cell } from '../types'
import { RNG } from '../rng'
import { MECHANIC_INDEX } from './index'
import type { MoveEvent, MoveEventSource } from './types'

const { moveEventPolicyByKind } = MECHANIC_INDEX

export function rollMoveEvent(args: {
  seed: number
  stepCount: number
  cellId: number
  cell: Cell
  hasScout: boolean
}): MoveEvent | null {
  const { seed, stepCount, cellId, cell, hasScout } = args
  const kind = cell.kind

  if (kind === 'henge') {
    const readyAt = cell.nextReadyStep ?? 0
    if (stepCount < readyAt) return null
  }

  const policy = moveEventPolicyByKind[kind]
  if (!policy) return null

  const ambushPercent = policy.ambushPercent
  let lostPercent = policy.lostPercent
  if (hasScout && policy.scoutLostHalves) {
    lostPercent = Math.floor(lostPercent / 2)
  }

  if (ambushPercent + lostPercent === 0) return null

  const percentile = RNG.keyedIntExclusive({ seed, stepCount, cellId }, 100)
  const hazardSource: MoveEventSource | null =
    kind === 'woods' || kind === 'swamp' || kind === 'mountain' || kind === 'henge' ? kind : null
  if (!hazardSource) return null

  if (percentile < ambushPercent) {
    return { kind: 'fight', source: hazardSource }
  }
  if (percentile < ambushPercent + lostPercent) {
    if (hazardSource === 'mountain' || hazardSource === 'henge') return null
    return { kind: 'lost', source: hazardSource }
  }
  return null
}
