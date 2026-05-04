import { ACTION_FIGHT, ACTION_RETURN } from '../../constants'
import { SPRITES } from '../../spriteIds'
import type { MechanicDef, RightGridProvider } from '../types'

const combatRightGrid: RightGridProvider = (_s, row, col) => {
  if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.fight, action: { type: ACTION_FIGHT } }
  if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_RETURN } }
  if (row === 1 && col === 1) return { spriteId: SPRITES.stats.enemy, action: null }
  return { action: null }
}

export const combatMechanic: MechanicDef = {
  id: 'combat',
  kinds: [],
  rightGridEncounterKind: 'combat',
  rightGrid: combatRightGrid,
}

