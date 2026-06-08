import {
  FOOD_WARNING_THRESHOLD,
  LORE_MAX_CHARS_PER_LINE,
  LOST_COORD_LABEL,
  SHOW_COMBAT_HIT_ODDS,
} from '../../core/constants'
import { combatFightHitOddsPercent } from '../../core/mechanics/defs/combat'
import { inventorySpriteId, SPRITES } from '../../core/spriteIds'
import { MECHANIC_INDEX } from '../../core/mechanics'
import type { DeltaAnchorSpec } from '../../core/mechanics/types'
import { computeGameMapView } from '../../core/gameMap'
import { getSpriteIdAt } from '../../core/cells'
import { encounterIllustrationSpriteId } from '../../core/rightGrid'
import { torusDelta } from '../../core/math'
import {
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
  type DeltaAnimTarget,
  type State,
} from '../../core/types'
import type { Tic80UiState } from './anim'
import { PANEL_LEFT_WIDTH, SCREEN_HEIGHT } from './layout'
import * as Layout from './layout'
import * as UI from './uiConstants'
import type { RenderHints } from './input'
import { drawNineSliceFrame } from './nineSlice'
import { buildRightGridRenderPlan, badgeTextAnchorPx, type RightGridRenderOp } from './rightGridRenderPlan'

// Bundled inputs for the TIC-80 render pass. Orchestrators take this single
// arg; pure deep helpers (delta overlays, anim lookups) stay on focused
// args so their dependencies remain visible at the call site.
export type RenderContext = {
  state: State
  ui: Tic80UiState
  hints: RenderHints
}

export function renderFrame(ctx: RenderContext) {
  cls(UI.UI_COLOR_BG)
  drawRightPanel(ctx)
  // Draw left panel last so it masks any right-panel animation overflow into x < PANEL_LEFT_WIDTH.
  drawLeftPanel(ctx)
}

// ----------------------------
// Rendering constants (TIC-80)
// ----------------------------
// Most tunables live in `uiConstants.ts`; these two are font geometry that
// every text-positioning helper in this file needs.
const FONT_CHAR_PX = 6

// Left-panel hero stats (army / food / gold) — locked layout.
const HERO_STATS_X = 84
const HERO_STATS_Y = 12
const HERO_STAT_ROW_PX = 19 // 16px icon + 3px row gap

// ----------------------------
// Pure rendering helpers
// ----------------------------
function formatA1(position: { x: number; y: number }) {
  const col = String.fromCharCode('A'.charCodeAt(0) + position.x)
  const row = String(position.y + 1)
  return col + row
}

