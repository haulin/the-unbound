import { ACTION_TOGGLE_MINIMAP, LOST_COORD_LABEL } from '../../core/constants'
import { foodCarryCap } from '../../core/foodCarry'
import { computeGameMapView } from '../../core/gameMap'
import { torusDelta, wrapIndex } from '../../core/math'
import { getRightGridCellDef, type RightGridCellDef } from '../../core/rightGrid'
import type { CellBadge } from '../../core/mechanics/encounterHelpers'
import {
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  type State,
} from '../../core/types'
import { labelForAction } from './labels'

export type RenderOptions = { blind: boolean }
const DEFAULT_OPTIONS: RenderOptions = { blind: false }

const KEY_GRID = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
] as const

export const ALL_KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function formatA1(pos: { x: number; y: number }): string {
  const col = String.fromCharCode('A'.charCodeAt(0) + pos.x)
  return `${col}${pos.y + 1}`
}

function formatPositionLabel(s: State): string {
  return s.run.knowsPosition ? formatA1(s.player.position) : LOST_COORD_LABEL
}

function tileKindAt(s: State, x: number, y: number): string {
  const tx = wrapIndex(x, s.world.width)
  const ty = wrapIndex(y, s.world.height)
  return s.world.cells[ty]![tx]!.kind
}

function formatBadgeSuffix(badge: CellBadge): string {
  return badge.variant === 'left' ? ` [${badge.text}]` : ` (${badge.text})`
}

function gridLabel(s: State, def: RightGridCellDef): string {
  if (def.action) {
    const label = labelForAction(def.action)
    const suffix = def.badge ? formatBadgeSuffix(def.badge) : ''
    if (def.tilePreview) {
      const dx = def.tilePreview.dx
      const dy = def.tilePreview.dy
      const tile = tileKindAt(s, s.player.position.x + dx, s.player.position.y + dy)
      return `${label} (${tile})${suffix}`
    }
    return `${label}${suffix}`
  }
  return '-'
}

function isHidden(def: RightGridCellDef, opts: RenderOptions): boolean {
  if (!opts.blind) return false
  return def.action?.type === ACTION_TOGGLE_MINIMAP
}

function renderActions(s: State, opts: RenderOptions): string[] {
  const lines: string[] = ['actions:']
  for (let row = 0; row < 3; row++) {
    const cells: string[] = []
    for (let col = 0; col < 3; col++) {
      const key = KEY_GRID[row]![col]!
      const def = getRightGridCellDef(s, row, col)
      const label = isHidden(def, opts) ? '-' : gridLabel(s, def)
      cells.push(`${key}: ${label.padEnd(20)}`)
    }
    lines.push('  ' + cells.join(' '))
  }
  return lines
}

function renderFullMap(s: State): string[] {
  const lines: string[] = ['minimap:']
  const w = s.world.width
  const h = s.world.height
  const px = s.player.position.x
  const py = s.player.position.y
  for (let y = 0; y < h; y++) {
    let row = '  '
    for (let x = 0; x < w; x++) {
      const cell = s.world.cells[y]![x]!
      const isPlayer = x === px && y === py && s.run.knowsPosition
      row += isPlayer ? '@' : kindGlyph(cell.kind)
    }
    lines.push(row)
  }
  return lines
}

const KNOWN_MAP_VIEWPORT = 9

function renderKnownMap(s: State): string[] {
  const lines: string[] = ['map:']
  const { markers } = computeGameMapView(s)
  const w = s.world.width
  const h = s.world.height
  const radius = Math.floor(KNOWN_MAP_VIEWPORT / 2)
  const px = s.player.position.x
  const py = s.player.position.y

  const grid: string[][] = []
  for (let r = 0; r < KNOWN_MAP_VIEWPORT; r++) {
    const row: string[] = []
    for (let c = 0; c < KNOWN_MAP_VIEWPORT; c++) row.push('.')
    grid.push(row)
  }

  for (const m of markers) {
    const dx = torusDelta(px, m.pos.x, w)
    const dy = torusDelta(py, m.pos.y, h)
    if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue
    grid[radius + dy]![radius + dx] = m.label
  }

  grid[radius]![radius] = '@'
  for (let r = 0; r < KNOWN_MAP_VIEWPORT; r++) lines.push('  ' + grid[r]!.join(''))
  return lines
}

function kindGlyph(kind: string): string {
  switch (kind) {
    case 'grass':
      return '.'
    case 'road':
      return '-'
    case 'mountain':
      return '^'
    case 'swamp':
      return '~'
    case 'woods':
      return '#'
    case 'gate':
      return 'G'
    case 'gateOpen':
      return 'g'
    case 'locksmith':
      return 'L'
    case 'lair':
      return 'W'
    case 'signpost':
      return 'S'
    case 'farm':
      return 'F'
    case 'camp':
      return 'C'
    case 'henge':
      return 'H'
    case 'town':
      return 'T'
    case 'fishingLake':
      return 'l'
    case 'rainbowEnd':
      return 'r'
    default:
      return '?'
  }
}

function renderHeader(s: State): string {
  const status = s.run.isGameOver ? ' [GAME OVER]' : s.run.hasWon ? ' [YOU WIN]' : ''
  const pos = formatPositionLabel(s)
  const tileKind = s.world.cells[s.player.position.y]![s.player.position.x]!.kind
  return `step ${s.run.stepCount} | seed ${s.world.seed} | pos ${pos} | tile ${tileKind}${status}`
}

function renderResources(s: State): string {
  const r = s.resources
  const inv = r.inventory.length ? ` | inventory: ${r.inventory.join(', ')}` : ''
  const party = r.party.length ? ` | party: ${r.party.join(', ')}` : ''
  return `army ${r.armySize} | food ${r.food}/${foodCarryCap(r)} | gold ${r.gold}${inv}${party}`
}

function renderEncounter(s: State): string[] {
  if (!s.encounter) return []
  return [`encounter: ${s.encounter.kind}`]
}

function renderMessage(message: string): string[] {
  const trimmed = String(message || '').trim()
  if (!trimmed) return []
  return ['', ...trimmed.split('\n')]
}

export function renderState(s: State, options?: Partial<RenderOptions>): string {
  const opts: RenderOptions = { ...DEFAULT_OPTIONS, ...options }
  const lines: string[] = []
  lines.push('')
  lines.push('='.repeat(40))
  lines.push(renderHeader(s))
  lines.push(renderResources(s))
  lines.push(...renderEncounter(s))
  lines.push(...renderMessage(s.ui.message))

  if (s.ui.leftPanel.kind === LEFT_PANEL_KIND_MINIMAP && !opts.blind) {
    lines.push('')
    lines.push(...renderFullMap(s))
  } else if (s.ui.leftPanel.kind === LEFT_PANEL_KIND_MAP) {
    lines.push('')
    lines.push(...renderKnownMap(s))
  }

  lines.push('')
  lines.push(...renderActions(s, opts))
  lines.push('  q: Quit')
  return lines.join('\n')
}
