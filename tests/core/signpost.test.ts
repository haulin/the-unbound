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

  it('formats nearest farm', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 5, y: 5, cell: { kind: 'castle' } },
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', nextReadyStep: 0 } },
          { x: 6, y: 6, cell: { kind: 'farm', id: 66, name: 'The Oast', nextReadyStep: 0 } },
          { x: 7, y: 7, cell: { kind: 'farm', id: 77, name: 'Burnt Acre', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })

  it('prefers lower id when farms tie for nearest distance', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          { x: 5, y: 5, cell: { kind: 'castle' } },
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
          { x: 5, y: 5, cell: { kind: 'castle' } },
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
          { x: 5, y: 5, cell: { kind: 'castle' } },
          // Both are distance 5; farm wins over camp.
          { x: 3, y: 2, cell: { kind: 'farm', id: 23, name: 'Greyfield', nextReadyStep: 0 } },
          { x: 2, y: 3, cell: { kind: 'camp', id: 32, name: 'Ember Cross', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })

  it('prefers castle over farm/camp on ties', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        cells: makeCells(10, 10, [
          // All are distance 5; castle wins over farm and camp.
          { x: 3, y: 2, cell: { kind: 'castle' } },
          { x: 2, y: 3, cell: { kind: 'farm', id: 32, name: 'Greyfield', nextReadyStep: 0 } },
          { x: 4, y: 1, cell: { kind: 'camp', id: 14, name: 'Ember Cross', nextReadyStep: 0 } },
        ]),
      }
    )
    expect(msg).toBe('The Castle\nSE, 5 leagues away.')
  })
})
