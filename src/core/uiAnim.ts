import { FOOD_DELTA_FRAMES, GRID_TRANSITION_STEP_FRAMES } from './constants'
import type { Anim, DeltaAnimTarget, GridTransitionAnim, Ui } from './types'

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

// Enqueue one delta-popup anim per non-zero entry. Defaults `startFrame` to the current
// UI clock frame, mirroring `enqueueGridTransition`. Zero deltas are silently skipped.
export function enqueueDeltas(
  ui: Ui,
  args: { target: DeltaAnimTarget; deltas: readonly number[]; startFrame?: number },
): Ui {
  const startFrame = args.startFrame ?? ui.clock.frame
  let next = ui
  for (let i = 0; i < args.deltas.length; i++) {
    const delta = args.deltas[i]!
    if (!delta) continue
    next = enqueueAnim(next, {
      kind: 'delta',
      startFrame,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: args.target, delta },
    })
  }
  return next
}