function formatPositionLabel(s: State): string {
  return s.run.knowsPosition ? formatA1(s.player.position) : LOST_COORD_LABEL
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

type LoreLine = { text: string; color: number }

function loreLinesForMessage(message: string, maxChars: number): LoreLine[] {
  const rawMessage = String(message || '')
  const firstNl = rawMessage.indexOf('\n')
  const title = firstNl >= 0 ? rawMessage.slice(0, firstNl) : ''
  const body = firstNl >= 0 ? rawMessage.slice(firstNl + 1) : rawMessage

  const out: LoreLine[] = []
  const titleLines = title ? wrapText(title, maxChars) : []
  const bodyLines = body ? wrapText(body, maxChars) : []

  for (let i = 0; i < titleLines.length; i++) out.push({ text: titleLines[i]!, color: UI.UI_COLOR_POI_NAME })
  for (let i = 0; i < bodyLines.length; i++) out.push({ text: bodyLines[i]!, color: UI.UI_COLOR_POI_DESC })

  return out
}

// ----------------------------
// Left panel
// ----------------------------
function drawIllustrationWithTextureOverlay(spriteId: number, x: number, y: number) {
  spr(spriteId, x, y, -1, UI.UI_ILLUSTRATION_SCALE, 0, 0, 2, 2)
  // Texture overlay: tile an 8x8 sprite over the 64x64 illustration.
  // Key off a non-black color so the grain can use black safely.
  const illPx = 16 * UI.UI_ILLUSTRATION_SCALE
  for (let oy = 0; oy < illPx; oy += UI.UI_TEXTURE_TILE_PX) {
    for (let ox = 0; ox < illPx; ox += UI.UI_TEXTURE_TILE_PX) {
      spr(SPRITES.ui.previewGrain, x + ox, y + oy, UI.UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR, 1)
    }
  }
}

type DeltaAnchor = {
  x: number
  y: number
  // Sign of `delta` that counts as "good" for the player. Default +1 (positive
  // deltas = green); enemyArmy passes -1 because the enemy losing troops is
  // good for the player.
  goodSign?: 1 | -1
}

function deltaAnchorsFromGridSpecs(
  specs: Partial<Record<DeltaAnimTarget, DeltaAnchorSpec>>,
): Partial<Record<DeltaAnimTarget, DeltaAnchor>> {
  const anchors: Partial<Record<DeltaAnimTarget, DeltaAnchor>> = {}
  for (const targetKey of Object.keys(specs) as DeltaAnimTarget[]) {
    const spec = specs[targetKey]
    if (!spec) continue
    const pt = badgeTextAnchorPx(spec.row, spec.col)
    const anchor: DeltaAnchor = { x: pt.x, y: pt.y }
    if (spec.goodSign != null) anchor.goodSign = spec.goodSign
    anchors[targetKey] = anchor
  }
  return anchors
}

function drawHeroStat(x: number, y: number, spriteId: number, text: string, color: number) {
  spr(spriteId, x, y, -1, 1, 0, 0, 2, 2)
  print(text, x + 19, y + 5, color) // 16px icon + 3px label gap; 5px text baseline
}

function drawDeltaOverlays(
  ui: Tic80UiState,
  anchors: Partial<Record<DeltaAnimTarget, DeltaAnchor>>,
) {
  const anims = ui.anim.active
  const frame = ui.clock.frame
  const cursorByTarget: Partial<Record<DeltaAnimTarget, number>> = {}

  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    if (a.kind !== 'delta') continue
    if (frame < a.startFrame) continue
    const anchor = anchors[a.params.target]
    if (!anchor) continue
    const delta = a.params.delta
    if (!delta) continue

    const dur = Math.max(1, a.durationFrames)
    const t = Math.max(0, Math.min(dur, frame - a.startFrame))
    const p = t / dur

    const label = delta > 0 ? `+${delta}` : `${delta}`
    const goodSign = anchor.goodSign ?? 1
    const color = delta * goodSign > 0 ? UI.UI_COLOR_GOOD : UI.UI_COLOR_BAD
    const dy = UI.UI_DELTA_OFFSET_Y - Math.floor(p * UI.UI_DELTA_RISE_PX)

    const xCursor = cursorByTarget[a.params.target] ?? anchor.x + UI.UI_DELTA_OFFSET_X
    print(label, xCursor, anchor.y + dy, color)
    cursorByTarget[a.params.target] = xCursor + label.length * FONT_CHAR_PX + UI.UI_DELTA_GAP_PX
  }
}

function drawMap(s: State, x: number, y: number, _sizePx: number) {
  const { markers } = computeGameMapView(s)
  const w = Math.max(1, s.world.width)
  const h = Math.max(1, s.world.height)

  const viewport = Math.max(1, UI.UI_MAP_VIEWPORT_CELLS)
  const pitch = Math.max(1, UI.UI_MAP_CELL_PITCH_PX)
  const radius = Math.floor(viewport / 2)
  const gridX = x + UI.UI_MAP_GRID_OFFSET_X_PX
  const gridY = y
  const centerX = gridX + radius * pitch
  const centerY = gridY + radius * pitch

  const px = s.player.position.x
  const py = s.player.position.y

  // 7x7 art in 8x8 sprites; checkerboard pair for seamless tiling. Grid is screen-fixed.
  for (let vy = -radius; vy <= radius; vy++) {
    for (let vx = -radius; vx <= radius; vx++) {
      const bg =
        (vx + vy) & 1 ? SPRITES.ui.mapBackgroundB : SPRITES.ui.mapBackgroundA
      spr(bg, centerX + vx * pitch, centerY + vy * pitch, 0)
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i]!
    const dx = torusDelta(px, m.pos.x, w)
    const dy = torusDelta(py, m.pos.y, h)
    if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue
    const color = m.isMapped ? UI.UI_MAP_POI_TEXT_COLOR : UI.UI_MAP_POI_UNCOMMITTED_TEXT_COLOR
    print(
      m.label,
      centerX + dx * pitch + UI.UI_MAP_POI_TEXT_OFFSET_X_PX,
      centerY + dy * pitch + UI.UI_MAP_POI_TEXT_OFFSET_Y_PX,
      color,
    )
  }

  // Player marker never disappears on the rolling map.
  // 9x9 corner brackets in a 16x16 slot; inset -1,-1 frames the 7px pitch cell.
  spr(SPRITES.ui.mapHereMarker, centerX - 1, centerY - 1, 0, 1, 0, 0, 2, 2)
}

