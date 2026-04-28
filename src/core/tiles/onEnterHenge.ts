import { HENGE_EMPTY_LINES, HENGE_LORE_LINES } from '../constants'
import { getCellAt } from '../cells'
import { pickDeterministicLine } from './poiUtils'
import type { TileEnterHandler } from './types'

export const onEnterHenge: TileEnterHandler = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'henge') return { message: '' }

  const hengeCell = getCellAt(world, pos)
  if (!hengeCell || hengeCell.kind !== 'henge') return { message: '' }

  const name = hengeCell.name || 'A Henge'
  const readyAt = hengeCell.nextReadyStep ?? 0
  const isReady = stepCount >= readyAt

  const line = isReady
    ? pickDeterministicLine(HENGE_LORE_LINES, world.seed, hengeCell.id, stepCount)
    : pickDeterministicLine(HENGE_EMPTY_LINES, world.seed, hengeCell.id, stepCount)

  return { message: `${name} Henge\n${line}` }
}

