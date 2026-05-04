import {
  ACTION_FARM_BUY_BEAST,
  ACTION_FARM_BUY_FOOD,
  ACTION_FARM_LEAVE,
} from '../../constants'
import { FARM_ENTER_LINES } from '../../lore'
import { SPRITES } from '../../spriteIds'
import { getCellAt } from '../../cells'
import { RNG } from '../../rng'
import type { MechanicDef } from '../types'
import type { TileEnterHandler } from '../types'

const onEnterFarm: TileEnterHandler = ({ cell, world, pos, stepCount }) => {
  if (cell.kind !== 'farm') return { message: '' }

  const farmCell = getCellAt(world, pos)
  if (!farmCell || farmCell.kind !== 'farm') return { message: '' }

  const farmName = farmCell.name || 'A Farm'
  const r = RNG.createTileRandom({ world, stepCount, pos })
  const line = r.stableLine(FARM_ENTER_LINES, { placeId: farmCell.id })
  return { message: `${farmName} Farm\n${line}`, knowsPosition: true }
}

export const farmMechanic: MechanicDef = {
  id: 'farm',
  kinds: ['farm'],
  mapLabel: 'F',
  onEnter: onEnterFarm,
  startEncounter: ({ cellId, restoreMessage }) => ({
    kind: 'farm',
    sourceKind: 'farm',
    sourceCellId: cellId,
    restoreMessage,
  }),
  rightGridEncounterKind: 'farm',
  rightGrid: (_s, row, col) => {
    if (row === 0 && col === 1)
      return { spriteId: SPRITES.buttons.food, action: { type: ACTION_FARM_BUY_FOOD } }
    if (row === 1 && col === 0)
      return { spriteId: SPRITES.buttons.beast, action: { type: ACTION_FARM_BUY_BEAST } }
    if (row === 1 && col === 2)
      return { spriteId: SPRITES.buttons.return, action: { type: ACTION_FARM_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.farmBarn, action: null }
    return { action: null }
  },
}
