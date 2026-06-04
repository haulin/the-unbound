import { describe, expect, it } from 'vitest'
import { RNG } from '../../src/core/rng'

describe('rng', () => {
  it('createStreamRandomFromSeed starts from a deterministic rngState', () => {
    expect(RNG.createStreamRandomFromSeed(1).rngState).toBe(2779096484)
  })

  it('createStreamRandomFromSeed domain forks a stable sub-stream', () => {
    const main = RNG.createStreamRandomFromSeed(1).rngState
    const offers = RNG.createStreamRandomFromSeed(1, 'town.offers').rngState
    expect(offers).not.toBe(main)
    expect(RNG.createStreamRandomFromSeed(1, 'town.offers').rngState).toBe(offers)
  })

  it('keyedIntInRange accepts string salt labels', () => {
    const keys = { seed: 1, stepCount: 2, cellId: 3 }
    const a = RNG.keyedIntInRange({ ...keys, salt: 'food.find' }, -2, 2)
    const b = RNG.keyedIntInRange({ ...keys, salt: 'food.find' }, -2, 2)
    expect(a).toBe(b)
  })

  it('createStreamRandom.intExclusive', () => {
    const r = RNG.createStreamRandom(1)
    expect(r.intExclusive(10)).toBe(9)
  })

  it('intExclusive normalizes maxExclusive', () => {
    const r = RNG.createStreamRandom(1)
    expect(r.intExclusive(0)).toBe(0)
    expect(r.intExclusive(-10)).toBe(0)
    expect(r.intExclusive(NaN)).toBe(0)
    expect(r.intExclusive(1.9)).toBe(0)
  })

  it('intExclusive golden vector (rng progression)', () => {
    const r = RNG.createStreamRandom(1)
    const maxes = [10, 8, 3, 1, 0, -1, 1.9]
    const out: Array<[number, number]> = []
    for (let i = 0; i < maxes.length; i++) {
      const value = r.intExclusive(maxes[i]!)
      out.push([r.rngState, value])
    }
    expect(out).toEqual([
      [270369, 9],
      [67634689, 1],
      [2647435461, 0],
      [307599695, 0],
      [2398689233, 0],
      [745495504, 0],
      [632435482, 0],
    ])
  })
})