// Visual reward escalation: bronze > blood > default. Ordered so the chrome
// always reflects the most-recent advance even if both tokens are held.
function panelFrameTopLeftFor(s: State): number {
  const inv = s.resources.inventory
  if (inv.includes('bronzeKey')) return SPRITES.ui.panelBorderBronze
  if (inv.includes('bloodVial')) return SPRITES.ui.panelBorderBlood
  return SPRITES.ui.panelBorder
}

function drawLeftPanel({ state: s, ui }: RenderContext) {
  rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI.UI_COLOR_BG)
  drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, panelFrameTopLeftFor(s), {
    fallbackBorderColor: UI.UI_COLOR_DIM,
  })

  const pos = s.player.position
  const spriteIdAtPos = getSpriteIdAt(s.world, pos.x, pos.y)
  const leftPanel = s.ui.leftPanel

  const illSize = 16 * UI.UI_ILLUSTRATION_SCALE
  const illX = UI.UI_LEFT_PANEL_PADDING
  const illY = UI.UI_LEFT_PANEL_PADDING
  // User-driven panel toggles (minimap, goal-sprite focus) win over the AUTO-mode
  // defaults (tombstone on game over, encounter illustration otherwise, tile preview fallback).
  if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
    drawMinimap(s)
  } else if (leftPanel.kind === LEFT_PANEL_KIND_MAP) {
    drawMap(s, illX, illY, illSize)
  } else if (leftPanel.kind === LEFT_PANEL_KIND_SPRITE) {
    drawIllustrationWithTextureOverlay(leftPanel.spriteId, illX, illY)
  } else if (s.run.isGameOver) {
    drawIllustrationWithTextureOverlay(SPRITES.flavor.tombstone, illX, illY)
  } else {
    const illSpriteId = encounterIllustrationSpriteId(s) ?? spriteIdAtPos
    drawIllustrationWithTextureOverlay(illSpriteId, illX, illY)
  }

  const fontH = 6
  const messageLineH = fontH + 1

  const headerBandBottomY = illY + illSize
  const horizontalDividerY =
    headerBandBottomY + Math.floor((UI.UI_LEFT_PANEL_LORE_TOP_GAP - 1) / 2)

  let statY = HERO_STATS_Y
  const army = { x: HERO_STATS_X, y: statY }
  drawHeroStat(army.x, army.y, SPRITES.inventory.army, `${s.resources.armySize}`,
    s.resources.armySize < 6 ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT)
  statY += HERO_STAT_ROW_PX

  const food = { x: HERO_STATS_X, y: statY }
  drawHeroStat(food.x, food.y, SPRITES.inventory.food, `${s.resources.food}`,
    s.resources.food < FOOD_WARNING_THRESHOLD ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT)
  statY += HERO_STAT_ROW_PX

  const gold = { x: HERO_STATS_X, y: statY }
  drawHeroStat(gold.x, gold.y, SPRITES.inventory.gold, `${s.resources.gold}`, UI.UI_COLOR_TEXT)
  drawDeltaOverlays(ui, { army, food, gold })

  const statusBottomY = gold.y + 16 + 2
  const headerBottomY = Math.max(headerBandBottomY, statusBottomY)
  drawLeftPanelDividers(illX, illY, illSize, horizontalDividerY)
  const msgY = headerBottomY + UI.UI_LEFT_PANEL_LORE_TOP_GAP
  const headline = s.run.isGameOver
    ? ({ text: 'GAME OVER', color: UI.UI_COLOR_BAD } as const)
    : s.run.hasWon
      ? ({ text: 'YOU WIN', color: UI.UI_COLOR_GOOD } as const)
      : null
  const headlineRows = headline ? 1 : 0
  const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH) - headlineRows)
  const lore = loreLinesForMessage(s.ui.message, LORE_MAX_CHARS_PER_LINE)
  const textStartY = headline ? msgY + messageLineH : msgY
  if (headline) print(headline.text, UI.UI_LORE_PADDING_X, msgY, headline.color)
  let printed = 0
  for (let i = 0; i < lore.length && printed < maxLines; i++) {
    const line = lore[i]!
    print(line.text, UI.UI_LORE_PADDING_X, textStartY + printed * messageLineH, line.color)
    printed++
  }
}

