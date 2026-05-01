import {
  ENABLE_ANIMATIONS,
  GRID_TRANSITION_STEP_FRAMES,
  SPR_BUTTON_GOAL,
  SPR_BUTTON_MAP,
  SPR_BUTTON_CAMP_HIRE_SCOUT,
  SPR_BUTTON_CAMP_SEARCH,
  SPR_BUTTON_MINIMAP,
  SPR_BUTTON_RESTART,
} from '../../core/constants'
import { type RightGridIconKey, getRightGridCellDef } from '../../core/rightGrid'
import { getSpriteIdAt } from '../../core/world'
import type { GridTransitionAnim, MoveSlideAnim, State } from '../../core/types'
import * as Layout from './layout'
import type { RenderHints } from './input'
import * as UI from './uiConstants'

type Cell = { row: number; col: number }
type Rect = { x: number; y: number; w: number; h: number }

export type RightGridRenderOp =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: number }
  | {
      kind: 'spr'
      spriteId: number
      x: number
      y: number
      colorkey: number | number[]
      scale: number
      w: number
      h: number
      flip: 0 | 1 | 2 | 3
      rotate: 0 | 1 | 2 | 3
    }

export type RightGridRenderPlan = {
  ops: RightGridRenderOp[]
}

// Keep all right-grid UI sprite IDs together so future remaps are localized.
const RIGHT_GRID_SPRITE_ID: Record<RightGridIconKey, number> = {
  goal: SPR_BUTTON_GOAL,
  minimap: SPR_BUTTON_MINIMAP,
  map: SPR_BUTTON_MAP,
  restart: SPR_BUTTON_RESTART,
  fight: UI.UI_SPR_FIGHT,
  return: UI.UI_SPR_RETURN,
  enemy: UI.UI_SPR_ENEMY,
  campSearch: SPR_BUTTON_CAMP_SEARCH,
  campHireScout: SPR_BUTTON_CAMP_HIRE_SCOUT,
  campLeave: UI.UI_SPR_RETURN,
  campFireIcon: 140,
}

function spriteIdForIconKey(iconKey: RightGridIconKey): number {
  return RIGHT_GRID_SPRITE_ID[iconKey]
}

function crossRevealIndex(row: number, col: number): number {
  // Reveal order: N, W, S, E, C
  if (row === 0 && col === 1) return 0
  if (row === 1 && col === 0) return 1
  if (row === 2 && col === 1) return 2
  if (row === 1 && col === 2) return 3
  if (row === 1 && col === 1) return 4
  return -1
}

function spriteIdForModeCrossCell(s: State, mode: 'blank' | 'overworld' | 'combat', row: number, col: number): number | null {
  if (mode === 'blank') return null
  if (mode === 'combat') {
    // Combat layout: W=fight, E=return, C=enemy, N/S empty.
    if (row === 1 && col === 0) return RIGHT_GRID_SPRITE_ID.fight
    if (row === 1 && col === 2) return RIGHT_GRID_SPRITE_ID.return
    if (row === 1 && col === 1) return RIGHT_GRID_SPRITE_ID.enemy
    return null
  }

  // Overworld: show tile previews (relative to player).
  const p = s.player.position
  if (row === 0 && col === 1) return getSpriteIdAt(s.world, p.x, p.y - 1)
  if (row === 1 && col === 0) return getSpriteIdAt(s.world, p.x - 1, p.y)
  if (row === 2 && col === 1) return getSpriteIdAt(s.world, p.x, p.y + 1)
  if (row === 1 && col === 2) return getSpriteIdAt(s.world, p.x + 1, p.y)
  if (row === 1 && col === 1) return getSpriteIdAt(s.world, p.x, p.y)
  return null
}

