import { GAME_MAP_LABEL_BY_KIND, type GameMapLabel, SCOUT_GLOBAL_REVEAL_KINDS } from './constants'
import type { CellKind, State, Vec2 } from './types'

export type GameMapMarker = { pos: Vec2; label: GameMapLabel; isMapped: boolean }

function labelForKind(kind: CellKind): GameMapLabel | null {
  return (GAME_MAP_LABEL_BY_KIND as Partial<Record<CellKind, GameMapLabel>>)[kind] ?? null
}

export function computeGameMapView(s: State): { markers: GameMapMarker[]; showPlayer: boolean } {
  const showPlayer = !!s.run.knowsPosition
  const markers: GameMapMarker[] = []
  const seen = new Set<string>()

  function push(pos: Vec2, label: GameMapLabel, isMapped: boolean) {
    const k = `${label}@${pos.x},${pos.y}`
    if (seen.has(k)) return
    seen.add(k)
    markers.push({ pos, label, isMapped })
  }

  const path = s.run.path ?? []

  // Oriented: show mapped run.path positions.
  if (s.run.knowsPosition) {
    // With scout: global reveal for selected POIs (only when oriented).
    if (s.resources.hasScout) {
      for (let y = 0; y < s.world.height; y++) {
        for (let x = 0; x < s.world.width; x++) {
          const kind = s.world.cells[y]![x]!.kind
          if (!(SCOUT_GLOBAL_REVEAL_KINDS as readonly string[]).includes(kind)) continue
          const label = labelForKind(kind)
          if (label) push({ x, y }, label, true)
        }
      }
    }

    for (let i = 0; i < path.length; i++) {
      const step = path[i]!
      if (!step.isMapped) continue
      const p = step.pos
      const kind = s.world.cells[p.y]![p.x]!.kind
      const label = labelForKind(kind)
      if (!label) continue

      // With scout: keep G/L gated by mappedness, but allow F/C/H to show as well.
      if (s.resources.hasScout && (label === 'G' || label === 'L')) push(p, label, true)
      else if (!s.resources.hasScout) push(p, label, true)
      else if (label === 'F' || label === 'C' || label === 'H') push(p, label, true)
      else if (label === 'T') push(p, label, true)
    }
  } else {
    // Lost: build a local fragment from the lost-buffer segment (even though it's not mapped yet).
    const start = s.run.lostBufferStartIndex ?? path.length
    for (let i = Math.max(0, start); i < path.length; i++) {
      const step = path[i]!
      const p = step.pos
      const kind = s.world.cells[p.y]![p.x]!.kind
      const label = labelForKind(kind)
      if (!label) continue
      push(p, label, step.isMapped)
    }
  }

  return { markers, showPlayer }
}

