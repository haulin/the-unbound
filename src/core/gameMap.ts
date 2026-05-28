import { SCOUT_GLOBAL_REVEAL_KINDS } from './constants'
import { MECHANIC_INDEX } from './mechanics'
import type { RunPathStep, State, Vec2 } from './types'

export type GameMapMarker = { pos: Vec2; label: string; isMapped: boolean }

// Updates the run-path "memory" after a move. The path is an append-only log
// of visited cells; each step also carries an `isMapped` bit that flips to
// true once the player has *committed* knowledge of that step's position (i.e.
// they are no longer lost about it).
//
// Three semantics layered here:
//   1. A move always appends the new position, initially unmapped.
//   2. While lost (knowsPosition === false), we mark a buffer of "unmapped
//      tail" — these steps' positions are tentative and shouldn't be committed
//      to the map yet.
//   3. When the player relocates (knowsPosition becomes true), the entire
//      lost-buffer tail is committed retroactively. Outside a lost-buffer, a
//      regular known-position move just marks the new step.
//
// Teleports always *start* a new lost buffer at the landing position — the
// player loses orientation at the destination regardless of whether they knew
// where they were before.
export function updateRunPathMemoryAfterMove(args: {
  prevPath: RunPathStep[] | null | undefined
  prevLostBufferStartIndex: number | null | undefined
  nextPos: Vec2
  nextKnowsPosition: boolean
  teleported: boolean
}): { path: RunPathStep[]; lostBufferStartIndex: number | null } {
  const prevPath = args.prevPath ?? []
  let path = prevPath.concat([{ pos: args.nextPos, isMapped: false }])
  let lostBufferStartIndex = args.prevLostBufferStartIndex ?? null

  if (args.teleported) {
    lostBufferStartIndex = path.length - 1
  }

  if (!args.nextKnowsPosition && lostBufferStartIndex == null) {
    lostBufferStartIndex = path.length - 1
  }

  if (args.nextKnowsPosition) {
    if (lostBufferStartIndex != null) {
      const start = Math.max(0, Math.min(lostBufferStartIndex, path.length - 1))
      const mapped = path.slice()
      for (let i = start; i < mapped.length; i++) {
        const step = mapped[i]!
        if (step.isMapped) continue
        mapped[i] = { pos: step.pos, isMapped: true }
      }
      path = mapped
      lostBufferStartIndex = null
    } else {
      const idx = path.length - 1
      const step = path[idx]!
      if (!step.isMapped) {
        const mapped = path.slice()
        mapped[idx] = { pos: step.pos, isMapped: true }
        path = mapped
      }
    }
  }

  return { path, lostBufferStartIndex }
}


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

