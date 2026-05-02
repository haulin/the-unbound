import {
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  ACTION_FIGHT,
  ACTION_MOVE,
  ACTION_RETURN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
} from './constants'
import { SPRITES } from './spriteIds'
import type { Action, State, TownOfferKind } from './types'

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

  if (s.encounter && s.encounter.kind === 'combat') {
    // Combat remaps the cross; corners remain meta buttons.
    if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.fight, action: { type: ACTION_FIGHT } }
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_RETURN } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.stats.enemy, action: null }
    return { action: null }
  }

  if (s.encounter && s.encounter.kind === 'camp') {
    // Camp remaps the cross; corners remain meta buttons.
    // North disabled in v0.3+ (Hire Scout moved to towns).
    if (row === 0 && col === 1) return { action: null }
    if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.search, action: { type: ACTION_CAMP_SEARCH } }
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_CAMP_LEAVE } }
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.campfireIcon, action: null }
    // South explicitly disabled.
    return { action: null }
  }

  if (s.encounter && s.encounter.kind === 'town') {
    const pos = s.player.position
    const cell = s.world.cells[pos.y]![pos.x]!
    if (cell.kind !== 'town') return { action: null }
    const town = cell

    function actionForOffer(o: TownOfferKind): Action {
      if (o === 'buyFood') return { type: ACTION_TOWN_BUY_FOOD }
      if (o === 'buyTroops') return { type: ACTION_TOWN_BUY_TROOPS }
      if (o === 'hireScout') return { type: ACTION_TOWN_HIRE_SCOUT }
      return { type: ACTION_TOWN_BUY_RUMOR }
    }

    const offerAt = (idx: number): RightGridCellDef => {
      const o = town.offers[idx]
      if (!o) return { action: null }
      const spriteId = spriteIdForTownOffer(o)
      if (spriteId == null) return { action: null }
      return { spriteId, action: actionForOffer(o) }
    }

    if (row === 0 && col === 1) return offerAt(0) // North
    if (row === 1 && col === 0) return offerAt(1) // West
    if (row === 2 && col === 1) return offerAt(2) // South
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_TOWN_LEAVE } } // East
    if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.marketStall, action: null } // Center
    return { action: null }
  }

  // Overworld: cross previews adjacent tiles; center is a no-op.
  if (row === 0 && col === 1) return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: -1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: -1 } }
  if (row === 1 && col === 0) return { tilePreview: { kind: 'relativeToPlayer', dx: -1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: -1, dy: 0 } }
  if (row === 1 && col === 1) return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null }
  if (row === 1 && col === 2) return { tilePreview: { kind: 'relativeToPlayer', dx: 1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 1, dy: 0 } }
  if (row === 2 && col === 1) return { tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: 1 } }

  return { action: null }
}

