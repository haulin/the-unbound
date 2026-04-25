import { describe, expect, it } from 'vitest'
import { formatSignpostMessage } from '../../src/core/signpost'

describe('signpost', () => {
  it('formatSignpostMessage', () => {
    expect(formatSignpostMessage({ x: 0, y: 0 }, { x: 3, y: 2 }, 10, 10)).toBe(
      'The Castle lies SE, 5 leagues away.'
    )
  })
})

