import type { MechanicDef } from '../types'
import { ACTION_CAMP_LEAVE, ACTION_CAMP_SEARCH } from '../../constants'
import { SPRITES } from '../../spriteIds'
import { getCellAt } from '../../cells'
import type { TileEnterHandler } from '../types'

const onEnterCamp: TileEnterHandler = ({ cell, world, pos }) => {
  if (cell.kind !== 'camp') return { message: '' }

  const camp = getCellAt(world, pos)
  if (!camp || camp.kind !== 'camp') return { message: '' }

  const name = camp.name || 'A Camp'
  return { message: `${name} Camp` }
}

export const campMechanic: MechanicDef = {
  id: 'camp',
  kinds: ['camp'],
  mapLabel: 'C',
  onEnter: onEnterCamp,
  startEncounter: ({ cellId, restoreMessage }) => ({
    kind: 'camp',
    sourceKind: 'camp',
    sourceCellId: cellId,
    restoreMessage,
  }),
  rightGridEncounterKind: 'camp',
  rightGrid: (_s, row, col) => {
    if (row === 0 && col === 1) return { action: null } // North disabled
    if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.search, action: { type: ACTION_CAMP_SEARCH } }
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_CAMP_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.campfireIcon, action: null }
    return { action: null }
  },
}
