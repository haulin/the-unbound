import { describe, expect, it } from 'vitest'
import { randInt, seedToRngState, xorshift32 } from '../../src/core/prng'

describe('prng', () => {
  it('xorshift32', () => {
    expect(xorshift32(1)).toBe(270369)
  })

  it('seedToRngState', () => {
    expect(seedToRngState(1)).toBe(2779096484)
  })

  it('randInt', () => {
    expect(randInt(1, 10).value).toBe(9)
  })

  it('randInt normalizes maxExclusive', () => {
    expect(randInt(1, 0).value).toBe(0)
    expect(randInt(1, -10).value).toBe(0)
    expect(randInt(1, NaN).value).toBe(0)
    expect(randInt(1, 1.9).value).toBe(0)
  })

  it('randInt golden vector (rng progression)', () => {
    let rng = 1
    const maxes = [10, 8, 3, 1, 0, -1, 1.9]
    const out: Array<[number, number]> = []
    for (let i = 0; i < maxes.length; i++) {
      const r = randInt(rng, maxes[i]!)
      rng = r.rngState
      out.push([r.rngState, r.value])
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

