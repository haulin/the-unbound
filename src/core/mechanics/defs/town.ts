import type { MechanicDef } from '../types'
import {
  ACTION_TOWN_LEAVE,
  TOWN_ENTER_LINES,
} from '../../constants'
import { SPRITES } from '../../spriteIds'
import type { TownOfferKind } from '../../types'
import { getCellAt } from '../../cells'
import { RNG } from '../../rng'
import type { TileEnterHandler } from '../types'

const onEnterTown: TileEnterHandler = ({ cell, world, pos }) => {
  if (cell.kind !== 'town') return { message: '' }

  const town = getCellAt(world, pos)
  if (!town || town.kind !== 'town') return { message: '' }

  const name = town.name || 'A Town'
  const r = RNG.createTileRandom({ world, stepCount: 0, pos })
  const line = r.stableLine(TOWN_ENTER_LINES, { placeId: town.id })
  return { message: `${name} Town\n${line}`, knowsPosition: true }
}

export const townMechanic: MechanicDef = {
  id: 'town',
  kinds: ['town'],
  mapLabel: 'T',
  onEnter: onEnterTown,
  startEncounter: ({ cellId, restoreMessage }) => ({
    kind: 'town',
    sourceKind: 'town',
    sourceCellId: cellId,
    restoreMessage,
  }),
  rightGridEncounterKind: 'town',
  rightGrid: (s, row, col) => {
    const pos = s.player.position
    const cell = s.world.cells[pos.y]![pos.x]!
    if (cell.kind !== 'town') return { action: null }
    const town = cell

    function spriteIdForOffer(o: TownOfferKind | undefined): number | null {
      if (!o) return null
      if (o === 'buyFood') return SPRITES.buttons.food
      if (o === 'buyTroops') return SPRITES.buttons.troop
      if (o === 'hireScout') return SPRITES.buttons.scout
      if (o === 'buyRumors') return SPRITES.buttons.rumorTip
      return null
    }

    const offerAt = (idx: number) => {
      const o = town.offers[idx]
      if (!o) return { action: null }
      const spriteId = spriteIdForOffer(o)
      if (spriteId == null) return { action: null }
      return { spriteId, action: { type: o } }
    }

    if (row === 0 && col === 1) return offerAt(0) // North
    if (row === 1 && col === 0) return offerAt(1) // West
    if (row === 2 && col === 1) return offerAt(2) // South
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_TOWN_LEAVE } } // East
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.marketStall, action: null } // Center
    return { action: null }
  },
}
