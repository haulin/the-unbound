import { describe, expect, it } from 'vitest'
import { SPRITES } from '../../src/core/spriteIds'

describe('SPRITES v0.4 registry', () => {
  it('exposes agreed button and cosmetic sprite ids', () => {
    expect(SPRITES.buttons.gold).toBe(98)
    expect(SPRITES.buttons.return).toBe(108)
    expect(SPRITES.buttons.beast).toBe(132)
    expect(SPRITES.cosmetics.farmBarn).toBe(162)
    expect(SPRITES.cosmetics.locksmithKiln).toBe(194)
  })
})
