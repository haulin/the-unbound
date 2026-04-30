import {
  ARMY_SPRITE_ID,
  ENABLE_ANIMATIONS,
  FOOD_SPRITE_ID,
  FOOD_WARNING_THRESHOLD,
  LORE_MAX_CHARS_PER_LINE,
  LOST_COORD_LABEL,
} from '../../core/constants'
import { getSpriteIdAt } from '../../core/world'
import {
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
  type ArmyDeltaAnim,
  type EnemyArmyDeltaAnim,
  type FoodDeltaAnim,
  type State,
} from '../../core/types'
import {
  PANEL_LEFT_WIDTH,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from './layout'
import * as UI from './uiConstants'
import type { RenderHints } from './input'
import { drawNineSliceFrame, type NineSlice3x3 } from './nineSlice'
import { buildRightGridRenderPlan, type RightGridRenderOp } from './rightGridRenderPlan'

const SPR_HUD_FRAME: NineSlice3x3 = {
  tl: 146,
  t: 147,
  tr: 148,
  l: 162,
  c: 163,
  r: 164,
  bl: 178,
  b: 179,
  br: 180,
}

const SPR_HUD_FRAME_BRONZE: NineSlice3x3 = {
  tl: 149,
  t: 150,
  tr: 151,
  l: 165,
  c: 166,
  r: 167,
  bl: 181,
  b: 182,
  br: 183,
}

export function renderFrame(s: State, hints: RenderHints) {
  cls(UI.UI_COLOR_BG)
  drawRightPanel(s, hints)
  // Draw left panel last so it masks any right-panel animation overflow into x < PANEL_LEFT_WIDTH.
  drawLeftPanel(s)

  // Global status icons (top-right of whole screen).
  if (s.resources.hasBronzeKey) {
    const margin = 2
    spr(106, SCREEN_WIDTH - 16 - margin, margin, 0, 1, 0, 0, 2, 2)
  }
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
  // Texture overlay: tile an 8×8 sprite over the 64×64 illustration.
  // Key off a non-black color so the grain can use black safely.
  const illPx = 16 * UI.UI_ILLUSTRATION_SCALE
  for (let oy = 0; oy < illPx; oy += UI.UI_TEXTURE_TILE_PX) {
    for (let ox = 0; ox < illPx; ox += UI.UI_TEXTURE_TILE_PX) {
      spr(UI.UI_SPR_TEXTURE_OVERLAY, x + ox, y + oy, UI.UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR, 1)
    }
  }
}

function drawLeftPanel(s: State) {
  rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI.UI_COLOR_BG)
  const frame = s.resources.hasBronzeKey ? SPR_HUD_FRAME_BRONZE : SPR_HUD_FRAME
  drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, frame, {
    tilePx: 8,
    scale: 1,
    colorkey: 0,
    fallbackBorderColor: UI.UI_COLOR_DIM,
  })

  const isCombat = !!(s.encounter && s.encounter.kind === 'combat')
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
  } else if (leftPanel.kind === LEFT_PANEL_KIND_SPRITE) {
    drawIllustrationWithTextureOverlay(leftPanel.spriteId, illX, illY)
  } else if (s.run.isGameOver) {
    // Game over: use a fixed tombstone illustration.
    drawIllustrationWithTextureOverlay(40, illX, illY)
  } else {
    if (!isCombat) {
      drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)
    } else {
      // Combat preview: use the 64×64 illustration space as a composite.
      // - Render the underlying tile as a full 64×64 preview.
      // - Overlay a small "enemy stats" plate on top (filled + bordered),
      //   using the same icon/value/delta layout constants as the player stats.
      drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)

      const platePad = UI.UI_COMBAT_PREVIEW_PLATE_PAD
      const plateW = UI.UI_COMBAT_PREVIEW_PLATE_W
      const plateH = 16 + platePad * 2
      const plateX = illX + illSize - plateW - UI.UI_COMBAT_PREVIEW_PLATE_INSET
      const plateY = illY + UI.UI_COMBAT_PREVIEW_PLATE_INSET
      rect(plateX, plateY, plateW, plateH, UI.UI_COLOR_BG)
      rectb(plateX, plateY, plateW, plateH, UI.UI_COLOR_DIM)

      const enemyIconX = plateX + platePad
      const enemyIconY = plateY + platePad
      // Use color 0 as transparent for UI-like overlay sprites.
      spr(UI.UI_SPR_ENEMY, enemyIconX, enemyIconY, 0, 1, 0, 0, 2, 2)

      const enemyArmy = s.encounter && s.encounter.kind === 'combat' ? (s.encounter.enemyArmySize | 0) : 0
      const enemyCountX = enemyIconX + UI.UI_FOOD_VALUE_OFFSET_X
      const enemyCountY = enemyIconY + UI.UI_FOOD_VALUE_OFFSET_Y
      print(`${enemyArmy}`, enemyCountX, enemyCountY, UI.UI_COLOR_TEXT)

      // Enemy delta overlay near the count.
      if (ENABLE_ANIMATIONS) {
        const anims = s.ui.anim.active
        const frame = s.ui.clock.frame | 0
        let xCursor = enemyIconX + UI.UI_FOOD_DELTA_OFFSET_X
        for (let i = 0; i < anims.length; i++) {
          const a = anims[i]!
          if (a.kind !== 'enemyArmyDelta') continue
          const ea = a as EnemyArmyDeltaAnim
          const start = ea.startFrame | 0
          const dur = Math.max(1, ea.durationFrames | 0)
          const t = Math.max(0, Math.min(dur, frame - start))
          const p = t / dur
          const delta = ea.params.delta | 0
          if (!delta) continue

          const label = delta > 0 ? `+${delta}` : `${delta}`
          const color = delta < 0 ? UI.UI_COLOR_GOOD : UI.UI_COLOR_BAD
          const dy = UI.UI_FOOD_DELTA_OFFSET_Y - Math.floor(p * UI.UI_FOOD_DELTA_RISE_PX)
          print(label, xCursor, enemyIconY + dy, color)
          xCursor += label.length * 6 + UI.UI_FOOD_DELTA_GAP_PX
        }
      }
    }
  }

  const statusX = illX + illSize + UI.UI_LEFT_PANEL_INNER_GAP
  const statusY = illY
  const statusIconSize = UI.UI_STATUS_ICON_SIZE
  const statusIconGap = UI.UI_STATUS_ICON_GAP
  const fontH = 6
  const statusLineGap = UI.UI_STATUS_LINE_GAP
  const statusLineH = fontH + statusLineGap
  const messageLineH = fontH + 1
  const textOffsetY = UI.UI_STATUS_TEXT_OFFSET_Y

  // Army gets the hero slot in v0.0.6.
  const armyX = statusX
  const armyY = statusY
  spr(ARMY_SPRITE_ID, armyX, armyY, -1, 1, 0, 0, 2, 2) // 16×16
  const armyValueX = armyX + UI.UI_ARMY_VALUE_OFFSET_X
  const armyValueY = armyY + UI.UI_ARMY_VALUE_OFFSET_Y
  const armyColor = s.resources.armySize < 6 ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT
  print(`${s.resources.armySize}`, armyValueX, armyValueY, armyColor)

  const foodX = statusX
  const foodY = armyY + UI.UI_ARMY_ICON_H_PX + UI.UI_HERO_RESOURCE_GAP_PX
  spr(FOOD_SPRITE_ID, foodX, foodY, -1, 1, 0, 0, 2, 2) // 16×16
  const foodValueX = foodX + UI.UI_FOOD_VALUE_OFFSET_X
  const foodValueY = foodY + UI.UI_FOOD_VALUE_OFFSET_Y
  const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT
  print(`${s.resources.food}`, foodValueX, foodValueY, foodColor)

  const smallStartY = statusY + UI.UI_SMALL_STATS_START_OFFSET_Y
  const seedY = smallStartY + 0 * statusLineH
  const posY = smallStartY + 1 * statusLineH
  const stepsY = smallStartY + 2 * statusLineH

  // Seed (least important, but still useful)
  spr(UI.UI_SPR_STATUS_SEED, statusX, seedY, -1)
  print(`${s.world.seed}`, statusX + statusIconSize + statusIconGap, seedY + textOffsetY, UI.UI_COLOR_TEXT)

  // Position (arguably important, keep it)
  spr(UI.UI_SPR_STATUS_POS, statusX, posY, -1)
  print(formatPositionLabel(s), statusX + statusIconSize + statusIconGap, posY + textOffsetY, UI.UI_COLOR_TEXT)

  // Steps
  spr(UI.UI_SPR_STATUS_STEPS, statusX, stepsY, -1)
  print(`${s.run.stepCount}`, statusX + statusIconSize + statusIconGap, stepsY + textOffsetY, UI.UI_COLOR_TEXT)

  // Army delta flashes (non-blocking)
  {
    const anims = s.ui.anim.active
    const frame = s.ui.clock.frame | 0
    let xCursor = armyX + UI.UI_ARMY_DELTA_OFFSET_X
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i]!
      if (a.kind !== 'armyDelta') continue
      const aa = a as ArmyDeltaAnim
      const start = aa.startFrame | 0
      const dur = Math.max(1, aa.durationFrames | 0)
      const t = Math.max(0, Math.min(dur, frame - start))
      const p = t / dur
      const delta = aa.params.delta | 0
      if (!delta) continue

      const label = delta > 0 ? `+${delta}` : `${delta}`
      const color = delta > 0 ? UI.UI_COLOR_GOOD : UI.UI_COLOR_BAD
      const dy = UI.UI_ARMY_DELTA_OFFSET_Y - Math.floor(p * UI.UI_ARMY_DELTA_RISE_PX)
      print(label, xCursor, armyY + dy, color)
      xCursor += label.length * 6 + UI.UI_ARMY_DELTA_GAP_PX
    }
  }

  // Food delta flashes (non-blocking)
  {
    const anims = s.ui.anim.active
    const frame = s.ui.clock.frame | 0
    let xCursor = foodX + UI.UI_FOOD_DELTA_OFFSET_X
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
      const color = delta > 0 ? UI.UI_COLOR_GOOD : UI.UI_COLOR_BAD

      // Anchor over the icon, and stack horizontally so +N stays readable.
      const dy = UI.UI_FOOD_DELTA_OFFSET_Y - Math.floor(p * UI.UI_FOOD_DELTA_RISE_PX)
      print(label, xCursor, foodY + dy, color)
      xCursor += label.length * 6 + UI.UI_FOOD_DELTA_GAP_PX
    }
  }

  const statusBottomY = stepsY + statusLineH
  const headerBottomY = Math.max(illY + illSize, statusBottomY)
  const msgY = headerBottomY + 4
  const headline = s.run.isGameOver
    ? ({ text: 'GAME OVER', color: UI.UI_COLOR_BAD } as const)
    : s.run.hasWon
      ? ({ text: 'YOU WIN', color: UI.UI_COLOR_GOOD } as const)
      : null
  const headlineRows = headline ? 1 : 0
  const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH) - headlineRows)
  const lore = loreLinesForMessage(s.ui.message, LORE_MAX_CHARS_PER_LINE)
  const textStartY = headline ? msgY + messageLineH : msgY
  if (headline) print(headline.text, UI.UI_LEFT_PANEL_PADDING, msgY, headline.color)
  let printed = 0
  for (let i = 0; i < lore.length && printed < maxLines; i++) {
    const line = lore[i]!
    print(line.text, UI.UI_LEFT_PANEL_PADDING, textStartY + printed * messageLineH, line.color)
    printed++
  }
}

// ----------------------------
// Right panel
// ----------------------------
function drawRightPanel(s: State, hints: RenderHints) {
  const plan = buildRightGridRenderPlan(s, hints)
  drawRightGridOps(plan.ops)
}

function drawRightGridOps(ops: RightGridRenderOp[]) {
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!
    if (op.kind === 'rect') rect(op.x, op.y, op.w, op.h, op.color)
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
  // Instead, we temporarily draw the 16×16 sprite to a scratch area and sample it via `pix()`.
  const scratchX = UI.UI_LEFT_PANEL_PADDING
  const scratchY = UI.UI_LEFT_PANEL_PADDING
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


