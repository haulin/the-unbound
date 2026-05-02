export const SCREEN_WIDTH = 240
export const SCREEN_HEIGHT = 136

export const PANEL_LEFT_WIDTH = 120
export const PANEL_RIGHT_WIDTH = SCREEN_WIDTH - PANEL_LEFT_WIDTH

export const GRID_COLS = 3
export const GRID_ROWS = 3
export const CELL_SIZE_PX = 32
export const CELL_GAP_PX = 4

export const GRID_WIDTH_PX = GRID_COLS * CELL_SIZE_PX + (GRID_COLS - 1) * CELL_GAP_PX
export const GRID_HEIGHT_PX = GRID_ROWS * CELL_SIZE_PX + (GRID_ROWS - 1) * CELL_GAP_PX

export const GRID_ORIGIN_X = PANEL_LEFT_WIDTH + Math.floor((PANEL_RIGHT_WIDTH - GRID_WIDTH_PX) / 2)
export const RIGHT_PANEL_HEADER_H = 18
export const GRID_ORIGIN_Y = RIGHT_PANEL_HEADER_H + 4

export type GridCell = { row: number; col: number }

export function hitTestGridCell(mouseX: number, mouseY: number): GridCell | null {
  if (mouseX < GRID_ORIGIN_X) return null
  if (mouseX >= GRID_ORIGIN_X + GRID_WIDTH_PX) return null
  if (mouseY < GRID_ORIGIN_Y) return null
  if (mouseY >= GRID_ORIGIN_Y + GRID_HEIGHT_PX) return null

  const relX = mouseX - GRID_ORIGIN_X
  const relY = mouseY - GRID_ORIGIN_Y
  const pitch = CELL_SIZE_PX + CELL_GAP_PX

  const col = Math.floor(relX / pitch)
  const row = Math.floor(relY / pitch)

  const inCellX = relX - col * pitch
  const inCellY = relY - row * pitch

  if (inCellX >= CELL_SIZE_PX) return null
  if (inCellY >= CELL_SIZE_PX) return null

  return { row, col }
}

