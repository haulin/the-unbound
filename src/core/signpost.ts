import { dirLabel, manhattan, torusDelta } from './math'
import type { CellGrid } from './types'

export type PoiWorldView = {
  width: number
  height: number
  cells: CellGrid
}

export function formatNearestPoiSignpostMessage(playerPos: { x: number; y: number }, world: PoiWorldView) {
  type PoiKind = 'castle' | 'farm' | 'camp'
  type Candidate = { kind: PoiKind; id: number; name: string; pos: { x: number; y: number } }

  const candidates: Candidate[] = []

  const cells = world.cells
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]!
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!
      if (cell.kind === 'castle') {
        candidates.push({ kind: 'castle', id: y * world.width + x, name: 'The Castle', pos: { x, y } })
      } else if (cell.kind === 'farm') {
        candidates.push({
          kind: 'farm',
          id: cell.id | 0,
          name: `${cell.name || 'A Farm'} Farm`,
          pos: { x, y },
        })
      } else if (cell.kind === 'camp') {
        candidates.push({
          kind: 'camp',
          id: cell.id | 0,
          name: `${cell.name || 'A Camp'} Camp`,
          pos: { x, y },
        })
      }
    }
  }

  if (candidates.length === 0) return ''

  const kindRank = (k: PoiKind) => (k === 'castle' ? 0 : k === 'farm' ? 1 : 2)

  let best = candidates[0]!
  let bestDx = torusDelta(playerPos.x, best.pos.x, world.width)
  let bestDy = torusDelta(playerPos.y, best.pos.y, world.height)
  let bestD = manhattan(bestDx, bestDy)

  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!
    const dx = torusDelta(playerPos.x, c.pos.x, world.width)
    const dy = torusDelta(playerPos.y, c.pos.y, world.height)
    const d = manhattan(dx, dy)

    if (d < bestD) {
      best = c
      bestDx = dx
      bestDy = dy
      bestD = d
      continue
    }

    if (d === bestD) {
      const ar = kindRank(c.kind)
      const br = kindRank(best.kind)
      if (ar < br || (ar === br && (c.id | 0) < (best.id | 0))) {
        best = c
        bestDx = dx
        bestDy = dy
        bestD = d
      }
    }
  }

  const dir = dirLabel(bestDx, bestDy)
  return `${best.name}\n${dir}, ${bestD} leagues away.`
}
