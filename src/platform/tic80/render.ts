import {
  ENABLE_ANIMATIONS,
  FOOD_WARNING_THRESHOLD,
  LORE_MAX_CHARS_PER_LINE,
  LOST_COORD_LABEL,
} from '../../core/constants'
import { SPRITES } from '../../core/spriteIds'
import { MECHANIC_INDEX } from '../../core/mechanics'
import type { PreviewPlateLine, PreviewPlateDeltaAnchor } from '../../core/mechanics/types'
import { computeGameMapView } from '../../core/gameMap'
import { getSpriteIdAt } from '../../core/cells'
import { torusDelta } from '../../core/math'
import {
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
  type DeltaAnimTarget,
  type State,
} from '../../core/types'
import { PANEL_LEFT_WIDTH, SCREEN_HEIGHT } from './layout'
import * as Layout from './layout'
import * as UI from './uiConstants'
import type { RenderHints } from './input'
import { drawNineSliceFrame } from './nineSlice'
import { buildRightGridRenderPlan, type RightGridRenderOp } from './rightGridRenderPlan'

export function renderFrame(s: State, hints: RenderHints) {
  cls(UI.UI_COLOR_BG)
  drawRightPanel(s, hints)
  // Draw left panel last so it masks any right-panel animation overflow into x < PANEL_LEFT_WIDTH.
  drawLeftPanel(s)
}

// ----------------------------
// Rendering constants (TIC-80)
// ----------------------------
// Most tunables live in `uiConstants.ts`; these two are font geometry that
// every text-positioning helper in this file needs.
const FONT_CHAR_PX = 6

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

// Generic preview-plate chrome shared by all encounter previews. Returns the
// first-line icon origin so animated overlays (combat enemy delta) can anchor
// to the plate without re-deriving its geometry.
type PlateGeometry = { firstIconX: number; firstIconY: number }

function drawPreviewPlateChrome(
  lines: readonly PreviewPlateLine[],
  illX: number,
  illY: number,
  illSize: number,
): PlateGeometry {
  const platePad = UI.UI_PREVIEW_PLATE_PAD
  const plateW = UI.UI_PREVIEW_PLATE_W
  const plateH = 16 * lines.length + platePad * 2
  const plateX = illX + illSize - plateW - UI.UI_PREVIEW_PLATE_INSET
  const plateY = illY + UI.UI_PREVIEW_PLATE_INSET
  rect(plateX, plateY, plateW, plateH, UI.UI_COLOR_BG)
  rectb(plateX, plateY, plateW, plateH, UI.UI_COLOR_DIM)

  const firstIconX = plateX + platePad
  const firstIconY = plateY + platePad
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]!
    const iconX = firstIconX
    const iconY = firstIconY + i * 16
    spr(ln.spriteId, iconX, iconY, 0, 1, 0, 0, 2, 2)

    const valueX = iconX + UI.UI_ICON_VALUE_OFFSET_X
    const valueY = iconY + UI.UI_ICON_VALUE_OFFSET_Y
    print(ln.text, valueX, valueY, UI.UI_COLOR_TEXT)
  }

  return { firstIconX, firstIconY }
}

type DeltaAnchor = {
  x: number
  y: number
  // Sign of `delta` that counts as "good" for the player. Default +1 (positive
  // deltas = green); enemyArmy passes -1 because the enemy losing troops is
  // good for the player.
  goodSign?: 1 | -1
}

// Resolve mechanic-supplied plate anchor specs (lineIndex + goodSign) to
// pixel-space anchors using the plate geometry returned by
// `drawPreviewPlateChrome`. Mechanics never deal in pixels.
function plateAnchorsFromSpecs(
  specs: readonly PreviewPlateDeltaAnchor[],
  geom: PlateGeometry,
): Partial<Record<DeltaAnimTarget, DeltaAnchor>> {
  const anchors: Partial<Record<DeltaAnimTarget, DeltaAnchor>> = {}
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!
    const anchor: DeltaAnchor = {
      x: geom.firstIconX,
      y: geom.firstIconY + spec.lineIndex * 16,
    }
    if (spec.goodSign != null) anchor.goodSign = spec.goodSign
    anchors[spec.target] = anchor
  }
  return anchors
}

