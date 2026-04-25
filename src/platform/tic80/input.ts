import { ACTION_MOVE, ACTION_RESTART, ACTION_SHOW_GOAL, ACTION_TOGGLE_MINIMAP } from '../../core/constants'
import type { Action, State } from '../../core/types'
import { hitTestGridCell } from './layout'

export function sampleMouse() {
  const m = mouse()
  return { mouseX: m[0], mouseY: m[1], mouseLeftDown: !!m[2] }
}

export function actionForClick(_state: State, mouseX: number, mouseY: number): Action | null {
  const cell = hitTestGridCell(mouseX, mouseY)
  if (!cell) return null

  const { row, col } = cell
  const isDisabledCorner = row === 0 && col === 2
  if (isDisabledCorner) return null

  if (row === 0 && col === 0) return { type: ACTION_SHOW_GOAL }
  if (row === 2 && col === 0) return { type: ACTION_TOGGLE_MINIMAP }
  if (row === 2 && col === 2) return { type: ACTION_RESTART }

  if (row === 0 && col === 1) return { type: ACTION_MOVE, dx: 0, dy: -1 }
  if (row === 1 && col === 0) return { type: ACTION_MOVE, dx: -1, dy: 0 }
  if (row === 1 && col === 2) return { type: ACTION_MOVE, dx: 1, dy: 0 }
  if (row === 2 && col === 1) return { type: ACTION_MOVE, dx: 0, dy: 1 }

  return null
}

