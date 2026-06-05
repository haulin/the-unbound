import { GAME_OVER_LINES } from './constants'
import { RNG } from './rng'
import type { State } from './types'

export function gameOverMessage(seed: number, stepCount: number): string {
  if (!GAME_OVER_LINES.length) return ''
  const idx = RNG.keyedIntExclusive({ seed, stepCount, cellId: 0 }, GAME_OVER_LINES.length)
  return GAME_OVER_LINES[idx] ?? ''
}

/** After an encounter action: army at 0 → game over message, clear encounter. */
export function applyArmyZeroGameOver(state: State): State {
  if (state.resources.armySize > 0) return state
  return {
    ...state,
    encounter: null,
    run: { ...state.run, isGameOver: true },
    ui: { ...state.ui, message: gameOverMessage(state.world.seed, state.run.stepCount) },
  }
}
