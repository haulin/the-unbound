import { describe, expect, it } from 'vitest'
import { formatNearestPoiSignpostMessage } from '../../src/core/signpost'
import type { Cell, CellGrid } from '../../src/core/types'

describe('signpost', () => {
  function makeCells(width: number, height: number, specials: Array<{ x: number; y: number; cell: Cell }>): CellGrid {
    const cells: CellGrid = []
    for (let y = 0; y < height; y++) {
      const row: Cell[] = []
      for (let x = 0; x < width; x++) row.push({ kind: 'grass' })
      cells.push(row)
    }
    for (const s of specials) {
      cells[s.y]![s.x] = s.cell
    }
    return cells
  }

  it('formats nearest gate', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 3, y: 2, cell: { kind: 'gate' } },
          { x: 6, y: 6, cell: { kind: 'farm', id: 66, name: 'The Oast', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
        ]),
      }
    )
    expect(msg).toBe('The Gate\nSE, 5 leagues away.')
  })

  it('formats locksmith when it is nearest', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 3, y: 2, cell: { kind: 'locksmith' } },
        ]),
      }
    )
    expect(msg).toBe('Locksmith of the Unbound\nSE, 5 leagues away.')
  })

  it('prefers lower id when farms tie for nearest distance', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Both are distance 5; id 23 wins over id 32.
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
          { x: 2, y: 3, cell: { kind: 'farm', id: 32, name: 'The Oast', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })

  it('formats nearest camp when it is nearest', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 3, y: 2, cell: { kind: 'camp', id: 23, name: 'Ember Watch', nextReadyStep: 0, offers: ['CAMP_SEARCH'], companionHireGold: 15 } },
        ]),
      }
    )
    expect(msg).toBe('Ember Watch Camp\nSE, 5 leagues away.')
  })

  it('prefers farm over camp on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Both are distance 5; farm wins over camp.
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
          { x: 2, y: 3, cell: { kind: 'camp', id: 32, name: 'Ember Watch', nextReadyStep: 0, offers: ['CAMP_SEARCH'], companionHireGold: 15 } },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })

  it('prefers camp over henge on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Both are distance 5; camp wins over henge.
          { x: 3, y: 2, cell: { kind: 'camp', id: 23, name: 'Ember Watch', nextReadyStep: 0, offers: ['CAMP_SEARCH'], companionHireGold: 15 } },
          { x: 2, y: 3, cell: { kind: 'henge', id: 32, name: 'Old Insistence', nextReadyStep: 0, currentGroup: null } },
        ]),
      }
    )
    expect(msg).toBe('Ember Watch Camp\nSE, 5 leagues away.')
  })

  it('prefers locksmith over lair on ties', () => {
    // Both are distance 5; locksmith (rank 10) wins over lair (rank 15).
    // Locks `wyrmMechanic.poiSignpost.rank > 10`.
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 3, y: 2, cell: { kind: 'locksmith' } },
          { x: 2, y: 3, cell: { kind: 'lair', id: 32, isBled: false } },
        ]),
      }
    )
    expect(msg).toBe('Locksmith of the Unbound\nSE, 5 leagues away.')
  })

  it('prefers lair over farm on ties', () => {
    // Both are distance 5; lair (rank 15) wins over farm (rank 20).
    // Locks `wyrmMechanic.poiSignpost.rank < 20`.
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 3, y: 2, cell: { kind: 'lair', id: 23, isBled: false } },
          { x: 2, y: 3, cell: { kind: 'farm', id: 32, name: 'Greyfield', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
        ]),
      }
    )
    expect(msg).toBe('Cave of the Long Wind\nSE, 5 leagues away.')
  })

  it('prefers farm over town on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Both are distance 5; farm wins over town.
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
          {
            x: 2,
            y: 3,
            cell: {
              kind: 'town',
              id: 32,
              name: 'Stonebridge',
              offers: ['buyFood', 'buyTroops', 'hireScout'],
              prices: { foodGold: 3, troopsGold: 5, companionHireGold: 12, rumorGold: 3 },
              bundles: { food: 3, troops: 2 },
            },
          },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })

  it('formats nearest town when it is nearest', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          {
            x: 3,
            y: 2,
            cell: {
              kind: 'town',
              id: 23,
              name: 'Stonebridge',
              offers: ['buyFood', 'buyTroops', 'hireScout'],
              prices: { foodGold: 3, troopsGold: 5, companionHireGold: 12, rumorGold: 3 },
              bundles: { food: 3, troops: 2 },
            },
          },
        ]),
      }
    )
    expect(msg).toBe('Stonebridge Town\nSE, 5 leagues away.')
  })

  it('prefers gate over locksmith/farm/camp/henge on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // All are distance 5; gate wins over locksmith, farm and camp.
          { x: 3, y: 2, cell: { kind: 'gate' } },
          { x: 4, y: 1, cell: { kind: 'locksmith' } },
          { x: 2, y: 3, cell: { kind: 'farm', id: 32, name: 'Greyfield', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
          { x: 1, y: 4, cell: { kind: 'camp', id: 41, name: 'Ember Watch', nextReadyStep: 0, offers: ['CAMP_SEARCH'], companionHireGold: 15 } },
          { x: 5, y: 0, cell: { kind: 'henge', id: 5, name: 'The Mending', nextReadyStep: 0, currentGroup: null } },
        ]),
      }
    )
    expect(msg).toBe('The Gate\nSE, 5 leagues away.')
  })

  it('cells without a poiSignpost contribution are not candidates', () => {
    // fishingLake, signpost, rainbowEnd, and bare terrain are NOT signpost targets
    // because none of those mechanics register a `poiSignpost` contribution. A grid
    // containing only those should yield an empty signpost message.
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 3, y: 2, cell: { kind: 'fishingLake', id: 23, nextReadyStep: 0 } },
          { x: 4, y: 1, cell: { kind: 'signpost' } },
          { x: 1, y: 4, cell: { kind: 'rainbowEnd', id: 41, hasPaidOut: false } },
        ]),
      },
    )
    expect(msg).toBe('')
  })

  it('skips too-close targets (D<=2) when a farther target exists', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Too close (E, 1).
          { x: 1, y: 0, cell: { kind: 'gate' } },
          // Farther (SE, 5).
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'], companionHireGold: 10 } },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })
})
