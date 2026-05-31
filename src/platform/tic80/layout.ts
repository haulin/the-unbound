export const SCREEN_WIDTH = 240
export const SCREEN_HEIGHT = 136

export const PANEL_LEFT_WIDTH = 128
// Panels abut at x=128 (128 + 112 = 240, full screen, no inter-panel gap).
export const PANEL_RIGHT_WIDTH = 112
export const RIGHT_PANEL_X = PANEL_LEFT_WIDTH

export const GRID_COLS = 3
export const GRID_ROWS = 3
export const CELL_SIZE_PX = 24
export const CELL_GAP_PX = 4

export const GRID_WIDTH_PX = GRID_COLS * CELL_SIZE_PX + (GRID_COLS - 1) * CELL_GAP_PX
export const GRID_HEIGHT_PX = GRID_ROWS * CELL_SIZE_PX + (GRID_ROWS - 1) * CELL_GAP_PX

export const GRID_ORIGIN_X = RIGHT_PANEL_X + Math.floor((PANEL_RIGHT_WIDTH - GRID_WIDTH_PX) / 2)

// Nine-slice frame tile size; content insets by one tile on every edge.
export const PANEL_FRAME_TILE_PX = 8

// Right panel layout, top-to-bottom:
//   [top frame] [stats band] [divider] [grid (centered)] [divider] [held band] [bottom frame]
export const RIGHT_PANEL_TOP_BAND_H = 8     // snug to 8x8 stats icons
export const RIGHT_PANEL_BOTTOM_BAND_H = 16 // snug to 16x16 held-item icons

// Bands may poke this far into the frame's 8 px inset without hitting ornament.
export const RIGHT_PANEL_BAND_BLEED_PX = 2

export const RIGHT_PANEL_TOP_BAND_Y = PANEL_FRAME_TILE_PX - RIGHT_PANEL_BAND_BLEED_PX
export const RIGHT_PANEL_TOP_DIVIDER_Y = PANEL_FRAME_TILE_PX + RIGHT_PANEL_TOP_BAND_H
export const RIGHT_PANEL_BOTTOM_BAND_Y = SCREEN_HEIGHT - PANEL_FRAME_TILE_PX - RIGHT_PANEL_BOTTOM_BAND_H + RIGHT_PANEL_BAND_BLEED_PX
export const RIGHT_PANEL_BOTTOM_DIVIDER_Y = SCREEN_HEIGHT - PANEL_FRAME_TILE_PX - RIGHT_PANEL_BOTTOM_BAND_H - 1

const gridAvailTop = RIGHT_PANEL_TOP_DIVIDER_Y + 1
const gridAvailH = RIGHT_PANEL_BOTTOM_DIVIDER_Y - gridAvailTop
export const GRID_ORIGIN_Y = gridAvailTop + Math.floor((gridAvailH - GRID_HEIGHT_PX) / 2)

// Inner content extent (frame-inset, drawable region).
export const RIGHT_PANEL_INNER_X = RIGHT_PANEL_X + PANEL_FRAME_TILE_PX
export const RIGHT_PANEL_INNER_W = PANEL_RIGHT_WIDTH - PANEL_FRAME_TILE_PX * 2
export const LEFT_PANEL_INNER_X = PANEL_FRAME_TILE_PX
export const LEFT_PANEL_INNER_W = PANEL_LEFT_WIDTH - PANEL_FRAME_TILE_PX * 2

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

