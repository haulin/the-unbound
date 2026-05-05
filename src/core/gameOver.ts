import { GAME_OVER_LINES } from './constants'
import { RNG } from './rng'

export function gameOverMessage(seed: number, stepCount: number): string {
  if (!GAME_OVER_LINES.length) return ''
  const idx = RNG.keyedIntExclusive({ seed, stepCount, cellId: 0 }, GAME_OVER_LINES.length)
  return GAME_OVER_LINES[idx] ?? ''
}
