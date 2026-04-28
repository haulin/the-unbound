import type { Action, State } from '../../core/types'
import { getRightGridCellDef } from '../../core/rightGrid'
import { hitTestGridCell } from './layout'

export function sampleMouse() {
  const m = mouse()
  return { mouseX: m[0], mouseY: m[1], mouseLeftDown: !!m[2] }
}

export function actionForClick(state: State, mouseX: number, mouseY: number): Action | null {
  const cell = hitTestGridCell(mouseX, mouseY)
  if (!cell) return null

  const { row, col } = cell
  const def = getRightGridCellDef(state, row, col)
  const a = def.action
  return a || null
}

