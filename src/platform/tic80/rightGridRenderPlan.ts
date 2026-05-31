import {
  ENABLE_ANIMATIONS,
  GRID_TRANSITION_STEP_FRAMES,
} from '../../core/constants'
import { MECHANIC_INDEX } from '../../core/mechanics'
import { getRightGridCellDef, type RightGridCellDef } from '../../core/rightGrid'
import { getSpriteIdAt } from '../../core/cells'
import type { GridFromKind, GridTransitionAnim, MoveSlideAnim, State } from '../../core/types'
import { SPRITES } from '../../core/spriteIds'
import * as Layout from './layout'
import type { RenderHints } from './input'
import * as UI from './uiConstants'

type Cell = { row: number; col: number }
type Rect = { x: number; y: number; w: number; h: number }

export type RightGridRenderOp =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: number }
  | { kind: 'rectb'; x: number; y: number; w: number; h: number; color: number }
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

function crossRevealIndex(row: number, col: number): number {
  // Reveal order: N, W, S, E, C
  if (row === 0 && col === 1) return 0
  if (row === 1 && col === 0) return 1
  if (row === 2 && col === 1) return 2
  if (row === 1 && col === 2) return 3
  if (row === 1 && col === 1) return 4
  return -1
}

function findGridTransitionAnim(s: State): GridTransitionAnim | null {
  if (!ENABLE_ANIMATIONS) return null
  const anims = s.ui.anim.active
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    if (a.kind === 'gridTransition') return a as GridTransitionAnim
  }
  return null
}

// Returns the from/to mode for this cell at the current spiral reveal phase,
// or null if no transition is active or the cell isn't part of the cross.
function transitionModeForCell(s: State, row: number, col: number): GridFromKind | null {
  const transition = findGridTransitionAnim(s)
  if (!transition) return null
  const idx = crossRevealIndex(row, col)
  if (idx < 0) return null
  const frame = s.ui.clock.frame | 0
  const start = transition.startFrame | 0
  if (frame < start) return transition.params.from
  const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0)
  const phase = Math.floor((frame - start) / stepFrames)
  return phase >= idx ? transition.params.to : transition.params.from
}

// Builds the State the grid should evaluate against for a given mode. Overworld
// clears the encounter; encounter modes use the live one if it matches (so the
// reveal sees variant-specific cells like the wyrm's Pay button) and otherwise
// fall back to the mechanic's preview placeholder. Callers must filter `blank`.
function synthesizeStateForMode(s: State, mode: Exclude<GridFromKind, 'blank'>): State {
  if (mode === 'overworld') return { ...s, encounter: null }
  if (s.encounter && s.encounter.kind === mode) return s
  const provider = MECHANIC_INDEX.previewEncounterByEncounterKind[mode]
  return { ...s, encounter: provider ? provider() : null }
}

type CellCategory = 'meta' | 'action' | 'terrain' | 'empty'

type CellView = {
  spriteId: number | null
  category: CellCategory
}

// Resolves the def-derived view (sprite + category) for one cell against a state.
// Sprite and category share the same def lookup so they cannot drift apart.
function viewFromDef(def: RightGridCellDef, s: State): CellView {
  if (def.tilePreview && def.tilePreview.kind === 'relativeToPlayer') {
    const p = s.player.position
    return {
      spriteId: getSpriteIdAt(s.world, p.x + def.tilePreview.dx, p.y + def.tilePreview.dy),
      category: 'terrain',
    }
  }
  if (def.spriteId != null) return { spriteId: def.spriteId, category: 'action' }
  return { spriteId: null, category: 'empty' }
}

// The full per-cell view for this frame: handles meta corners, the center
// no-border rule, and the cross-reveal animation in one place. Border ops and
// sprite ops downstream both read from this single source so they animate in
// lockstep.
function viewForCell(s: State, row: number, col: number): CellView {
  if (isMetaCornerCell({ row, col })) {
    const def = getRightGridCellDef(s, row, col)
    return { spriteId: def.spriteId ?? null, category: 'meta' }
  }

  const mode = transitionModeForCell(s, row, col)
  if (mode === 'blank') return { spriteId: null, category: 'empty' }

  const stateAt = mode != null ? synthesizeStateForMode(s, mode) : s
  const def = getRightGridCellDef(stateAt, row, col)
  const view = viewFromDef(def, stateAt)

  // Center is never a button: it shows content but draws no border.
  if (row === 1 && col === 1) return { spriteId: view.spriteId, category: 'empty' }
  return view
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

function rectbOp(x: number, y: number, w: number, h: number, color: number): RightGridRenderOp {
  return { kind: 'rectb', x, y, w, h, color }
}

function borderOpsForCell(row: number, col: number, category: CellCategory): RightGridRenderOp[] {
  if (category === 'empty') return []
  const o = cellOriginPx(row, col)
  const size = Layout.CELL_SIZE_PX

  if (category === 'meta') {
    return [rectbOp(o.x, o.y, size, size, UI.UI_COLOR_GRID_CELL_BORDER_META)]
  }
  if (category === 'action') {
    return [rectbOp(o.x, o.y, size, size, UI.UI_COLOR_GRID_CELL_BORDER)]
  }
  // terrain: double border (outer + inner with 1px gap)
  const inset = UI.UI_GRID_CELL_BORDER_DOUBLE_INSET
  const color = UI.UI_COLOR_GRID_CELL_BORDER
  return [
    rectbOp(o.x, o.y, size, size, color),
    rectbOp(o.x + inset, o.y + inset, size - inset * 2, size - inset * 2, color),
  ]
}

function cellBorderOps(s: State): RightGridRenderOp[] {
  const ops: RightGridRenderOp[] = []
  for (let row = 0; row < Layout.GRID_ROWS; row++) {
    for (let col = 0; col < Layout.GRID_COLS; col++) {
      ops.push(...borderOpsForCell(row, col, viewForCell(s, row, col).category))
    }
  }
  return ops
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
    x: Layout.RIGHT_PANEL_X,
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

      const view = viewForCell(s, row, col)
      if (view.spriteId == null) continue

      const o = spriteOriginInCellPx(row, col)
      ops.push(sprOp(view.spriteId, o.x, o.y))
    }
  }

  ops.push(...cellBorderOps(s))
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
    { row: 0, col: 0, spriteId: SPRITES.actions.goal },
    { row: 2, col: 0, spriteId: SPRITES.actions.minimap },
    { row: 2, col: 2, spriteId: SPRITES.actions.restart },
    { row: 0, col: 2, spriteId: SPRITES.actions.map },
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

  ops.push(...cellBorderOps(s))
  return { ops }
}

export function buildRightGridRenderPlan(s: State, hints: RenderHints): RightGridRenderPlan {
  const hover = hoverCellFromHints(hints)
  const moveSlide = findMoveSlideAnim(s)
  if (!moveSlide) return buildStaticPlan(s, hover)
  return buildMoveSlidePlan(s, moveSlide, hover)
}

