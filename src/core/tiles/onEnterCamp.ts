import { getCellAt } from '../cells'
import type { TileEnterHandler } from './types'

export const onEnterCamp: TileEnterHandler = ({ cell, world, pos }) => {
  if (cell.kind !== 'camp') return { message: '' }

  const camp = getCellAt(world, pos)
  if (!camp || camp.kind !== 'camp') return { message: '' }

  const name = camp.name || 'A Camp'
  return { message: `${name} Camp` }
}
