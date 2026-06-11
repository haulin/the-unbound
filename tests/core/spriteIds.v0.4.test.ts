import { describe, expect, it } from 'vitest'
import { SPRITES } from '../../src/core/spriteIds'

describe('SPRITES registry', () => {
  it('exposes the canonical sprite ids for each concept', () => {
    // Sanity-check the post-reshuffle IDs so a typo in spriteIds.ts can't
    // silently drift. Update these when the .tic sheet is intentionally moved.
    expect(SPRITES.actions.return).toBe(98)
    expect(SPRITES.actions.restart).toBe(108)
    expect(SPRITES.inventory.gold).toBe(204)
    expect(SPRITES.inventory.mule).toBe(226)
    expect(SPRITES.inventory.boar).toBe(228)
    expect(SPRITES.inventory.scout).toBe(230)
    expect(SPRITES.inventory.healer).toBe(232)
    expect(SPRITES.poi.crossing).toBe(44)
    expect(SPRITES.flavor.crossingRider).toBe(172)
    expect(SPRITES.ui.mapHereMarker).toBe(322)
    expect(SPRITES.ui.slotHighlight0).toBe(324)
    expect(SPRITES.ui.slotHighlight3).toBe(330)
    expect(SPRITES.flavor.farmBarn).toBe(162)
    expect(SPRITES.flavor.locksmithKiln).toBe(164)
  })

  it('aligns thematically-related sprites into the same column', () => {
    // Column = id mod 16 (TIC-80 sprite sheet is 16 sprites wide).
    // These columns are the whole point of the v0.5 reshuffle — if any of
    // these drift, the sheet has lost its readability.
    const col = (id: number) => id % 16

    // Col 2: water/land/food/pack-beast (the "homestead" column).
    expect(col(SPRITES.poi.lake)).toBe(2)
    expect(col(SPRITES.poi.farm)).toBe(2)
    expect(col(SPRITES.inventory.food)).toBe(2)
    expect(col(SPRITES.inventory.mule)).toBe(2)
    expect(col(SPRITES.inventory.boar)).toBe(4)
    expect(col(SPRITES.inventory.scout)).toBe(6)

    // Col 4: combat & locksmith (the "conflict + key" column).
    expect(col(SPRITES.poi.henge)).toBe(4)
    expect(col(SPRITES.poi.locksmith)).toBe(4)
    expect(col(SPRITES.actions.fight)).toBe(4)
    expect(col(SPRITES.enemies.enemy)).toBe(4)
    expect(col(SPRITES.flavor.locksmithKiln)).toBe(4)
    expect(col(SPRITES.inventory.bronzeKey)).toBe(4)

    // Col 6: cave/wyrm/blood (the "wyrm's lair" column).
    expect(col(SPRITES.terrain.cave)).toBe(6)
    expect(col(SPRITES.enemies.wyrm)).toBe(6)
    expect(col(SPRITES.inventory.bloodVial)).toBe(6)
  })

})
