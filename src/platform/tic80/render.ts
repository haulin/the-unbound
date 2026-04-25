import {
  ENABLE_ANIMATIONS,
  FOOD_SPRITE_ID,
  FOOD_WARNING_THRESHOLD,
  LORE_MAX_CHARS_PER_LINE,
  SPR_BUTTON_GOAL,
  SPR_BUTTON_MINIMAP,
  SPR_BUTTON_RESTART,
} from '../../core/constants'
import { getTileIdAt } from '../../core/world'
import { LEFT_PANEL_KIND_MINIMAP, LEFT_PANEL_KIND_SPRITE, type FoodDeltaAnim, type MoveSlideAnim, type State } from '../../core/types'
import {
  CELL_GAP_PX,
  CELL_SIZE_PX,
  GRID_COLS,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Y,
  GRID_ROWS,
  GRID_WIDTH_PX,
  PANEL_LEFT_WIDTH,
  PANEL_RIGHT_WIDTH,
  SCREEN_HEIGHT,
} from './layout'
import {
  UI_COLOR_BAD,
  UI_COLOR_BG,
  UI_COLOR_DIM,
  UI_COLOR_GOOD,
  UI_COLOR_TEXT,
  UI_COLOR_WARN,
  UI_FOOD_DELTA_GAP_PX,
  UI_FOOD_DELTA_OFFSET_X,
  UI_FOOD_DELTA_OFFSET_Y,
  UI_FOOD_DELTA_RISE_PX,
  UI_FOOD_ICON_H_PX,
  UI_FOOD_VALUE_OFFSET_X,
  UI_FOOD_VALUE_OFFSET_Y,
  UI_LEFT_PANEL_INNER_GAP,
  UI_LEFT_PANEL_PADDING,
  UI_STATUS_ICON_GAP,
  UI_STATUS_ICON_SIZE,
  UI_STATUS_LINE_GAP,
  UI_STATUS_TEXT_OFFSET_Y,
} from './uiConstants'

const COLOR_BG = UI_COLOR_BG
const COLOR_TEXT = UI_COLOR_TEXT
const COLOR_DIM = UI_COLOR_DIM
const COLOR_GOOD = UI_COLOR_GOOD
const COLOR_WARN = UI_COLOR_WARN
const COLOR_BAD = UI_COLOR_BAD

export function renderFrame(s: State) {
  cls(COLOR_BG)
  drawRightPanel(s)
  // Draw left panel last so it masks any right-panel animation overflow into x < PANEL_LEFT_WIDTH.
  drawLeftPanel(s)
}

// ----------------------------
// Rendering constants (TIC-80)
// ----------------------------
// Split into a separate file to keep this module readable.

// ----------------------------
// Pure rendering helpers
// ----------------------------
function formatA1(position: { x: number; y: number }) {
  const col = String.fromCharCode('A'.charCodeAt(0) + position.x)
  const row = String(position.y + 1)
  return col + row
}

function wrapText(text: string, maxChars: number) {
  const paragraphs = String(text || '').split('\n')
  const out: string[] = []

  for (let p = 0; p < paragraphs.length; p++) {
    const words = String(paragraphs[p] || '')
      .split(/\s+/)
      .filter(Boolean)
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (next.length > maxChars && line) {
        out.push(line)
        line = w
      } else {
        line = next
      }
    }
    if (line) out.push(line)
  }

  return out
}

// ----------------------------
// Left panel
// ----------------------------
const BUTTON_SPRITE_SCALE = 2 // 16->32
const ILLUSTRATION_SCALE = 4 // 16->64

const SPR_STATUS_STEPS = 130
const SPR_STATUS_POS = 131
const SPR_STATUS_SEED = 132

