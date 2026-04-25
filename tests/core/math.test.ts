import { describe, expect, it } from 'vitest'
import { dirLabel, manhattan, torusDelta, wrapIndex } from '../../src/core/math'

describe('math', () => {
  it('wrapIndex', () => {
    expect(wrapIndex(-1, 10)).toBe(9)
    expect(wrapIndex(10, 10)).toBe(0)
  })

  it('torusDelta', () => {
    expect(torusDelta(0, 5, 10)).toBe(5)
    expect(torusDelta(5, 0, 10)).toBe(5)
    expect(torusDelta(0, 9, 10)).toBe(-1)
  })

  it('manhattan', () => {
    expect(manhattan(3, -2)).toBe(5)
  })

  it('dirLabel', () => {
    expect(dirLabel(2, -3)).toBe('NE')
  })
})

