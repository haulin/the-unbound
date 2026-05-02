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
          { x: 6, y: 6, cell: { kind: 'farm', id: 66, name: 'The Oast', nextReadyStep: 0 } },
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
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', nextReadyStep: 0 } },
          { x: 2, y: 3, cell: { kind: 'farm', id: 32, name: 'The Oast', nextReadyStep: 0 } },
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
          { x: 3, y: 2, cell: { kind: 'camp', id: 23, name: 'Ember Cross', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('Ember Cross Camp\nSE, 5 leagues away.')
  })

  it('prefers farm over camp on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Both are distance 5; farm wins over camp.
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', nextReadyStep: 0 } },
          { x: 2, y: 3, cell: { kind: 'camp', id: 32, name: 'Ember Cross', nextReadyStep: 0 } },
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
          { x: 3, y: 2, cell: { kind: 'camp', id: 23, name: 'Ember Cross', nextReadyStep: 0 } },
          { x: 2, y: 3, cell: { kind: 'henge', id: 32, name: 'Old Insistence', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('Ember Cross Camp\nSE, 5 leagues away.')
  })

  it('prefers farm over town on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // Both are distance 5; farm wins over town.
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', nextReadyStep: 0 } },
          {
            x: 2,
            y: 3,
            cell: {
              kind: 'town',
              id: 32,
              name: 'Stonebridge',
              offers: ['buyFood', 'buyTroops', 'hireScout'],
              prices: { foodGold: 3, troopsGold: 5, scoutGold: 12, rumorGold: 3 },
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
              prices: { foodGold: 3, troopsGold: 5, scoutGold: 12, rumorGold: 3 },
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
          { x: 2, y: 3, cell: { kind: 'farm', id: 32, name: 'Greyfield', nextReadyStep: 0 } },
          { x: 1, y: 4, cell: { kind: 'camp', id: 41, name: 'Ember Cross', nextReadyStep: 0 } },
          { x: 5, y: 0, cell: { kind: 'henge', id: 5, name: 'The Mending', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('The Gate\nSE, 5 leagues away.')
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
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })
})
