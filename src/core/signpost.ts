// Note: this import closes a runtime cycle (mechanics → defs/signpost →
// signpost → mechanics). It's safe only because every read of MECHANIC_INDEX
// below happens inside a function body, so the binding resolves after module
// init completes. Do NOT hoist any access to module top level.
import { MECHANIC_INDEX } from './mechanics'
import { dirLabel, manhattan, torusDelta } from './math'
import type { CellGrid } from './types'

export type PoiWorldView = {
  width: number
  height: number
  cells: CellGrid
}

// Signposts skip immediate neighbours (pointing at "right there" is useless);
// fall back to the nearest if every PoI is within this radius.
const SIGNPOST_MIN_TARGET_DISTANCE = 2

type Candidate = { rank: number; cellSerial: number; name: string; pos: { x: number; y: number } }

export function formatNearestPoiSignpostMessage(playerPos: { x: number; y: number }, world: PoiWorldView) {
  const cells = world.cells
  const poiSignpostByKind = MECHANIC_INDEX.poiSignpostByKind
  const candidates: Candidate[] = []
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]!
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!
      const contribution = poiSignpostByKind[cell.kind]
      if (!contribution) continue
      candidates.push({
        rank: contribution.rank,
        cellSerial: y * world.width + x,
        name: contribution.name(cell),
        pos: { x, y },
      })
    }
  }

  if (candidates.length === 0) return ''

  type Eval = Candidate & { dx: number; dy: number; d: number }

  function evalCandidate(c: Candidate): Eval {
    const dx = torusDelta(playerPos.x, c.pos.x, world.width)
    const dy = torusDelta(playerPos.y, c.pos.y, world.height)
    return { ...c, dx, dy, d: manhattan(dx, dy) }
  }

  function isBetter(a: Eval, b: Eval): boolean {
    if (a.d !== b.d) return a.d < b.d
    if (a.rank !== b.rank) return a.rank < b.rank
    return a.cellSerial < b.cellSerial
  }

  let bestAny: Eval | null = null
  let bestFar: Eval | null = null
  for (let i = 0; i < candidates.length; i++) {
    const e = evalCandidate(candidates[i]!)
    if (!bestAny || isBetter(e, bestAny)) bestAny = e
    if (e.d > SIGNPOST_MIN_TARGET_DISTANCE && (!bestFar || isBetter(e, bestFar))) bestFar = e
  }

  const chosen = bestFar || bestAny!
  const dir = dirLabel(chosen.dx, chosen.dy)
  return `${chosen.name}\n${dir}, ${chosen.d} leagues away.`
}