function previewSpriteIdForCell(s: State, row: number, col: number): number | null {
  // During a grid transition, we render a hybrid from-mode → to-mode layout.
  let transition: GridTransitionAnim | null = null
  if (ENABLE_ANIMATIONS) {
    const anims = s.ui.anim.active
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i]!
      if (a.kind === 'gridTransition') {
        transition = a as GridTransitionAnim
        break
      }
    }
  }

  if (transition) {
    const frame = s.ui.clock.frame | 0
    const start = transition.startFrame | 0
    if (frame >= start) {
      const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0)
      const t = Math.max(0, frame - start)
      const phase = Math.floor(t / stepFrames)

      const idx = crossRevealIndex(row, col)
      if (idx >= 0) {
        const mode = phase >= idx ? transition.params.to : transition.params.from
        return spriteIdForModeCrossCell(s, mode, row, col)
      }
    }
  }

  const def = getRightGridCellDef(s, row, col)
  if (def.iconKey) return spriteIdForIconKey(def.iconKey) ?? null
  if (def.tilePreview && def.tilePreview.kind === 'relativeToPlayer') {
    const p = s.player.position
    return getSpriteIdAt(s.world, p.x + def.tilePreview.dx, p.y + def.tilePreview.dy)
  }
  return null
}

function cellOriginPx(row: number, col: number) {
  const pitch = Layout.CELL_SIZE_PX + Layout.CELL_GAP_PX
  return { x: Layout.GRID_ORIGIN_X + col * pitch, y: Layout.GRID_ORIGIN_Y + row * pitch }
}

function spriteOriginInCellPx(row: number, col: number) {
  const spriteSize = 16 * UI.UI_RIGHT_GRID_SPRITE_SCALE
  const spriteOffset = Math.floor((Layout.CELL_SIZE_PX - spriteSize) / 2)
  const o = cellOriginPx(row, col)
  return { x: o.x + spriteOffset, y: o.y + spriteOffset }
}

function rectOp(x: number, y: number, w: number, h: number, color: number): RightGridRenderOp {
  return { kind: 'rect', x, y, w, h, color }
}

function sprOp(spriteId: number, x: number, y: number): RightGridRenderOp {
  return {
    kind: 'spr',
    spriteId,
    x,
    y,
    colorkey: UI.UI_RIGHT_GRID_COLORKEY,
    scale: UI.UI_RIGHT_GRID_SPRITE_SCALE,
    w: UI.UI_RIGHT_GRID_SPRITE_W,
    h: UI.UI_RIGHT_GRID_SPRITE_H,
    flip: 0,
    rotate: 0,
  }
}

function drawHoverTintOps(cell: Cell): RightGridRenderOp[] {
  const o = cellOriginPx(cell.row, cell.col)
  return [rectOp(o.x, o.y, Layout.CELL_SIZE_PX, Layout.CELL_SIZE_PX, UI.UI_COLOR_GRID_HOVER_TINT)]
}

function hoverCellFromHints(hints: RenderHints): Cell | null {
  return hints.rightGridHoverCell
}

function findMoveSlideAnim(s: State): MoveSlideAnim | null {
  if (!ENABLE_ANIMATIONS) return null
  const anims = s.ui.anim.active
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    if (a.kind === 'moveSlide') return a as MoveSlideAnim
  }
  return null
}

function isMetaCornerCell(cell: Cell): boolean {
  return (
    (cell.row === 0 && cell.col === 0) || // goal
    (cell.row === 0 && cell.col === 2) || // map
    (cell.row === 2 && cell.col === 0) || // minimap
    (cell.row === 2 && cell.col === 2) // restart
  )
}

function rightPanelBoundsPx(): Rect {
  return {
    x: Layout.PANEL_LEFT_WIDTH,
    y: 0,
    w: Layout.PANEL_RIGHT_WIDTH,
    h: Layout.SCREEN_HEIGHT,
  }
}

function gridBoundsPx(): Rect {
  return {
    x: Layout.GRID_ORIGIN_X,
    y: Layout.GRID_ORIGIN_Y,
    w: Layout.GRID_WIDTH_PX,
    h: Layout.CELL_SIZE_PX * Layout.GRID_ROWS + Layout.CELL_GAP_PX * (Layout.GRID_ROWS - 1),
  }
}

