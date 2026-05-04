import {
  ACTION_MOVE,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
} from './constants'
import { SPRITES } from './spriteIds'
import type { Action, State, TownOfferKind } from './types'
import { MECHANIC_INDEX } from './mechanics'

const { rightGridByEncounterKind } = MECHANIC_INDEX

export type RightGridTilePreview = { kind: 'relativeToPlayer'; dx: number; dy: number }

export type RightGridCellDef = {
  spriteId?: number
  tilePreview?: RightGridTilePreview
  action?: Action | null
}

export function spriteIdForTownOffer(o: TownOfferKind | undefined): number | null {
  if (!o) return null
  if (o === 'buyFood') return SPRITES.buttons.food
  if (o === 'buyTroops') return SPRITES.buttons.troop
  if (o === 'hireScout') return SPRITES.buttons.scout
  if (o === 'buyRumors') return SPRITES.buttons.rumorTip
  return null
}

export function getRightGridCellDef(s: State, row: number, col: number): RightGridCellDef {
  // Corners: goal/minimap/restart/disabled
  if (row === 0 && col === 0) return { spriteId: SPRITES.buttons.goal, action: { type: ACTION_SHOW_GOAL } }
  if (row === 2 && col === 0) return { spriteId: SPRITES.buttons.minimap, action: { type: ACTION_TOGGLE_MINIMAP } }
  if (row === 2 && col === 2) return { spriteId: SPRITES.buttons.restart, action: { type: ACTION_RESTART } }
  if (row === 0 && col === 2) {
    return { spriteId: SPRITES.buttons.map, action: { type: ACTION_TOGGLE_MAP } }
  }

  const isRunOver = !!(s.run.isGameOver || s.run.hasWon)

  if (s.encounter) {
    const p = rightGridByEncounterKind[s.encounter.kind]
    return p ? p(s, row, col) : { action: null }
  }

  // Overworld: cross previews adjacent tiles; center is a no-op.
  if (row === 0 && col === 1) return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: -1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: -1 } }
  if (row === 1 && col === 0) return { tilePreview: { kind: 'relativeToPlayer', dx: -1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: -1, dy: 0 } }
  if (row === 1 && col === 1) return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null }
  if (row === 1 && col === 2) return { tilePreview: { kind: 'relativeToPlayer', dx: 1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 1, dy: 0 } }
  if (row === 2 && col === 1) return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: 1 } }

  return { action: null }
}

