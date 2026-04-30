import {
  ACTION_FIGHT,
  ACTION_MOVE,
  ACTION_RETURN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOGGLE_MINIMAP,
} from './constants'
import type { Action, State } from './types'

export type RightGridIconKey = 'goal' | 'minimap' | 'restart' | 'fight' | 'return' | 'enemy'

export type RightGridTilePreview = { kind: 'relativeToPlayer'; dx: number; dy: number }

export type RightGridCellDef = {
  iconKey?: RightGridIconKey
  tilePreview?: RightGridTilePreview
  action?: Action | null
}

export function getRightGridCellDef(s: State, row: number, col: number): RightGridCellDef {
  // Corners: goal/minimap/restart/disabled
  if (row === 0 && col === 0) return { iconKey: 'goal', action: { type: ACTION_SHOW_GOAL } }
  if (row === 2 && col === 0) return { iconKey: 'minimap', action: { type: ACTION_TOGGLE_MINIMAP } }
  if (row === 2 && col === 2) return { iconKey: 'restart', action: { type: ACTION_RESTART } }
  if (row === 0 && col === 2) return { action: null }

  const isRunOver = !!(s.run.isGameOver || s.run.hasWon)

  if (s.encounter && s.encounter.kind === 'combat') {
    // Combat remaps the cross; corners remain meta buttons.
    if (row === 1 && col === 0) return { iconKey: 'fight', action: { type: ACTION_FIGHT } }
    if (row === 1 && col === 2) return { iconKey: 'return', action: { type: ACTION_RETURN } }
    if (row === 1 && col === 1) return { iconKey: 'enemy', action: null }
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