function drawLeftPanel(s: State) {
  rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, COLOR_BG)
  rectb(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, COLOR_DIM)

  const pos = s.player.position
  const tileId = getTileIdAt(s.world, pos.x, pos.y)
  const leftPanel = s.ui.leftPanel

  const illSize = 16 * ILLUSTRATION_SCALE
  const illX = UI_LEFT_PANEL_PADDING
  const illY = UI_LEFT_PANEL_PADDING
  if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
    drawMinimap(s)
  } else {
    const illustrationId = leftPanel.kind === LEFT_PANEL_KIND_SPRITE ? leftPanel.spriteId : tileId
    spr(illustrationId, illX, illY, -1, ILLUSTRATION_SCALE, 0, 0, 2, 2)
  }

  const statusX = illX + illSize + UI_LEFT_PANEL_INNER_GAP
  const statusY = illY
  const statusIconSize = UI_STATUS_ICON_SIZE
  const statusIconGap = UI_STATUS_ICON_GAP
  const fontH = 6
  const statusLineGap = UI_STATUS_LINE_GAP
  const statusLineH = fontH + statusLineGap
  const messageLineH = fontH + 1
  const textOffsetY = UI_STATUS_TEXT_OFFSET_Y

  // Food gets the hero slot; keep the existing stats compact.
  const foodX = statusX
  const foodY = statusY
  spr(FOOD_SPRITE_ID, foodX, foodY, -1, 1, 0, 0, 2, 2) // 16×16
  const foodValueX = foodX + UI_FOOD_VALUE_OFFSET_X
  const foodValueY = foodY + UI_FOOD_VALUE_OFFSET_Y
  const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? COLOR_WARN : COLOR_TEXT
  print(`${s.resources.food}`, foodValueX, foodValueY, foodColor)

  const smallStartY = foodY + UI_FOOD_ICON_H_PX + 4
  const seedY = smallStartY + 0 * statusLineH
  const posY = smallStartY + 1 * statusLineH
  const stepsY = smallStartY + 2 * statusLineH

  // Seed (least important, but still useful)
  spr(SPR_STATUS_SEED, statusX, seedY, -1)
  print(`${s.world.seed}`, statusX + statusIconSize + statusIconGap, seedY + textOffsetY, COLOR_TEXT)

  // Position (arguably important, keep it)
  spr(SPR_STATUS_POS, statusX, posY, -1)
  print(formatA1(pos), statusX + statusIconSize + statusIconGap, posY + textOffsetY, COLOR_TEXT)

  // Steps
  spr(SPR_STATUS_STEPS, statusX, stepsY, -1)
  print(`${s.run.stepCount}`, statusX + statusIconSize + statusIconGap, stepsY + textOffsetY, COLOR_TEXT)

  // Food delta flashes (non-blocking)
  {
    const anims = s.ui.anim.active
    const frame = s.ui.clock.frame | 0
    let xCursor = foodX + UI_FOOD_DELTA_OFFSET_X
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i]!
      if (a.kind !== 'foodDelta') continue
      const fa = a as FoodDeltaAnim
      const start = fa.startFrame | 0
      const dur = Math.max(1, fa.durationFrames | 0)
      const t = Math.max(0, Math.min(dur, frame - start))
      const p = t / dur

      const delta = fa.params.delta | 0
      if (!delta) continue

      const label = delta > 0 ? `+${delta}` : `${delta}`
      const color = delta > 0 ? COLOR_GOOD : COLOR_BAD

      // Anchor over the icon, and stack horizontally so +N stays readable.
      const dy = UI_FOOD_DELTA_OFFSET_Y - Math.floor(p * UI_FOOD_DELTA_RISE_PX)
      print(label, xCursor, foodY + dy, color)
      xCursor += label.length * 6 + UI_FOOD_DELTA_GAP_PX
    }
  }

  const foundY = stepsY + statusLineH
  if (s.run.hasFoundCastle) print('FOUND', statusX, foundY + textOffsetY, COLOR_TEXT)

  const statusBottomY = s.run.hasFoundCastle ? foundY + statusLineH : stepsY + statusLineH
  const headerBottomY = Math.max(illY + illSize, statusBottomY)
  const msgY = headerBottomY + 4
  const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH))
  const lines = wrapText(s.ui.message, LORE_MAX_CHARS_PER_LINE)
  for (let i = 0; i < lines.length && i < maxLines; i++) {
    print(lines[i], UI_LEFT_PANEL_PADDING, msgY + i * messageLineH, COLOR_TEXT)
  }
}

// ----------------------------
// Right panel
// ----------------------------
function drawRightPanel(s: State) {
  if (!ENABLE_ANIMATIONS) return drawRightPanelStatic(s)

  const anims = s.ui.anim.active
  let moveSlide: MoveSlideAnim | null = null
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    if (a.kind === 'moveSlide') {
      moveSlide = a as MoveSlideAnim
      break
    }
  }
  if (!moveSlide) return drawRightPanelStatic(s)

  return drawRightPanelMoveSlideCross(s, moveSlide)
}

function previewSpriteIdForCell(s: State, row: number, col: number): number | null {
  // Corners: goal/minimap/restart/disabled
  if (row === 0 && col === 0) return SPR_BUTTON_GOAL
  if (row === 2 && col === 0) return SPR_BUTTON_MINIMAP
  if (row === 2 && col === 2) return SPR_BUTTON_RESTART
  if (row === 0 && col === 2) return null

  const p = s.player.position
  // Cross: N/W/C/E/S show the tile sprite you’d see if you moved there (or stayed on C).
  if (row === 0 && col === 1) return getTileIdAt(s.world, p.x, p.y - 1)
  if (row === 1 && col === 0) return getTileIdAt(s.world, p.x - 1, p.y)
  if (row === 1 && col === 1) return getTileIdAt(s.world, p.x, p.y)
  if (row === 1 && col === 2) return getTileIdAt(s.world, p.x + 1, p.y)
  if (row === 2 && col === 1) return getTileIdAt(s.world, p.x, p.y + 1)

  return null
}