// ----------------------------
// Right panel
// ----------------------------
function drawRightPanel(ctx: RenderContext) {
  const { state: s, ui } = ctx
  const plan = buildRightGridRenderPlan(ctx)
  drawRightGridOps(plan.ops)
  drawCombatHitOddsDebug(s)
  drawRightStatsBand(s)
  drawRightHeldBand(s)
  drawRightPanelDividers()
  drawRightPanelFrame(s)

  const encounterKind = s.encounter?.kind ?? null
  if (encounterKind) {
    const anchorSpecs = MECHANIC_INDEX.deltaAnchorsByTargetByEncounterKind[encounterKind]
    if (anchorSpecs) drawDeltaOverlays(ui, deltaAnchorsFromGridSpecs(anchorSpecs))
  }
}

function drawCombatHitOddsDebug(s: State) {
  if (!SHOW_COMBAT_HIT_ODDS) return
  const pct = combatFightHitOddsPercent(s)
  if (pct == null) return
  print(`${pct}%`, 146, 72, UI.UI_COLOR_TEXT)
}

function drawRightPanelFrame(s: State) {
  drawNineSliceFrame(Layout.RIGHT_PANEL_X, 0, Layout.PANEL_RIGHT_WIDTH, SCREEN_HEIGHT, panelFrameTopLeftFor(s), {
    fallbackBorderColor: UI.UI_COLOR_DIM,
  })
}

type StatItem = { iconSpriteId: number; value: string }

function drawRightStatsBand(s: State) {
  const items: StatItem[] = [
    { iconSpriteId: SPRITES.small.seed, value: `${s.world.seed}` },
    { iconSpriteId: SPRITES.small.position, value: formatPositionLabel(s) },
    { iconSpriteId: SPRITES.small.steps, value: `${s.run.stepCount}` },
  ]

  const iconSize = UI.UI_STATUS_ICON_SIZE
  const iconValueGap = UI.UI_STATS_BAND_ICON_VALUE_GAP_PX
  const itemGap = UI.UI_STATS_BAND_ITEM_GAP_PX

  let contentW = 0
  for (let i = 0; i < items.length; i++) {
    contentW += iconSize + iconValueGap + items[i]!.value.length * FONT_CHAR_PX
  }
  contentW += (items.length - 1) * itemGap

  const bandY = Layout.RIGHT_PANEL_TOP_BAND_Y
  const iconY = bandY + Math.floor((Layout.RIGHT_PANEL_TOP_BAND_H - iconSize) / 2) - 1
  const textY = bandY + Math.floor((Layout.RIGHT_PANEL_TOP_BAND_H - FONT_CHAR_PX) / 2)
  let x = Layout.RIGHT_PANEL_INNER_X + Math.floor((Layout.RIGHT_PANEL_INNER_W - contentW) / 2)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    spr(item.iconSpriteId, x, iconY, -1)
    x += iconSize + iconValueGap
    print(item.value, x, textY, UI.UI_COLOR_RIGHT_STATS_TEXT)
    x += item.value.length * FONT_CHAR_PX + itemGap
  }
}