// Animated +/- delta overlays. One shared pass for every delta animation —
// callers wire up which targets to draw and where each one anchors.
function drawDeltaOverlays(s: State, anchors: Partial<Record<DeltaAnimTarget, DeltaAnchor>>) {
  if (!ENABLE_ANIMATIONS) return
  const anims = s.ui.anim.active
  const frame = s.ui.clock.frame
  const cursorByTarget: Partial<Record<DeltaAnimTarget, number>> = {}

  for (let i = 0; i < anims.length; i++) {
    const a = anims[i]!
    if (a.kind !== 'delta') continue
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

function drawMap(s: State, x: number, y: number, sizePx: number) {
  const { markers } = computeGameMapView(s)
  const w = Math.max(1, s.world.width)
  const h = Math.max(1, s.world.height)

  const viewport = Math.max(1, UI.UI_MAP_VIEWPORT_CELLS)
  const pitch = Math.max(1, UI.UI_MAP_CELL_PITCH_PX)
  const radius = Math.floor(viewport / 2)
  const gridX = x + Math.floor((sizePx - pitch * viewport) / 2)
  const gridY = y + Math.floor((sizePx - pitch * viewport) / 2)
  const centerX = gridX + radius * pitch
  const centerY = gridY + radius * pitch

  const px = s.player.position.x
  const py = s.player.position.y

  // Tile background: stamp the 8x8 map background sprite (visible area is 6x6), aligned top-left.
  for (let vy = -radius; vy <= radius; vy++) {
    for (let vx = -radius; vx <= radius; vx++) {
      spr(SPRITES.ui.mapBackground, centerX + vx * pitch, centerY + vy * pitch, 0)
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i]!
    const dx = torusDelta(px, m.pos.x, w)
    const dy = torusDelta(py, m.pos.y, h)
    if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue
    const color = m.isMapped ? UI.UI_MAP_POI_TEXT_COLOR : UI.UI_MAP_POI_UNCOMMITTED_TEXT_COLOR
    print(m.label, centerX + dx * pitch + UI.UI_MAP_POI_TEXT_OFFSET_X_PX, centerY + dy * pitch, color)
  }

  // Player marker never disappears on the rolling map.
  // 8x8 outline sprite, inset -1,-1 so it surrounds the full pitch cell.
  spr(SPRITES.ui.mapHereMarker, centerX - 1, centerY - 1, 0)
}

// Visual reward escalation: bronze > blood > default. Ordered so the chrome
// always reflects the most-recent advance even if both tokens are held.
function panelFrameTopLeftFor(s: State): number {
  const inv = s.resources.inventory
  if (inv.includes('bronzeKey')) return SPRITES.ui.panelBorderBronze
  if (inv.includes('blood')) return SPRITES.ui.panelBorderBlood
  return SPRITES.ui.panelBorder
}

function drawLeftPanel(s: State) {
  rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI.UI_COLOR_BG)
  drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, panelFrameTopLeftFor(s), {
    fallbackBorderColor: UI.UI_COLOR_DIM,
  })

  const encounterKind = s.encounter?.kind ?? null
  const pos = s.player.position
  const spriteIdAtPos = getSpriteIdAt(s.world, pos.x, pos.y)
  const leftPanel = s.ui.leftPanel

  const illSize = 16 * UI.UI_ILLUSTRATION_SCALE
  const illX = UI.UI_LEFT_PANEL_PADDING
  const illY = UI.UI_LEFT_PANEL_PADDING
  // User-driven panel toggles (minimap, goal-sprite focus) win over the AUTO-mode
  // defaults (tombstone on game over, combat plate during combat, tile preview otherwise).
  if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
    drawMinimap(s)
  } else if (leftPanel.kind === LEFT_PANEL_KIND_MAP) {
    drawMap(s, illX, illY, illSize)
  } else if (leftPanel.kind === LEFT_PANEL_KIND_SPRITE) {
    drawIllustrationWithTextureOverlay(leftPanel.spriteId, illX, illY)
  } else if (s.run.isGameOver) {
    drawIllustrationWithTextureOverlay(SPRITES.centers.tombstone, illX, illY)
  } else {
    drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)

    if (encounterKind) {
      const provider = MECHANIC_INDEX.previewPlateByEncounterKind[encounterKind]
      const lines = provider?.(s) ?? null
      if (lines && lines.length) {
        const geom = drawPreviewPlateChrome(lines, illX, illY, illSize)
        const anchorSpecs = MECHANIC_INDEX.previewPlateDeltaAnchorsByEncounterKind[encounterKind]
        if (anchorSpecs && anchorSpecs.length) {
          drawDeltaOverlays(s, plateAnchorsFromSpecs(anchorSpecs, geom))
        }
      }
    }
  }

  const statusX = illX + illSize + UI.UI_LEFT_PANEL_INNER_GAP
  const fontH = 6
  const messageLineH = fontH + 1

  // Header band runs from illustration top to horizontal divider; stats column
  // is shorter than the illustration so we center it inside the band.
  const headerBandBottomY = illY + illSize
  const horizontalDividerY =
    headerBandBottomY + Math.floor((UI.UI_LEFT_PANEL_LORE_TOP_GAP - 1) / 2)
  const statusBlockH = 3 * UI.UI_ARMY_ICON_H_PX + 2 * UI.UI_HERO_RESOURCE_GAP_PX
  const statusCenteredY = illY + Math.ceil(((horizontalDividerY - illY) - statusBlockH) / 2)
  const statusY = Math.max(illY, statusCenteredY - UI.UI_LEFT_PANEL_STATS_OPTICAL_LIFT_PX)

  const armyX = statusX
  const armyY = statusY
  spr(SPRITES.inventory.troop, armyX, armyY, -1, 1, 0, 0, 2, 2)
  const armyValueX = armyX + UI.UI_ARMY_VALUE_OFFSET_X
  const armyValueY = armyY + UI.UI_ARMY_VALUE_OFFSET_Y
  const armyColor = s.resources.armySize < 6 ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT
  print(`${s.resources.armySize}`, armyValueX, armyValueY, armyColor)

  const foodX = statusX
  const foodY = armyY + UI.UI_ARMY_ICON_H_PX + UI.UI_HERO_RESOURCE_GAP_PX
  spr(SPRITES.inventory.food, foodX, foodY, -1, 1, 0, 0, 2, 2)
  const foodValueX = foodX + UI.UI_ICON_VALUE_OFFSET_X
  const foodValueY = foodY + UI.UI_ICON_VALUE_OFFSET_Y
  const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT
  print(`${s.resources.food}`, foodValueX, foodValueY, foodColor)

  const goldX = statusX
  const goldY = foodY + UI.UI_FOOD_ICON_H_PX + UI.UI_HERO_RESOURCE_GAP_PX
  spr(SPRITES.inventory.gold, goldX, goldY, -1, 1, 0, 0, 2, 2)
  const goldValueX = goldX + UI.UI_GOLD_VALUE_OFFSET_X
  const goldValueY = goldY + UI.UI_GOLD_VALUE_OFFSET_Y
  print(`${s.resources.gold}`, goldValueX, goldValueY, UI.UI_COLOR_TEXT)

  drawDeltaOverlays(s, {
    army: { x: armyX, y: armyY },
    food: { x: foodX, y: foodY },
    gold: { x: goldX, y: goldY },
  })

  const statusBottomY = goldY + UI.UI_GOLD_ICON_H_PX + UI.UI_AFTER_RESOURCES_GAP_PX
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
function drawRightPanel(s: State, hints: RenderHints) {
  const plan = buildRightGridRenderPlan(s, hints)
  drawRightGridOps(plan.ops)
  drawRightStatsBand(s)
  drawRightHeldBand(s)
  drawRightPanelDividers()
  drawRightPanelFrame(s)
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
  const iconY = bandY + Math.floor((Layout.RIGHT_PANEL_TOP_BAND_H - iconSize) / 2)
  const textY = bandY + Math.floor((Layout.RIGHT_PANEL_TOP_BAND_H - FONT_CHAR_PX) / 2)
  let x = Layout.RIGHT_PANEL_INNER_X + Math.floor((Layout.RIGHT_PANEL_INNER_W - contentW) / 2)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    spr(item.iconSpriteId, x, iconY, -1)
    x += iconSize + iconValueGap
    print(item.value, x, textY, UI.UI_COLOR_TEXT)
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

function drawRightPanelDividers() {
  rect(Layout.RIGHT_PANEL_INNER_X, Layout.RIGHT_PANEL_TOP_DIVIDER_Y, Layout.RIGHT_PANEL_INNER_W, 1, UI.UI_COLOR_RIGHT_PANEL_DIVIDER)
  rect(Layout.RIGHT_PANEL_INNER_X, Layout.RIGHT_PANEL_BOTTOM_DIVIDER_Y, Layout.RIGHT_PANEL_INNER_W, 1, UI.UI_COLOR_RIGHT_PANEL_DIVIDER)
}

// Left-panel chrome dividers. Vertical stops short of the horizontal so the
// negative space matches the inset the horizontal keeps from the frame.
function drawLeftPanelDividers(illX: number, illY: number, illSize: number, horizontalY: number) {
  const verticalX = illX + illSize + Math.floor(UI.UI_LEFT_PANEL_INNER_GAP / 2)
  const verticalH = Math.max(0, horizontalY - illY - UI.UI_LEFT_PANEL_DIVIDER_GAP_PX)
  rect(verticalX, illY, 1, verticalH, UI.UI_COLOR_LEFT_PANEL_DIVIDER)
  rect(Layout.LEFT_PANEL_INNER_X, horizontalY, Layout.LEFT_PANEL_INNER_W, 1, UI.UI_COLOR_LEFT_PANEL_DIVIDER)
}

// Status-bar icon manifest: display order, predicate, sprite. Adding a new
// held thing (e.g. silver key) is one row.
type StatusIconSlot = { collection: 'inventory' | 'party'; id: string; spriteId: number }
const STATUS_ICON_SLOTS: readonly StatusIconSlot[] = [
  { collection: 'inventory', id: 'bronzeKey', spriteId: SPRITES.inventory.bronzeKey },
  { collection: 'inventory', id: 'blood', spriteId: SPRITES.inventory.bloodVial },
  { collection: 'party', id: 'scout', spriteId: SPRITES.inventory.scout },
  { collection: 'party', id: 'mule', spriteId: SPRITES.inventory.beast },
]

function heldStatusIcons(s: State): readonly number[] {
  const out: number[] = []
  for (const slot of STATUS_ICON_SLOTS) {
    if (s.resources[slot.collection].includes(slot.id)) out.push(slot.spriteId)
  }
  return out
}

function drawRightGridOps(ops: RightGridRenderOp[]) {
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!
    if (op.kind === 'rect') rect(op.x, op.y, op.w, op.h, op.color)
    else if (op.kind === 'rectb') rectb(op.x, op.y, op.w, op.h, op.color)
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


