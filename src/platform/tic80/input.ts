import type { Action, State } from '../../core/types'
import { getRightGridCellDef } from '../../core/rightGrid'
import { hitTestGridCell } from './layout'

export type MouseSample = { mouseX: number; mouseY: number; mouseLeftDown: boolean }

export type RenderHints = {
  rightGridHoverCell: { row: number; col: number } | null
}

export function sampleMouse() {
  const m = mouse()
  const out: MouseSample = { mouseX: m[0], mouseY: m[1], mouseLeftDown: !!m[2] }
  return out
}

export function deriveRenderHints(state: State, mouseX: number, mouseY: number): RenderHints {
  const cell = hitTestGridCell(mouseX, mouseY)
  if (!cell) return { rightGridHoverCell: null }

  const def = getRightGridCellDef(state, cell.row, cell.col)
  if (!def.action) return { rightGridHoverCell: null }

  return { rightGridHoverCell: cell }
}

export function actionForClick(state: State, mouseX: number, mouseY: number): Action | null {
  const cell = hitTestGridCell(mouseX, mouseY)
  if (!cell) return null

  const { row, col } = cell
  const def = getRightGridCellDef(state, row, col)
  const a = def.action
  return a || null
}