function maskOutsideGridOps(): RightGridRenderOp[] {
  const panel = rightPanelBoundsPx()
  const grid = gridBoundsPx()

  const ops: RightGridRenderOp[] = []

  // Top and bottom strips
  if (grid.y > panel.y) ops.push(rectOp(panel.x, panel.y, panel.w, grid.y - panel.y, UI.UI_COLOR_BG))
  const bottomY = grid.y + grid.h
  const panelBottomY = panel.y + panel.h
  if (panelBottomY > bottomY) ops.push(rectOp(panel.x, bottomY, panel.w, panelBottomY - bottomY, UI.UI_COLOR_BG))

  // Left and right strips adjacent to the grid
  if (grid.x > panel.x) ops.push(rectOp(panel.x, grid.y, grid.x - panel.x, grid.h, UI.UI_COLOR_BG))
  const rightX = grid.x + grid.w
  const panelRightX = panel.x + panel.w
  if (panelRightX > rightX) ops.push(rectOp(rightX, grid.y, panelRightX - rightX, grid.h, UI.UI_COLOR_BG))

  return ops
}

function maskGridGapsOps(): RightGridRenderOp[] {
  const pitch = Layout.CELL_SIZE_PX + Layout.CELL_GAP_PX

  // Vertical gap x positions: between col0-col1 and col1-col2
  const gx0 = Layout.GRID_ORIGIN_X + Layout.CELL_SIZE_PX
  const gx1 = Layout.GRID_ORIGIN_X + pitch + Layout.CELL_SIZE_PX

  // Horizontal gap y positions: between row0-row1 and row1-row2
  const gy0 = Layout.GRID_ORIGIN_Y + Layout.CELL_SIZE_PX
  const gy1 = Layout.GRID_ORIGIN_Y + pitch + Layout.CELL_SIZE_PX

  // Row y origins for row0 and row2
  const row0Y = Layout.GRID_ORIGIN_Y + 0 * pitch
  const row2Y = Layout.GRID_ORIGIN_Y + 2 * pitch

  // Col x origins for col0 and col2
  const col0X = Layout.GRID_ORIGIN_X + 0 * pitch
  const col2X = Layout.GRID_ORIGIN_X + 2 * pitch

  return [
    // Vertical gap segments (4): only rows 0 and 2.
    rectOp(gx0, row0Y, Layout.CELL_GAP_PX, Layout.CELL_SIZE_PX, UI.UI_COLOR_BG),
    rectOp(gx0, row2Y, Layout.CELL_GAP_PX, Layout.CELL_SIZE_PX, UI.UI_COLOR_BG),
    rectOp(gx1, row0Y, Layout.CELL_GAP_PX, Layout.CELL_SIZE_PX, UI.UI_COLOR_BG),
    rectOp(gx1, row2Y, Layout.CELL_GAP_PX, Layout.CELL_SIZE_PX, UI.UI_COLOR_BG),
    // Horizontal gap segments (4): only cols 0 and 2.
    rectOp(col0X, gy0, Layout.CELL_SIZE_PX, Layout.CELL_GAP_PX, UI.UI_COLOR_BG),
    rectOp(col2X, gy0, Layout.CELL_SIZE_PX, Layout.CELL_GAP_PX, UI.UI_COLOR_BG),
    rectOp(col0X, gy1, Layout.CELL_SIZE_PX, Layout.CELL_GAP_PX, UI.UI_COLOR_BG),
    rectOp(col2X, gy1, Layout.CELL_SIZE_PX, Layout.CELL_GAP_PX, UI.UI_COLOR_BG),
  ]
}

function buildStaticPlan(s: State, hover: Cell | null): RightGridRenderPlan {
  const ops: RightGridRenderOp[] = []

  for (let row = 0; row < Layout.GRID_ROWS; row++) {
    for (let col = 0; col < Layout.GRID_COLS; col++) {
      if (hover && hover.row === row && hover.col === col) ops.push(...drawHoverTintOps({ row, col }))

      const spriteId = previewSpriteIdForCell(s, row, col)
      if (spriteId == null) continue

      const o = spriteOriginInCellPx(row, col)
      ops.push(sprOp(spriteId, o.x, o.y))
    }
  }

  return { ops }
}

