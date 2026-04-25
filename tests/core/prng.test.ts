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
})

