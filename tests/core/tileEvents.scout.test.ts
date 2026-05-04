import { describe, expect, it } from 'vitest'
import { SWAMP_LOST_PERCENT, WOODS_AMBUSH_PERCENT, WOODS_LOST_PERCENT } from '../../src/core/constants'
import { RNG } from '../../src/core/rng'
import { rollMoveEvent } from '../../src/core/mechanics/moveEvents'

function findSeedForPercentileInRange(args: { stepCount: number; cellId: number; minInclusive: number; maxExclusive: number }): number {
  for (let seed = 1; seed < 200000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount: args.stepCount, cellId: args.cellId }, 100)
    if (p >= args.minInclusive && p < args.maxExclusive) return seed
  }
  throw new Error('seed not found')
}

describe('rollMoveEvent (scout)', () => {
  it('with scout, woods/swamp lost chance is halved (floor)', () => {
    // Swamp: lostPct ∈ [half..full) becomes null when halved.
    const swampHalf = Math.floor(SWAMP_LOST_PERCENT / 2)
    const swampSeed = findSeedForPercentileInRange({ stepCount: 5, cellId: 9, minInclusive: swampHalf, maxExclusive: SWAMP_LOST_PERCENT })
    expect(rollMoveEvent({ seed: swampSeed, stepCount: 5, cellId: 9, cell: { kind: 'swamp' }, hasScout: false })).toEqual({
      kind: 'lost',
      source: 'swamp',
    })
    expect(rollMoveEvent({ seed: swampSeed, stepCount: 5, cellId: 9, cell: { kind: 'swamp' }, hasScout: true })).toBe(null)

    // Woods: choose p in the "lost tail" that disappears when halved.
    const woodsLostHalf = Math.floor(WOODS_LOST_PERCENT / 2)
    const woodsMin = WOODS_AMBUSH_PERCENT + woodsLostHalf
    const woodsMax = WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT
    const woodsSeed = findSeedForPercentileInRange({ stepCount: 7, cellId: 11, minInclusive: woodsMin, maxExclusive: woodsMax })
    expect(rollMoveEvent({ seed: woodsSeed, stepCount: 7, cellId: 11, cell: { kind: 'woods' }, hasScout: false })).toEqual({
      kind: 'lost',
      source: 'woods',
    })
    expect(rollMoveEvent({ seed: woodsSeed, stepCount: 7, cellId: 11, cell: { kind: 'woods' }, hasScout: true })).toBe(null)
  })
})

