import { describe, expect, it } from 'vitest'
import { GRID_TRANSITION_STEP_FRAMES } from '../../../src/core/constants'
import {
  GRID_CROSS_REVEAL_ORDER,
  gridCrossRevealPhaseIndex,
  gridTransitionDurationFrames,
} from '../../../src/platform/tic80/rightGridRenderPlan'

describe('gridTransition', () => {
  it('reveals cross arms in order top, left, bottom, right', () => {
    expect(GRID_CROSS_REVEAL_ORDER.map((c) => gridCrossRevealPhaseIndex(c.row, c.col))).toEqual([0, 1, 2, 3])
    expect(gridCrossRevealPhaseIndex(1, 1)).toBe(-1)
  })

  it('matches core enqueue duration (uiAnim stepFrames * arm count)', () => {
    const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0)
    expect(gridTransitionDurationFrames()).toBe(stepFrames * GRID_CROSS_REVEAL_ORDER.length)
    expect(GRID_CROSS_REVEAL_ORDER.length).toBe(4)
  })
})
