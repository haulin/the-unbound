import { describe, expect, it } from 'vitest'
import {
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../src/core/constants'
import { rollMoveEvent } from '../../src/core/mechanics/moveEvents'
import type { MoveEventPolicy, MoveEventSource } from '../../src/core/mechanics/types'
import { RNG } from '../../src/core/rng'

// Slice 3 / T4: rollMoveEvent is now a pure helper. Tests construct policies inline
// matching the live policies set on terrainHazardsMechanic / hengeMechanic. Henge-cooldown
// tests have moved up to the caller (reducer's transitional guard until T13b lands).

const woodsPolicy: MoveEventPolicy = {
  ambushPercent: WOODS_AMBUSH_PERCENT,
  lostPercent: WOODS_LOST_PERCENT,
  scoutLostHalves: true,
}
const swampPolicy: MoveEventPolicy = {
  ambushPercent: 0,
  lostPercent: SWAMP_LOST_PERCENT,
  scoutLostHalves: true,
}
const mountainPolicy: MoveEventPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 }
const hengePolicy: MoveEventPolicy = { ambushPercent: 100, lostPercent: 0 }

function call(args: { seed: number; stepCount: number; cellId: number; source: MoveEventSource; policy: MoveEventPolicy; hasScout?: boolean }) {
  return rollMoveEvent({
    policy: args.policy,
    hasScout: !!args.hasScout,
    source: args.source,
    rngKeys: { seed: args.seed, stepCount: args.stepCount, cellId: args.cellId },
  })
}

function percentile(seed: number, stepCount: number, cellId: number) {
  return RNG.keyedIntExclusive({ seed, stepCount, cellId }, 100)
}

describe('rollMoveEvent', () => {
  it('zero-policy yields no event (covers grass/road analog: no policy means no call)', () => {
    expect(call({ seed: 1, stepCount: 1, cellId: 1, source: 'woods', policy: { ambushPercent: 0, lostPercent: 0 } })).toBe(null)
  })

  it('henge with ready policy yields fight (cooldown is now caller-side)', () => {
    expect(call({ seed: 1, stepCount: 1, cellId: 1, source: 'henge', policy: hengePolicy })).toEqual({
      kind: 'fight',
      source: 'henge',
    })
  })

  it('woods maps percentile to fight / lost / null in monotonic ranges', () => {
    let fightSeed = -1, lostSeed = -1, nullSeed = -1
    for (let seed = 1; seed < 1000; seed++) {
      const p = percentile(seed, 1, 1)
      if (fightSeed < 0 && p < WOODS_AMBUSH_PERCENT) fightSeed = seed
      if (lostSeed < 0 && p >= WOODS_AMBUSH_PERCENT && p < WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT) lostSeed = seed
      if (nullSeed < 0 && p >= WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT) nullSeed = seed
      if (fightSeed > 0 && lostSeed > 0 && nullSeed > 0) break
    }
    expect(call({ seed: fightSeed, stepCount: 1, cellId: 1, source: 'woods', policy: woodsPolicy })).toEqual({
      kind: 'fight',
      source: 'woods',
    })
    expect(call({ seed: lostSeed, stepCount: 1, cellId: 1, source: 'woods', policy: woodsPolicy })).toEqual({
      kind: 'lost',
      source: 'woods',
    })
    expect(call({ seed: nullSeed, stepCount: 1, cellId: 1, source: 'woods', policy: woodsPolicy })).toBe(null)
  })

  it('mountain only yields fight; never lost', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const out = call({ seed, stepCount: 1, cellId: 1, source: 'mountain', policy: mountainPolicy })
      if (out) expect(out).toEqual({ kind: 'fight', source: 'mountain' })
    }
  })

  it('swamp only yields lost; never fight', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const out = call({ seed, stepCount: 1, cellId: 1, source: 'swamp', policy: swampPolicy })
      if (out) expect(out).toEqual({ kind: 'lost', source: 'swamp' })
    }
  })

  it('sum-guard: woods ambush + lost <= 100; mountain ambush <= 100; swamp lost <= 100', () => {
    expect(WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT).toBeLessThanOrEqual(100)
    expect(MOUNTAIN_AMBUSH_PERCENT).toBeLessThanOrEqual(100)
    expect(SWAMP_LOST_PERCENT).toBeLessThanOrEqual(100)
  })
})
