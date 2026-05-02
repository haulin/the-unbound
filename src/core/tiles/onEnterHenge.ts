import { HENGE_EMPTY_LINES, HENGE_LORE_LINES } from '../constants'
import { getCellAt } from '../cells'
import { RNG } from '../rng'
import type { TileEnterHandler } from './types'

export const onEnterHenge: TileEnterHandler = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'henge') return { message: '' }

  const hengeCell = getCellAt(world, pos)
  if (!hengeCell || hengeCell.kind !== 'henge') return { message: '' }

  const r = RNG.createTileRandom({ world, stepCount, pos })
  const name = hengeCell.name || 'A Henge'
  const readyAt = hengeCell.nextReadyStep ?? 0
  const isReady = stepCount >= readyAt

  const line = isReady
    ? r.perMoveLine(HENGE_LORE_LINES, { cellId: hengeCell.id })
    : r.perMoveLine(HENGE_EMPTY_LINES, { cellId: hengeCell.id })

  return { message: `${name} Henge\n${line}` }
}

