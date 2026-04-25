import { describe, expect, it } from 'vitest'
import { formatNearestPoiSignpostMessage } from '../../src/core/signpost'

describe('signpost', () => {
  it('formats nearest farm', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        castlePosition: { x: 5, y: 5 },
        farms: [
          { position: { x: 3, y: 2 }, name: 'Greyfield' },
          { position: { x: 6, y: 6 }, name: 'The Oast' },
          { position: { x: 7, y: 7 }, name: 'Burnt Acre' },
        ],
      }
    )
    expect(msg).toBe('Greyfield Farm\nSE, 5 leagues away.')
  })

  it('formats castle when it is nearest (tie-break prefers castle)', () => {
    const msg = formatNearestPoiSignpostMessage(
      { x: 0, y: 0 },
      {
        width: 10,
        height: 10,
        castlePosition: { x: 3, y: 2 },
        farms: [{ position: { x: 3, y: 2 }, name: 'Greyfield' }],
      }
    )
    expect(msg).toBe('The Castle\nSE, 5 leagues away.')
  })
})

