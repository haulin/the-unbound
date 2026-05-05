import { RNG } from '../rng'
import type { MoveEvent, MoveEventPolicy, MoveEventSource } from './types'

// Pure helper: rolls a move event for a tile entry given the policy and RNG keys.
// Caller supplies `source` (echoed on the result so consumers can branch on origin) and
// the keyed-RNG inputs `{seed, stepCount, cellId}`. No global registry reads, no per-kind
// special cases — those belong to each mechanic's `onEnterTile`. The henge cooldown, for
// example, is enforced inside `henge.onEnterTile` before this is called.
export function rollMoveEvent(args: {
  policy: MoveEventPolicy
  hasScout: boolean
  source: MoveEventSource
  rngKeys: { seed: number; stepCount: number; cellId: number }
}): MoveEvent | null {
  const { policy, hasScout, source, rngKeys } = args

  const ambushPercent = policy.ambushPercent
  let lostPercent = policy.lostPercent
  if (hasScout && policy.scoutLostHalves) {
    lostPercent = Math.floor(lostPercent / 2)
  }

  if (ambushPercent + lostPercent === 0) return null

  const percentile = RNG.keyedIntExclusive(rngKeys, 100)

  if (percentile < ambushPercent) {
    return { kind: 'fight', source }
  }
  if (percentile < ambushPercent + lostPercent) {
    return { kind: 'lost', source }
  }
  return null
}
