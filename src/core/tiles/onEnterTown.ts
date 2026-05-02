import { getCellAt } from '../cells'
import { TOWN_ENTER_LINES } from '../constants'
import { RNG } from '../rng'
import type { TileEnterHandler } from './types'

export const onEnterTown: TileEnterHandler = ({ cell, world, pos }) => {
  if (cell.kind !== 'town') return { message: '' }

  const town = getCellAt(world, pos)
  if (!town || town.kind !== 'town') return { message: '' }

  const name = town.name || 'A Town'
  const r = RNG.createTileRandom({ world, stepCount: 0, pos })
  const line = r.stableLine(TOWN_ENTER_LINES, { placeId: town.id })
  return { message: `${name} Town\n${line}`, knowsPosition: true }
}

