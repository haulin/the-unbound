import { describe, expect, it } from 'vitest'
import {
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../src/core/constants'
import { rollMoveEvent } from '../../src/core/mechanics/moveEvents'
import { RNG } from '../../src/core/rng'

function percentile(seed: number, stepCount: number, cellId: number) {
  return RNG.keyedIntExclusive({ seed, stepCount, cellId }, 100)
}

describe('rollMoveEvent', () => {
  it('grass / road yield no event', () => {
    for (const kind of ['grass', 'road'] as const) {
      const out = rollMoveEvent({ seed: 1, stepCount: 1, cellId: 1, cell: { kind }, hasScout: false })
      expect(out).toBe(null)
    }
  })

  it('henge yields fight when ready, null when on cooldown', () => {
    expect(
      rollMoveEvent({
        seed: 1,
        stepCount: 1,
        cellId: 1,
        cell: { kind: 'henge', id: 1, name: 'Henge', nextReadyStep: 0 },
        hasScout: false,
      }),
    ).toEqual({
      kind: 'fight',
      source: 'henge',
    })
    expect(
      rollMoveEvent({
        seed: 1,
        stepCount: 1,
        cellId: 1,
        cell: { kind: 'henge', id: 1, name: 'Henge', nextReadyStep: 2 },
        hasScout: false,
      }),
    ).toBe(null)
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
    expect(rollMoveEvent({ seed: fightSeed, stepCount: 1, cellId: 1, cell: { kind: 'woods' }, hasScout: false })).toEqual({
      kind: 'fight',
      source: 'woods',
    })
    expect(rollMoveEvent({ seed: lostSeed, stepCount: 1, cellId: 1, cell: { kind: 'woods' }, hasScout: false })).toEqual({
      kind: 'lost',
      source: 'woods',
    })
    expect(rollMoveEvent({ seed: nullSeed, stepCount: 1, cellId: 1, cell: { kind: 'woods' }, hasScout: false })).toBe(null)
  })

  it('mountain only yields fight; never lost', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const out = rollMoveEvent({ seed, stepCount: 1, cellId: 1, cell: { kind: 'mountain' }, hasScout: false })
      if (out) expect(out).toEqual({ kind: 'fight', source: 'mountain' })
    }
  })

  it('swamp only yields lost; never fight', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const out = rollMoveEvent({ seed, stepCount: 1, cellId: 1, cell: { kind: 'swamp' }, hasScout: false })
      if (out) expect(out).toEqual({ kind: 'lost', source: 'swamp' })
    }
  })

  it('sum-guard: woods ambush + lost <= 100; mountain ambush <= 100; swamp lost <= 100', () => {
    expect(WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT).toBeLessThanOrEqual(100)
    expect(MOUNTAIN_AMBUSH_PERCENT).toBeLessThanOrEqual(100)
    expect(SWAMP_LOST_PERCENT).toBeLessThanOrEqual(100)
  })
})
