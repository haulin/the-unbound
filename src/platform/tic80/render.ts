import {
  ENABLE_ANIMATIONS,
  FOOD_WARNING_THRESHOLD,
  LORE_MAX_CHARS_PER_LINE,
  LOST_COORD_LABEL,
} from '../../core/constants'
import { SPRITES } from '../../core/spriteIds'
import { computeCampPreviewModel } from '../../core/camp'
import { computeGameMapView } from '../../core/gameMap'
import { getSpriteIdAt } from '../../core/world'
import { torusDelta } from '../../core/math'
import {
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  LEFT_PANEL_KIND_SPRITE,
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
      spr(SPRITES.ui8x8.previewGrain, x + ox, y + oy, UI.UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR, 1)
    }
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

  // Tile background: stamp the 8×8 map background sprite (visible area is 6×6), aligned top-left.
  for (let vy = -radius; vy <= radius; vy++) {
    for (let vx = -radius; vx <= radius; vx++) {
      spr(SPRITES.ui8x8.mapBackground, centerX + vx * pitch, centerY + vy * pitch, 0)
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i]!
    const dx = torusDelta(px, m.pos.x, w)
    const dy = torusDelta(py, m.pos.y, h)
    if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue
    print(m.label, centerX + dx * pitch, centerY + dy * pitch, UI.UI_COLOR_POI_DESC)
  }

  // Player marker never disappears on the rolling map.
  // 8×8 outline sprite, inset -1,-1 so it surrounds the full pitch cell.
  spr(SPRITES.ui8x8.mapHereMarker, centerX - 1, centerY - 1, 0)
}