function drawRightPanelStatic(s: State) {
  const pitch = CELL_SIZE_PX + CELL_GAP_PX
  const spriteSize = 16 * BUTTON_SPRITE_SCALE
  const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2)

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_ORIGIN_X + col * pitch
      const y = GRID_ORIGIN_Y + row * pitch

      const spriteId = previewSpriteIdForCell(s, row, col)
      if (spriteId != null) spr(spriteId, x + spriteOffset, y + spriteOffset, -1, BUTTON_SPRITE_SCALE, 0, 0, 2, 2)
    }
  }
}

function cellOriginPx(row: number, col: number) {
  const pitch = CELL_SIZE_PX + CELL_GAP_PX
  return { x: GRID_ORIGIN_X + col * pitch, y: GRID_ORIGIN_Y + row * pitch }
}

function drawSpriteInCell(row: number, col: number, spriteId: number, offsetX: number, offsetY: number) {
  const spriteSize = 16 * BUTTON_SPRITE_SCALE
  const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2)
  const o = cellOriginPx(row, col)
  spr(
    spriteId,
    o.x + spriteOffset + (offsetX | 0),
    o.y + spriteOffset + (offsetY | 0),
    -1,
    BUTTON_SPRITE_SCALE,
    0,
    0,
    2,
    2
  )
}

function clearCell(row: number, col: number) {
  const o = cellOriginPx(row, col)
  rect(o.x, o.y, CELL_SIZE_PX, CELL_SIZE_PX, COLOR_BG)
}

function maskOutsideGridInRightPanel() {
  const panelX = PANEL_LEFT_WIDTH
  const panelY = 0
  const panelW = PANEL_RIGHT_WIDTH
  const panelH = SCREEN_HEIGHT

  const gridX = GRID_ORIGIN_X
  const gridY = GRID_ORIGIN_Y
  const gridW = GRID_WIDTH_PX
  const gridH = CELL_SIZE_PX * GRID_ROWS + CELL_GAP_PX * (GRID_ROWS - 1)

  // Top and bottom strips
  if (gridY > panelY) rect(panelX, panelY, panelW, gridY - panelY, COLOR_BG)
  const bottomY = gridY + gridH
  const panelBottomY = panelY + panelH
  if (panelBottomY > bottomY) rect(panelX, bottomY, panelW, panelBottomY - bottomY, COLOR_BG)

  // Left and right strips adjacent to the grid
  if (gridX > panelX) rect(panelX, gridY, gridX - panelX, gridH, COLOR_BG)
  const rightX = gridX + gridW
  const panelRightX = panelX + panelW
  if (panelRightX > rightX) rect(rightX, gridY, panelRightX - rightX, gridH, COLOR_BG)
}

