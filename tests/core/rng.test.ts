import { describe, expect, it } from 'vitest'
import { RNG } from '../../src/core/rng'

describe('rng', () => {
  it('seedToRngState', () => {
    expect(RNG._seedToRngState(1)).toBe(2779096484)
  })

  it('int', () => {
    expect(RNG._int(1, 10).value).toBe(9)
  })

  it('int normalizes maxExclusive', () => {
    expect(RNG._int(1, 0).value).toBe(0)
    expect(RNG._int(1, -10).value).toBe(0)
    expect(RNG._int(1, NaN).value).toBe(0)
    expect(RNG._int(1, 1.9).value).toBe(0)
  })

  it('int golden vector (rng progression)', () => {
    let rng = 1
    const maxes = [10, 8, 3, 1, 0, -1, 1.9]
    const out: Array<[number, number]> = []
    for (let i = 0; i < maxes.length; i++) {
      const r = RNG._int(rng, maxes[i]!)
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

