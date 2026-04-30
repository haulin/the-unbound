import { FEATURE_KINDS, TELEPORT_MIN_DISTANCE } from './constants'
import { manhattan, torusDelta } from './math'
import { randInt } from './prng'
import type { Vec2, World } from './types'

const FEATURE_KIND_SET = new Set<string>(FEATURE_KINDS)

function isTerrain(kind: string): boolean {
  return !FEATURE_KIND_SET.has(kind)
}

export function pickTeleportDestination(args: {
  world: World
  origin: Vec2
  rngState: number
}): { destination: Vec2; rngState: number } {
  const { world, origin } = args
  let rngState = args.rngState

  type Candidate = { x: number; y: number; d: number }
  const candidates: Candidate[] = []
  let maxD = 0

  for (let y = 0; y < world.height; y++) {
    const row = world.cells[y]!
    for (let x = 0; x < world.width; x++) {
      const cell = row[x]!
      if (!isTerrain(cell.kind)) continue
      if (x === origin.x && y === origin.y) continue
      const dx = torusDelta(origin.x, x, world.width)
      const dy = torusDelta(origin.y, y, world.height)
      const d = manhattan(dx, dy)
      candidates.push({ x, y, d })
      if (d > maxD) maxD = d
    }
  }

  const target = Math.min(TELEPORT_MIN_DISTANCE, maxD)
  const eligible = candidates.filter((c) => c.d >= target)
  // If somehow eligible is empty (no non-feature terrain), fall back to all candidates.
  const pool = eligible.length > 0 ? eligible : candidates
  if (pool.length === 0) {
    // Degenerate: no non-feature terrain at all. Return origin to keep state sane.
    return { destination: origin, rngState }
  }

  const r = randInt(rngState, pool.length)
  rngState = r.rngState
  const pick = pool[r.value]!
  return { destination: { x: pick.x, y: pick.y }, rngState }
}