function buildMoveSlidePlan(s: State, anim: MoveSlideAnim, hover: Cell | null): RightGridRenderPlan {
  const frame = s.ui.clock.frame | 0
  const startFrame = anim.startFrame | 0
  const durationFrames = Math.max(1, anim.durationFrames | 0)
  const t = Math.max(0, Math.min(durationFrames, frame - startFrame))

  const pX = Layout.CELL_SIZE_PX + Layout.CELL_GAP_PX
  const dx = anim.params.dx | 0
  const dy = anim.params.dy | 0
  const shiftX = -dx * pX
  const shiftY = -dy * pX
  const offX = Math.floor((shiftX * t) / durationFrames)
  const offY = Math.floor((shiftY * t) / durationFrames)

  const fromPos = anim.params.fromPos
  const toPos = anim.params.toPos

  const ops: RightGridRenderOp[] = []

  const cross = [
    { row: 0, col: 1, ox: 0, oy: -1 },
    { row: 1, col: 0, ox: -1, oy: 0 },
    { row: 1, col: 1, ox: 0, oy: 0 },
    { row: 1, col: 2, ox: 1, oy: 0 },
    { row: 2, col: 1, ox: 0, oy: 1 },
  ]

  if (hover && !isMetaCornerCell(hover)) ops.push(...drawHoverTintOps(hover))

  // Old view slides toward new view.
  for (let i = 0; i < cross.length; i++) {
    const c = cross[i]!
    const spriteId = getSpriteIdAt(s.world, fromPos.x + c.ox, fromPos.y + c.oy)
    const o = spriteOriginInCellPx(c.row, c.col)
    ops.push(sprOp(spriteId, o.x + offX, o.y + offY))
  }

  // New view slides in from the opposite side.
  for (let i = 0; i < cross.length; i++) {
    const c = cross[i]!
    const spriteId = getSpriteIdAt(s.world, toPos.x + c.ox, toPos.y + c.oy)
    const o = spriteOriginInCellPx(c.row, c.col)
    ops.push(sprOp(spriteId, o.x + offX - shiftX, o.y + offY - shiftY))
  }

  ops.push(...maskOutsideGridOps(), ...maskGridGapsOps())

  // Keep corners stable UI (mask + redraw icons).
  const corners: Array<{ row: number; col: number; spriteId: number | null }> = [
    { row: 0, col: 0, spriteId: SPR_BUTTON_GOAL },
    { row: 2, col: 0, spriteId: SPR_BUTTON_MINIMAP },
    { row: 2, col: 2, spriteId: SPR_BUTTON_RESTART },
    { row: 0, col: 2, spriteId: SPR_BUTTON_MAP },
  ]

  for (let i = 0; i < corners.length; i++) {
    const c = corners[i]!
    const cellO = cellOriginPx(c.row, c.col)
    ops.push(rectOp(cellO.x, cellO.y, Layout.CELL_SIZE_PX, Layout.CELL_SIZE_PX, UI.UI_COLOR_BG))
    if (hover && hover.row === c.row && hover.col === c.col) ops.push(...drawHoverTintOps({ row: c.row, col: c.col }))
    if (c.spriteId != null) {
      const o = spriteOriginInCellPx(c.row, c.col)
      ops.push(sprOp(c.spriteId, o.x, o.y))
    }
  }

  return { ops }
}

export function buildRightGridRenderPlan(s: State, hints: RenderHints): RightGridRenderPlan {
  const hover = hoverCellFromHints(hints)
  const moveSlide = findMoveSlideAnim(s)
  if (!moveSlide) return buildStaticPlan(s, hover)
  return buildMoveSlidePlan(s, moveSlide, hover)
}

