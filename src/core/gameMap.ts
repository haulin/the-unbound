import { SCOUT_GLOBAL_REVEAL_KINDS } from './constants'
import { MECHANIC_INDEX } from './mechanics'
import type { State, Vec2 } from './types'

export type GameMapMarker = { pos: Vec2; label: string; isMapped: boolean }


export function computeGameMapView(s: State): { markers: GameMapMarker[]; showPlayer: boolean } {
  const { mapLabelByKind } = MECHANIC_INDEX
  const showPlayer = !!s.run.knowsPosition
  const markers: GameMapMarker[] = []
  const seen = new Set<string>()

  function push(pos: Vec2, label: string, isMapped: boolean) {
    const k = `${label}@${pos.x},${pos.y}`
    if (seen.has(k)) return
    seen.add(k)
    markers.push({ pos, label, isMapped })
  }

  type Candidate = { pos: Vec2; isMapped: boolean }
  const candidates: Candidate[] = []

  const path = s.run.path ?? []

  if (s.run.knowsPosition) {
    // Oriented:
    // - Scout adds global reveal for select POIs (F/C/H/T).
    // - Path contributes only committed (mapped) positions.
    if (s.resources.hasScout) {
      for (let y = 0; y < s.world.height; y++) {
        for (let x = 0; x < s.world.width; x++) {
          const kind = s.world.cells[y]![x]!.kind
          if (!SCOUT_GLOBAL_REVEAL_KINDS.includes(kind)) continue
          candidates.push({ pos: { x, y }, isMapped: true })
        }
      }
    }

    for (let i = 0; i < path.length; i++) {
      const step = path[i]!
      if (!step.isMapped) continue
      candidates.push({ pos: step.pos, isMapped: true })
    }
  } else {
    // Lost: show landmarks encountered since lostBufferStartIndex, even if unmapped.
    const start = s.run.lostBufferStartIndex ?? path.length
    for (let i = Math.max(0, start); i < path.length; i++) {
      const step = path[i]!
      candidates.push({ pos: step.pos, isMapped: step.isMapped })
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!
    const kind = s.world.cells[c.pos.y]![c.pos.x]!.kind
    const label = mapLabelByKind[kind]
    if (!label) continue
    push(c.pos, label, c.isMapped)
  }

  return { markers, showPlayer }
}