function drawLeftPanel(s: State) {
  rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI.UI_COLOR_BG)
  const frame = s.resources.hasBronzeKey ? SPRITES.ui8x8.panelBorderBronze : SPRITES.ui8x8.panelBorder
  drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, frame, {
    tilePx: 8,
    scale: 1,
    colorkey: 0,
    fallbackBorderColor: UI.UI_COLOR_DIM,
  })

  const isCombat = !!(s.encounter && s.encounter.kind === 'combat')
  const isCamp = !!(s.encounter && s.encounter.kind === 'camp')
  const isTown = !!(s.encounter && s.encounter.kind === 'town')
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
    // Game over: use a fixed tombstone illustration.
    drawIllustrationWithTextureOverlay(SPRITES.cosmetics.tombstoneIllustration, illX, illY)
  } else {
    if (!isCombat && !isCamp && !isTown) {
      drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)
    } else if (isCombat) {
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
      spr(SPRITES.stats.enemy, enemyIconX, enemyIconY, 0, 1, 0, 0, 2, 2)

      const enemyArmy = s.encounter && s.encounter.kind === 'combat' ? (s.encounter.enemyArmySize | 0) : 0
      const enemyCountX = enemyIconX + UI.UI_FOOD_VALUE_OFFSET_X
      const enemyCountY = enemyIconY + UI.UI_FOOD_VALUE_OFFSET_Y
      print(`${enemyArmy}`, enemyCountX, enemyCountY, UI.UI_COLOR_TEXT)

      // Enemy delta overlay near the count.
      if (ENABLE_ANIMATIONS) {
        const anims = s.ui.anim.active
        const frame = s.ui.clock.frame
        let xCursor = enemyIconX + UI.UI_DELTA_OFFSET_X
        for (let i = 0; i < anims.length; i++) {
          const a = anims[i]!
          if (a.kind !== 'delta') continue
          if (a.params.target !== 'enemyArmy') continue
          const start = a.startFrame
          const dur = Math.max(1, a.durationFrames)
          const t = Math.max(0, Math.min(dur, frame - start))
          const p = t / dur
          const delta = a.params.delta
          if (!delta) continue

          const label = delta > 0 ? `+${delta}` : `${delta}`
          const color = delta < 0 ? UI.UI_COLOR_GOOD : UI.UI_COLOR_BAD
          const dy = UI.UI_DELTA_OFFSET_Y - Math.floor(p * UI.UI_DELTA_RISE_PX)
          print(label, xCursor, enemyIconY + dy, color)
          xCursor += label.length * 6 + UI.UI_DELTA_GAP_PX
        }
      }
    } else if (isCamp) {
      // Camp preview: underlying tile + up to three stacked stat lines.
      drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)

      const preview = computeCampPreviewModel(s)
      if (preview) {
        type Line = { spriteId: number; text: string; color: number }
        const lines: Line[] = []
        if (preview.foodGain > 0) {
          lines.push({ spriteId: SPRITES.stats.food, text: `+${preview.foodGain}`, color: UI.UI_COLOR_TEXT })
          lines.push({ spriteId: SPRITES.stats.troop, text: `+${preview.armyGain}`, color: UI.UI_COLOR_TEXT })
        }
        if (preview.scoutFoodCost != null) {
          lines.push({ spriteId: SPRITES.stats.scout, text: `-${preview.scoutFoodCost}`, color: UI.UI_COLOR_TEXT })
        }

        if (lines.length) {
          const platePad = UI.UI_COMBAT_PREVIEW_PLATE_PAD
          const plateW = UI.UI_COMBAT_PREVIEW_PLATE_W
          const plateH = 16 * lines.length + platePad * 2
          const plateX = illX + illSize - plateW - UI.UI_COMBAT_PREVIEW_PLATE_INSET
          const plateY = illY + UI.UI_COMBAT_PREVIEW_PLATE_INSET
          rect(plateX, plateY, plateW, plateH, UI.UI_COLOR_BG)
          rectb(plateX, plateY, plateW, plateH, UI.UI_COLOR_DIM)

          for (let i = 0; i < lines.length; i++) {
            const ln = lines[i]!
            const iconX = plateX + platePad
            const iconY = plateY + platePad + i * 16
            spr(ln.spriteId, iconX, iconY, 0, 1, 0, 0, 2, 2)

            const valueX = iconX + UI.UI_FOOD_VALUE_OFFSET_X
            const valueY = iconY + UI.UI_FOOD_VALUE_OFFSET_Y
            print(ln.text, valueX, valueY, ln.color)
          }
        }
      }
    } else {
      // Town preview: show offer prices.
      drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)

      const here = s.world.cells[pos.y]![pos.x]!
      if (here.kind === 'town') {
        type Line = { spriteId: number; text: string; color: number }
        const lines: Line[] = []
        const offers = here.offers || []
        for (let i = 0; i < offers.length; i++) {
          const o = offers[i]!
          if (o === 'buyFood')
            lines.push({ spriteId: SPRITES.stats.food, text: `-${here.prices.foodGold | 0}`, color: UI.UI_COLOR_TEXT })
          else if (o === 'buyTroops')
            lines.push({ spriteId: SPRITES.stats.troop, text: `-${here.prices.troopsGold | 0}`, color: UI.UI_COLOR_TEXT })
          else if (o === 'hireScout')
            lines.push({ spriteId: SPRITES.stats.scout, text: `-${here.prices.scoutGold | 0}`, color: UI.UI_COLOR_TEXT })
          else if (o === 'buyRumors')
            lines.push({
              spriteId: SPRITES.cosmetics.rumorIllustration,
              text: `-${here.prices.rumorGold | 0}`,
              color: UI.UI_COLOR_TEXT,
            })
        }

        if (lines.length) {
          const platePad = UI.UI_COMBAT_PREVIEW_PLATE_PAD
          const plateW = UI.UI_COMBAT_PREVIEW_PLATE_W
          const plateH = 16 * lines.length + platePad * 2
          const plateX = illX + illSize - plateW - UI.UI_COMBAT_PREVIEW_PLATE_INSET
          const plateY = illY + UI.UI_COMBAT_PREVIEW_PLATE_INSET
          rect(plateX, plateY, plateW, plateH, UI.UI_COLOR_BG)
          rectb(plateX, plateY, plateW, plateH, UI.UI_COLOR_DIM)

          for (let i = 0; i < lines.length; i++) {
            const ln = lines[i]!
            const iconX = plateX + platePad
            const iconY = plateY + platePad + i * 16
            spr(ln.spriteId, iconX, iconY, 0, 1, 0, 0, 2, 2)

            const valueX = iconX + UI.UI_FOOD_VALUE_OFFSET_X
            const valueY = iconY + UI.UI_FOOD_VALUE_OFFSET_Y
            print(ln.text, valueX, valueY, ln.color)
          }
        }
      }
    }
  }

  const statusX = illX + illSize + UI.UI_LEFT_PANEL_INNER_GAP
  const statusY = illY
  const fontH = 6
  const messageLineH = fontH + 1

  // Army gets the hero slot in v0.0.6.
  const armyX = statusX
  const armyY = statusY
  spr(SPRITES.stats.troop, armyX, armyY, -1, 1, 0, 0, 2, 2) // 16×16
  const armyValueX = armyX + UI.UI_ARMY_VALUE_OFFSET_X
  const armyValueY = armyY + UI.UI_ARMY_VALUE_OFFSET_Y
  const armyColor = s.resources.armySize < 6 ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT
  print(`${s.resources.armySize}`, armyValueX, armyValueY, armyColor)

  const foodX = statusX
  const foodY = armyY + UI.UI_ARMY_ICON_H_PX + UI.UI_HERO_RESOURCE_GAP_PX
  spr(SPRITES.stats.food, foodX, foodY, -1, 1, 0, 0, 2, 2) // 16×16
  const foodValueX = foodX + UI.UI_FOOD_VALUE_OFFSET_X
  const foodValueY = foodY + UI.UI_FOOD_VALUE_OFFSET_Y
  const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? UI.UI_COLOR_WARN : UI.UI_COLOR_TEXT
  print(`${s.resources.food}`, foodValueX, foodValueY, foodColor)

  const goldX = statusX
  const goldY = foodY + UI.UI_FOOD_ICON_H_PX + UI.UI_HERO_RESOURCE_GAP_PX
  spr(SPRITES.stats.gold, goldX, goldY, -1, 1, 0, 0, 2, 2) // 16×16
  const goldValueX = goldX + UI.UI_GOLD_VALUE_OFFSET_X
  const goldValueY = goldY + UI.UI_GOLD_VALUE_OFFSET_Y
  print(`${s.resources.gold}`, goldValueX, goldValueY, UI.UI_COLOR_TEXT)

  // Resource delta flashes (non-blocking).
  {
    const anims = s.ui.anim.active
    const frame = s.ui.clock.frame
    const bases = {
      army: { x: armyX, y: armyY },
      food: { x: foodX, y: foodY },
      gold: { x: goldX, y: goldY },
    } as const

    const cursorByTarget: Record<'army' | 'food' | 'gold', number> = {
      army: bases.army.x + UI.UI_DELTA_OFFSET_X,
      food: bases.food.x + UI.UI_DELTA_OFFSET_X,
      gold: bases.gold.x + UI.UI_DELTA_OFFSET_X,
    }

    const draw = (target: 'army' | 'food' | 'gold', delta: number, startFrame: number, durationFrames: number) => {
      if (!delta) return
      const base = bases[target]
      const dur = Math.max(1, durationFrames)
      const t = Math.max(0, Math.min(dur, frame - startFrame))
      const p = t / dur

      const label = delta > 0 ? `+${delta}` : `${delta}`
      const color = delta > 0 ? UI.UI_COLOR_GOOD : UI.UI_COLOR_BAD
      const dy = UI.UI_DELTA_OFFSET_Y - Math.floor(p * UI.UI_DELTA_RISE_PX)

      // Anchor over the icon, and stack horizontally so +N stays readable.
      const xCursor = cursorByTarget[target]
      print(label, xCursor, base.y + dy, color)
      cursorByTarget[target] = xCursor + label.length * 6 + UI.UI_DELTA_GAP_PX
    }

    for (let i = 0; i < anims.length; i++) {
      const a = anims[i]!
      if (a.kind !== 'delta') continue
      if (a.params.target === 'enemyArmy') continue
      draw(a.params.target, a.params.delta, a.startFrame, a.durationFrames)
    }
  }

  const statusBottomY = goldY + UI.UI_GOLD_ICON_H_PX + UI.UI_AFTER_RESOURCES_GAP_PX
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
  drawRightTopBar(s)
}

