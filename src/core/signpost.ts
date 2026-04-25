import { dirLabel, manhattan, torusDelta } from './math'

export function formatSignpostMessage(
  playerPos: { x: number; y: number },
  castlePos: { x: number; y: number },
  width: number,
  height: number
) {
  const dx = torusDelta(playerPos.x, castlePos.x, width)
  const dy = torusDelta(playerPos.y, castlePos.y, height)
  const dir = dirLabel(dx, dy)
  const d = manhattan(dx, dy)
  return `The Castle lies ${dir}, ${d} leagues away.`
}

