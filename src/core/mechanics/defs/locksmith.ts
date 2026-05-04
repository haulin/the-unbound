import {
  ACTION_LOCKSMITH_LEAVE,
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
} from '../../constants'
import {
  LOCKSMITH_ENTER_LINES,
  LOCKSMITH_NAME,
  LOCKSMITH_VISITED_LINES,
} from '../../lore'
import { SPRITES } from '../../spriteIds'
import { RNG } from '../../rng'
import type { MechanicDef } from '../types'
import type { TileEnterHandler } from '../types'

const onEnterLocksmith: TileEnterHandler = ({ cell, world, pos, stepCount, resources }) => {
  if (cell.kind !== 'locksmith') return { message: '' }

  const r = RNG.createTileRandom({ world, stepCount, pos })

  if (resources.hasBronzeKey) {
    const line = r.perMoveLine(LOCKSMITH_VISITED_LINES)
    return { message: `${LOCKSMITH_NAME}\n${line}` }
  }

  const line = r.stableLine(LOCKSMITH_ENTER_LINES)
  return { message: `${LOCKSMITH_NAME}\n${line}` }
}

export const locksmithMechanic: MechanicDef = {
  id: 'locksmith',
  kinds: ['locksmith'],
  mapLabel: 'L',
  onEnter: onEnterLocksmith,
  startEncounter: ({ cellId, restoreMessage }) => ({
    kind: 'locksmith',
    sourceKind: 'locksmith',
    sourceCellId: cellId,
    restoreMessage,
  }),
  rightGridEncounterKind: 'locksmith',
  rightGrid: (_s, row, col) => {
    if (row === 0 && col === 1)
      return { spriteId: SPRITES.buttons.gold, action: { type: ACTION_LOCKSMITH_PAY_GOLD } }
    if (row === 1 && col === 0)
      return { spriteId: SPRITES.buttons.food, action: { type: ACTION_LOCKSMITH_PAY_FOOD } }
    if (row === 1 && col === 2)
      return { spriteId: SPRITES.buttons.return, action: { type: ACTION_LOCKSMITH_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.locksmithKiln, action: null }
    return { action: null }
  },
}
