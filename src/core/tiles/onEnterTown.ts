import { getCellAt } from '../cells'
import { TOWN_ENTER_LINES } from '../constants'
import { pickDeterministicLine } from './poiUtils'
import type { TileEnterHandler } from './types'

export const onEnterTown: TileEnterHandler = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'town') return { message: '' }

  const town = getCellAt(world, pos)
  if (!town || town.kind !== 'town') return { message: '' }

  const name = town.name || 'A Town'
  const line = pickDeterministicLine(TOWN_ENTER_LINES, world.seed, town.id, stepCount)
  return { message: `${name} Town\n${line}`, knowsPosition: true }
}