function drawRightHeldBand(s: State) {
  const heldIcons = heldStatusIcons(s)
  if (heldIcons.length === 0) return

  const iconSize = 16
  const iconGap = UI.UI_HELD_BAND_ICON_GAP_PX
  const contentW = heldIcons.length * iconSize + (heldIcons.length - 1) * iconGap

  const bandY = Layout.RIGHT_PANEL_BOTTOM_BAND_Y
  const iconY = bandY + Math.floor((Layout.RIGHT_PANEL_BOTTOM_BAND_H - iconSize) / 2)
  let x = Layout.RIGHT_PANEL_INNER_X + Math.floor((Layout.RIGHT_PANEL_INNER_W - contentW) / 2)

  for (const spriteId of heldIcons) {
    spr(spriteId, x, iconY, 0, 1, 0, 0, 2, 2)
    x += iconSize + iconGap
  }
}

// 7x7 art centered on the line (8x8 sprite, colorkey 8). Vertical: 90° CW + 1 px left.
function stampDividerGem(x: number, y: number, vertical: boolean) {
  spr(SPRITES.ui.dividerGem, x - 3 + (vertical ? -1 : 0), y - 3, 8, 1, 0, vertical ? 1 : 0)
}

// Inclusive endpoints; two gems at center ± gemOffset, empty middle.
function drawDivider(x0: number, y0: number, x1: number, y1: number, gemOffset: number, color: number) {
  const horiz = y0 === y1
  if (horiz === (x0 === x1)) return

  const lo = horiz ? Math.min(x0, x1) : Math.min(y0, y1)
  const hi = horiz ? Math.max(x0, x1) : Math.max(y0, y1)
  const span = hi - lo + 1
  if (span <= 0) return

  const cross = horiz ? y0 : x0
  const center = lo + ((span - 1) >> 1)
  if (horiz) rect(lo, cross, span, 1, color)
  else rect(cross, lo, 1, span, color)

  for (const along of [center - gemOffset, center + gemOffset]) {
    stampDividerGem(horiz ? along : cross, horiz ? cross : along, !horiz)
  }
}

function drawRightPanelDividers() {
  const x = Layout.RIGHT_PANEL_INNER_X
  const x1 = x + Layout.RIGHT_PANEL_INNER_W - 1
  const c = UI.UI_COLOR_RIGHT_PANEL_DIVIDER
  drawDivider(x, Layout.RIGHT_PANEL_TOP_DIVIDER_Y, x1, Layout.RIGHT_PANEL_TOP_DIVIDER_Y, 14, c)
  drawDivider(x, Layout.RIGHT_PANEL_BOTTOM_DIVIDER_Y, x1, Layout.RIGHT_PANEL_BOTTOM_DIVIDER_Y, 14, c)
}

// Vertical stops short of the horizontal T-junction (see UI_LEFT_PANEL_DIVIDER_GAP_PX).
function drawLeftPanelDividers(illX: number, illY: number, illSize: number, horizontalY: number) {
  const verticalX = illX + illSize + Math.floor(UI.UI_LEFT_PANEL_INNER_GAP / 2)
  const verticalH = Math.max(0, horizontalY - illY - UI.UI_LEFT_PANEL_DIVIDER_GAP_PX)
  const c = UI.UI_COLOR_LEFT_PANEL_DIVIDER
  if (verticalH > 0) {
    drawDivider(verticalX, illY, verticalX, illY + verticalH - 1, Math.floor(verticalH / 6.4), c)
  }
  const x = Layout.LEFT_PANEL_INNER_X
  drawDivider(x, horizontalY, x + Layout.LEFT_PANEL_INNER_W - 1, horizontalY, 15, c)
}

const INVENTORY_STATUS_ORDER = ['bronzeKey', 'bloodVial'] as const

function heldStatusIcons(s: State): readonly number[] {
  const out: number[] = []
  for (let i = 0; i < INVENTORY_STATUS_ORDER.length; i++) {
    const id = INVENTORY_STATUS_ORDER[i]!
    if (!s.resources.inventory.includes(id)) continue
    const spriteId = inventorySpriteId(id)
    if (spriteId != null) out.push(spriteId)
  }
  for (let i = 0; i < s.resources.party.length; i++) {
    const spriteId = inventorySpriteId(s.resources.party[i]!)
    if (spriteId != null) out.push(spriteId)
  }
  return out
}

