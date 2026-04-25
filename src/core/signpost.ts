import { dirLabel, manhattan, torusDelta } from './math'

export type PoiWorldView = {
  width: number
  height: number
  castlePosition: { x: number; y: number }
  farms: { position: { x: number; y: number }; name: string }[]
}

export function formatNearestPoiSignpostMessage(playerPos: { x: number; y: number }, world: PoiWorldView) {
  const candidates: { kind: 'castle' | 'farm'; name: string; pos: { x: number; y: number } }[] = [
    { kind: 'castle', name: 'The Castle', pos: world.castlePosition },
    ...world.farms.map((f) => ({ kind: 'farm' as const, name: `${f.name} Farm`, pos: f.position })),
  ]

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
      // Tie-break: prefer castle, otherwise keep earlier farm order.
      if (best.kind !== 'castle' && c.kind === 'castle') {
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

