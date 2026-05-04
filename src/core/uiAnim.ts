import { GRID_TRANSITION_STEP_FRAMES } from './constants'
import type { Anim, GridTransitionAnim, Ui } from './types'

export function enqueueAnim(ui: Ui, anim: Omit<Anim, 'id'>): Ui {
  const id = Math.max(1, Math.trunc(ui.anim.nextId))
  const a = { id, ...anim } as Anim
  const nextActive = ui.anim.active.concat([a])
  return {
    message: ui.message,
    leftPanel: ui.leftPanel,
    clock: ui.clock,
    anim: { nextId: id + 1, active: nextActive },
  }
}

export function enqueueGridTransition(
  ui: Ui,
  args: {
    from: GridTransitionAnim['params']['from']
    to: GridTransitionAnim['params']['to']
    startFrame?: number
  },
): Ui {
  const phaseCount = 5 // N, W, S, E, C reveal
  const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0)
  const durationFrames = stepFrames * phaseCount
  const startFrame = args.startFrame ?? ui.clock.frame
  return enqueueAnim(ui, {
    kind: 'gridTransition',
    startFrame,
    durationFrames,
    blocksInput: true,
    params: { from: args.from, to: args.to },
  })
}