function drawHorizontalBadgePill(
  spriteId: number,
  x: number,
  y: number,
  w: number,
  h: number,
  capPx: number,
  sheetWidthPx: number,
  colorkey: number,
) {
  const wPx = Math.max(0, Math.floor(w))
  const hPx = Math.max(0, Math.floor(h))
  if (wPx === 0 || hPx === 0) return

  const cap = Math.max(1, Math.floor(capPx))
  const sheetW = Math.max(cap * 2, Math.floor(sheetWidthPx))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)

  if (wPx <= cap * 2) {
    clip(x0, y0, wPx, hPx)
    spr(spriteId, x0, y0, colorkey, 1)
    clip()
    return
  }

  clip(x0, y0, cap, hPx)
  spr(spriteId, x0, y0, colorkey, 1)
  clip()

  const rightX = x0 + wPx - cap
  clip(rightX, y0, cap, hPx)
  spr(spriteId, rightX + cap - sheetW, y0, colorkey, 1)
  clip()

  const midX = x0 + cap
  const midW = wPx - cap * 2
  const seamCol = cap - 1
  clip(midX, y0, midW, hPx)
  for (let dx = 0; dx < midW; dx++) {
    spr(spriteId, midX + dx - seamCol, y0, colorkey, 1)
  }
  clip()
}

function drawRightGridOps(ops: RightGridRenderOp[]) {
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!
    if (op.kind === 'rect') rect(op.x, op.y, op.w, op.h, op.color)
    else if (op.kind === 'rectb') rectb(op.x, op.y, op.w, op.h, op.color)
    else if (op.kind === 'print') print(op.text, op.x, op.y, op.color)
    else if (op.kind === 'badgePill') {
      drawHorizontalBadgePill(op.spriteId, op.x, op.y, op.w, op.h, op.capPx, op.sheetWidthPx, op.colorkey)
    }
    else if (op.kind === 'nineSlice') {
      drawNineSliceFrame(op.x, op.y, op.w, op.h, op.topLeftSpriteId, {
        colorkey: op.colorkey,
        fallbackBorderColor: UI.UI_COLOR_GRID_CELL_BORDER,
      })
    }
    else spr(op.spriteId, op.x, op.y, op.colorkey, op.scale, op.flip, op.rotate, op.w, op.h)
  }
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
  // Instead, we temporarily draw the 16x16 sprite to a scratch area and sample it via `pix()`.
  const scratchX = UI.UI_LEFT_PANEL_PADDING
  const scratchY = UI.UI_LEFT_PANEL_PADDING
  spr(k, scratchX, scratchY, -1, 1, 0, 0, 2, 2)

  const out: number[] = []
  for (let py = 0; py < MINIMAP_CELL_PX; py++) {
    for (let px = 0; px < MINIMAP_CELL_PX; px++) {
      // Center-crop: sample the middle 6x6 of the 16x16 sprite.
      const off = ((16 - MINIMAP_CELL_PX) / 2) | 0
      const sx = scratchX + off + px
      const sy = scratchY + off + py
      out.push(pix(sx, sy) as number)
    }
  }

  // Clear scratch (it sits inside the 64x64 block we redraw anyway).
  rect(scratchX, scratchY, 16, 16, UI.UI_COLOR_BG)

  MINIMAP_TILE_CACHE[k] = out
  return out
}

function drawMinimap(s: State) {
  const world = s.world
  const illX = UI.UI_LEFT_PANEL_PADDING
  const illY = UI.UI_LEFT_PANEL_PADDING
  const margin = 2
  const cellPx = MINIMAP_CELL_PX
  const originX = illX + margin
  const originY = illY + margin

  // Prime cache for all sprite ids present so scratch sampling can't corrupt already-drawn minimap pixels.
  const present: Record<number, boolean> = {}
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      present[getSpriteIdAt(world, x, y) | 0] = true
    }
  }
  for (const k in present) getMinimapTilePixels(Number(k))

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const spriteId = getSpriteIdAt(world, x, y)
      const mini = getMinimapTilePixels(spriteId)
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
  rectb(originX + p.x * cellPx, originY + p.y * cellPx, cellPx, cellPx, UI.UI_COLOR_TEXT)
}