function drawRightTopBar(s: State) {
  const x0 = Layout.GRID_ORIGIN_X
  const y0 = 0
  const w = Layout.GRID_WIDTH_PX
  const h = Layout.RIGHT_PANEL_HEADER_H

  rect(x0, y0, w, h, UI.UI_COLOR_BG)
  rectb(x0, y0, w, h, UI.UI_COLOR_DIM)

  const padX = 2
  const iconY = y0 + 2
  const valueY = y0 + 11

  // Right → left status icons inside the bar.
  const iconGap = 2
  let rightInset = 0
  if (s.resources.hasBronzeKey) rightInset += 16 + iconGap
  if (s.resources.hasScout) rightInset += 16 + iconGap
  if (rightInset) rightInset -= iconGap

  const statsMaxX = x0 + w - padX - rightInset

  const itemW = 18 // 3 chars @ 6px, right-aligned
  const itemGap = 2
  const valueMaxChars = 3

  const formatValue = (raw: string) => {
    const s = String(raw || '')
    if (s.length <= valueMaxChars) return s
    return s.slice(-valueMaxChars)
  }

  const drawStatItem = (idx: number, iconSpriteId: number, rawValue: string) => {
    const xItem = x0 + padX + idx * (itemW + itemGap)
    if (xItem + itemW > statsMaxX) return

    const value = formatValue(rawValue)
    const valueW = value.length * 6
    const xRight = xItem + itemW
    const valueX = xRight - valueW
    const iconX = xRight - UI.UI_STATUS_ICON_SIZE

    spr(iconSpriteId, iconX, iconY, -1)
    print(value, valueX, valueY, UI.UI_COLOR_TEXT)
  }

  drawStatItem(0, SPRITES.smallStats8x8.seed, `${s.world.seed}`)
  drawStatItem(1, SPRITES.smallStats8x8.position, formatPositionLabel(s))
  drawStatItem(2, SPRITES.smallStats8x8.steps, `${s.run.stepCount}`)

  // Right → left status icons inside the bar.
  let xr = x0 + w - padX - 16
  const bigIconY = y0 + 1
  if (s.resources.hasBronzeKey) {
    spr(SPRITES.stats.key, xr, bigIconY, 0, 1, 0, 0, 2, 2)
    xr -= 16 + 2
  }
  if (s.resources.hasScout) {
    spr(SPRITES.stats.scout, xr, bigIconY, 0, 1, 0, 0, 2, 2)
    xr -= 16 + 2
  }
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


