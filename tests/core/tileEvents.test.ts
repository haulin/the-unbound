import { describe, expect, it } from 'vitest'
import {
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../src/core/constants'
import { rollTileEvent } from '../../src/core/tileEvents'
import { hashSeedStepCell } from '../../src/core/prng'

function percentile(seed: number, stepCount: number, cellId: number) {
  return hashSeedStepCell({ seed, stepCount, cellId }) % 100
}

describe('rollTileEvent', () => {
  it('grass / road / lake / rainbow yield no event', () => {
    for (const kind of ['grass', 'road', 'lake', 'rainbow'] as const) {
      const out = rollTileEvent({ seed: 1, stepCount: 1, cellId: 1, kind, hengeReady: false })
      expect(out).toBe(null)
    }
  })

  it('henge yields fight when ready, null when on cooldown', () => {
    expect(rollTileEvent({ seed: 1, stepCount: 1, cellId: 1, kind: 'henge', hengeReady: true })).toEqual({
      kind: 'fight',
      source: 'henge',
    })
    expect(rollTileEvent({ seed: 1, stepCount: 1, cellId: 1, kind: 'henge', hengeReady: false })).toBe(null)
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
    expect(rollTileEvent({ seed: fightSeed, stepCount: 1, cellId: 1, kind: 'woods', hengeReady: false })).toEqual({
      kind: 'fight',
      source: 'woods',
    })
    expect(rollTileEvent({ seed: lostSeed, stepCount: 1, cellId: 1, kind: 'woods', hengeReady: false })).toEqual({
      kind: 'lost',
      source: 'woods',
    })
    expect(rollTileEvent({ seed: nullSeed, stepCount: 1, cellId: 1, kind: 'woods', hengeReady: false })).toBe(null)
  })

  it('mountain only yields fight; never lost', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const out = rollTileEvent({ seed, stepCount: 1, cellId: 1, kind: 'mountain', hengeReady: false })
      if (out) expect(out).toEqual({ kind: 'fight', source: 'mountain' })
    }
  })

  it('swamp only yields lost; never fight', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const out = rollTileEvent({ seed, stepCount: 1, cellId: 1, kind: 'swamp', hengeReady: false })
      if (out) expect(out).toEqual({ kind: 'lost', source: 'swamp' })
    }
  })

  it('sum-guard: woods ambush + lost <= 100; mountain ambush <= 100; swamp lost <= 100', () => {
    expect(WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT).toBeLessThanOrEqual(100)
    expect(MOUNTAIN_AMBUSH_PERCENT).toBeLessThanOrEqual(100)
    expect(SWAMP_LOST_PERCENT).toBeLessThanOrEqual(100)
  })
})