function maskGridGaps() {
  const pitch = CELL_SIZE_PX + CELL_GAP_PX

  // Vertical gap x positions: between col0-col1 and col1-col2
  const gx0 = GRID_ORIGIN_X + CELL_SIZE_PX
  const gx1 = GRID_ORIGIN_X + pitch + CELL_SIZE_PX

  // Horizontal gap y positions: between row0-row1 and row1-row2
  const gy0 = GRID_ORIGIN_Y + CELL_SIZE_PX
  const gy1 = GRID_ORIGIN_Y + pitch + CELL_SIZE_PX

  // Row y origins for row0 and row2
  const row0Y = GRID_ORIGIN_Y + 0 * pitch
  const row2Y = GRID_ORIGIN_Y + 2 * pitch

  // Col x origins for col0 and col2
  const col0X = GRID_ORIGIN_X + 0 * pitch
  const col2X = GRID_ORIGIN_X + 2 * pitch

  // Vertical gap segments (4): only rows 0 and 2.
  rect(gx0, row0Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)
  rect(gx0, row2Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)
  rect(gx1, row0Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)
  rect(gx1, row2Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)

  // Horizontal gap segments (4): only cols 0 and 2.
  rect(col0X, gy0, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
  rect(col2X, gy0, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
  rect(col0X, gy1, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
  rect(col2X, gy1, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
}

function drawRightPanelMoveSlideCross(s: State, anim: MoveSlideAnim) {
  const frame = s.ui.clock.frame | 0
  const startFrame = anim.startFrame | 0
  const durationFrames = Math.max(1, anim.durationFrames | 0)
  const t = Math.max(0, Math.min(durationFrames, frame - startFrame))

  const pX = CELL_SIZE_PX + CELL_GAP_PX
  const dx = anim.params.dx | 0
  const dy = anim.params.dy | 0
  const shiftX = -dx * pX
  const shiftY = -dy * pX
  const offX = Math.floor((shiftX * t) / durationFrames)
  const offY = Math.floor((shiftY * t) / durationFrames)

  const fromPos = anim.params.fromPos
  const toPos = anim.params.toPos

  // Cross cells: N, W, C, E, S (corners stay UI)
  const cross = [
    { row: 0, col: 1, ox: 0, oy: -1 },
    { row: 1, col: 0, ox: -1, oy: 0 },
    { row: 1, col: 1, ox: 0, oy: 0 },
    { row: 1, col: 2, ox: 1, oy: 0 },
    { row: 2, col: 1, ox: 0, oy: 1 },
  ]

  // Old view slides toward new view.
  for (let i = 0; i < cross.length; i++) {
    const c = cross[i]!
    const tileId = getTileIdAt(s.world, fromPos.x + c.ox, fromPos.y + c.oy)
    drawSpriteInCell(c.row, c.col, tileId, offX, offY)
  }

  // New view slides in from the opposite side.
  for (let i = 0; i < cross.length; i++) {
    const c = cross[i]!
    const tileId = getTileIdAt(s.world, toPos.x + c.ox, toPos.y + c.oy)
    drawSpriteInCell(c.row, c.col, tileId, offX - shiftX, offY - shiftY)
  }

  // Mask anything that slid outside the 3×3 grid, and keep gaps clean.
  maskOutsideGridInRightPanel()
  maskGridGaps()

  // Keep corners stable UI (mask + redraw icons).
  clearCell(0, 0) // goal
  clearCell(2, 0) // minimap
  clearCell(2, 2) // restart
  clearCell(0, 2) // disabled

  drawSpriteInCell(0, 0, SPR_BUTTON_GOAL, 0, 0)
  drawSpriteInCell(2, 0, SPR_BUTTON_MINIMAP, 0, 0)
  drawSpriteInCell(2, 2, SPR_BUTTON_RESTART, 0, 0)
}

// ----------------------------
// Minimap
// ----------------------------
const MINIMAP_CELL_PX = 6
const MINIMAP_TILE_CACHE: Record<number, number[]> = {}

function getMinimapTilePixels(tileId: number) {
  const k = tileId | 0
  const cached = MINIMAP_TILE_CACHE[k]
  if (cached) return cached

  // TIC-80 can't draw sprites at scale < 1, and JS builds don't expose `sget()`.
  // Instead, we temporarily draw the 16×16 sprite to a scratch area and sample it via `pix()`.
  const scratchX = 6
  const scratchY = 6
  spr(k, scratchX, scratchY, -1, 1, 0, 0, 2, 2)

  const out: number[] = []
  for (let py = 0; py < MINIMAP_CELL_PX; py++) {
    for (let px = 0; px < MINIMAP_CELL_PX; px++) {
      // Center-crop: sample the middle 6×6 of the 16×16 sprite.
      const off = ((16 - MINIMAP_CELL_PX) / 2) | 0
      const sx = scratchX + off + px
      const sy = scratchY + off + py
      out.push(pix(sx, sy) as number)
    }
  }

  // Clear scratch (it sits inside the 64×64 block we redraw anyway).
  rect(scratchX, scratchY, 16, 16, COLOR_BG)

  MINIMAP_TILE_CACHE[k] = out
  return out
}

function drawMinimap(s: State) {
  const world = s.world
  const illX = 6
  const illY = 6
  const margin = 2
  const cellPx = MINIMAP_CELL_PX
  const originX = illX + margin
  const originY = illY + margin

  // Prime cache for all tile ids present so scratch sampling can't corrupt already-drawn minimap pixels.
  const present: Record<number, boolean> = {}
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      present[world.tiles[y]![x]! | 0] = true
    }
  }
  for (const k in present) getMinimapTilePixels(Number(k))

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const tid = world.tiles[y]![x]!
      const mini = getMinimapTilePixels(tid)
      const dx = originX + x * cellPx
      const dy = originY + y * cellPx
      let i = 0
      for (let py = 0; py < cellPx; py++) {
        for (let px = 0; px < cellPx; px++) {
          pix(dx + px, dy + py, mini[i++]!)
        }
      }
    }
  }
  const p = s.player.position
  rectb(originX + p.x * cellPx, originY + p.y * cellPx, cellPx, cellPx, COLOR_TEXT)
}


