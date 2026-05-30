import { ACTION_TOGGLE_MINIMAP } from '../../core/constants'
import { getRightGridCellDef } from '../../core/rightGrid'
import type { Action, State } from '../../core/types'

// Numpad layout: keys 1..9 map to the 3x3 right grid the same way the TIC
// build draws it on screen.
const KEY_TO_CELL: Record<string, { row: number; col: number }> = {
  '7': { row: 0, col: 0 },
  '8': { row: 0, col: 1 },
  '9': { row: 0, col: 2 },
  '4': { row: 1, col: 0 },
  '5': { row: 1, col: 1 },
  '6': { row: 1, col: 2 },
  '1': { row: 2, col: 0 },
  '2': { row: 2, col: 1 },
  '3': { row: 2, col: 2 },
}

export type InputOptions = { blind: boolean }

function isHidden(action: Action, opts: InputOptions): boolean {
  if (!opts.blind) return false
  return action.type === ACTION_TOGGLE_MINIMAP
}

export function actionForKey(state: State, key: string, options: InputOptions = { blind: false }): Action | null {
  const cell = KEY_TO_CELL[key]
  if (!cell) return null
  const def = getRightGridCellDef(state, cell.row, cell.col)
  const action = def.action ?? null
  if (!action) return null
  if (isHidden(action, options)) return null
  return action
}
