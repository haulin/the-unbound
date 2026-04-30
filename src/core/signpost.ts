import { GATE_NAME, LOCKSMITH_NAME } from './constants'
import { dirLabel, manhattan, torusDelta } from './math'
import type { CellGrid } from './types'

export type PoiWorldView = {
  width: number
  height: number
  cells: CellGrid
}

export function formatNearestPoiSignpostMessage(playerPos: { x: number; y: number }, world: PoiWorldView) {
  type PoiKind = 'gate' | 'gateOpen' | 'locksmith' | 'farm' | 'camp' | 'henge'
  type Candidate = { kind: PoiKind; id: number; name: string; pos: { x: number; y: number } }

  const SIGNPOST_MIN_TARGET_DISTANCE = 2

  const kindRank = (k: PoiKind) =>
    k === 'gate' || k === 'gateOpen' ? 0 : k === 'locksmith' ? 1 : k === 'farm' ? 2 : k === 'camp' ? 3 : 4

  function candidateId(x: number, y: number) {
    return y * world.width + x
  }

  const candidates: Candidate[] = []

  function pushNamedCandidate(kind: Exclude<PoiKind, 'gate' | 'gateOpen' | 'locksmith'>, id: number, baseName: string, suffix: string, x: number, y: number) {
    const name = `${baseName} ${suffix}`
    candidates.push({ kind, id, name, pos: { x, y } })
  }

  const cells = world.cells
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]!
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!
      switch (cell.kind) {
        case 'gate':
          candidates.push({ kind: 'gate', id: candidateId(x, y), name: GATE_NAME, pos: { x, y } })
          break
        case 'gateOpen':
          candidates.push({ kind: 'gateOpen', id: candidateId(x, y), name: GATE_NAME, pos: { x, y } })
          break
        case 'locksmith':
          candidates.push({ kind: 'locksmith', id: candidateId(x, y), name: LOCKSMITH_NAME, pos: { x, y } })
          break
        case 'farm':
          pushNamedCandidate('farm', cell.id, cell.name || 'A Farm', 'Farm', x, y)
          break
        case 'camp':
          pushNamedCandidate('camp', cell.id, cell.name || 'A Camp', 'Camp', x, y)
          break
        case 'henge':
          pushNamedCandidate('henge', cell.id, cell.name || 'A Henge', 'Henge', x, y)
          break
      }
    }
  }

  if (candidates.length === 0) return ''

  type Eval = Candidate & { dx: number; dy: number; d: number; rank: number }

  function evalCandidate(c: Candidate): Eval {
    const dx = torusDelta(playerPos.x, c.pos.x, world.width)
    const dy = torusDelta(playerPos.y, c.pos.y, world.height)
    const d = manhattan(dx, dy)
    const rank = kindRank(c.kind)
    return { ...c, dx, dy, d, rank }
  }

  function isBetter(a: Eval, b: Eval): boolean {
    if (a.d !== b.d) return a.d < b.d
    if (a.rank !== b.rank) return a.rank < b.rank
    return a.id < b.id
  }

  let bestAny: Eval | null = null
  let bestFar: Eval | null = null
  for (let i = 0; i < candidates.length; i++) {
    const e = evalCandidate(candidates[i]!)
    if (!bestAny || isBetter(e, bestAny)) bestAny = e
    if (e.d > SIGNPOST_MIN_TARGET_DISTANCE) {
      if (!bestFar || isBetter(e, bestFar)) bestFar = e
    }
  }

  const chosen = bestFar || bestAny
  if (!chosen) return ''

  const dir = dirLabel(chosen.dx, chosen.dy)
  return `${chosen.name}\n${dir}, ${chosen.d} leagues away.`
}
