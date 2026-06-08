// TIC-80 platform animation system: queue + clock + the translator that
// converts core `DomainEvent`s into queue entries.

import type { DeltaAnimTarget, DomainEvent, GridFromKind, GridToKind, Vec2 } from '../../core/types'
import {
  ENABLE_ANIMATIONS,
  FOOD_DELTA_FRAMES,
  GRID_TRANSITION_STEP_FRAMES,
  MOVE_SLIDE_FRAMES,
} from './uiConstants'

const GRID_TRANSITION_FRAMES = GRID_TRANSITION_STEP_FRAMES * 4

export type UiClock = { frame: number }

export type BaseAnim = {
  startFrame: number
  durationFrames: number
  blocksInput: boolean
}

export type MoveSlideAnim = BaseAnim & {
  kind: 'moveSlide'
  params: { fromPos: Vec2; toPos: Vec2; dx: number; dy: number }
}

export type DeltaAnim = BaseAnim & {
  kind: 'delta'
  params: { target: DeltaAnimTarget; delta: number }
}

export type GridTransitionAnim = BaseAnim & {
  kind: 'gridTransition'
  params: { from: GridFromKind; to: GridToKind }
}

export type Anim = MoveSlideAnim | DeltaAnim | GridTransitionAnim

export type UiAnim = { active: readonly Anim[] }

export type Tic80UiState = { clock: UiClock; anim: UiAnim }

export function initialTic80Ui(): Tic80UiState {
  return { clock: { frame: 0 }, anim: { active: [] } }
}

export function hasBlockingAnim(ui: Tic80UiState): boolean {
  const active = ui.anim.active
  for (let i = 0; i < active.length; i++) {
    if (active[i]!.blocksInput) return true
  }
  return false
}

export function tickTic80Ui(ui: Tic80UiState): Tic80UiState {
  const nextClock: UiClock = { frame: ui.clock.frame + 1 }
  const active = ui.anim.active
  const kept: Anim[] = []
  for (let i = 0; i < active.length; i++) {
    const a = active[i]!
    const endFrame = a.startFrame + a.durationFrames
    if (nextClock.frame < endFrame) kept.push(a)
  }
  if (kept.length === active.length) return { clock: nextClock, anim: ui.anim }
  return { clock: nextClock, anim: { active: kept } }
}

function pushAnim(ui: Tic80UiState, anim: Anim): Tic80UiState {
  return { clock: ui.clock, anim: { active: [...ui.anim.active, anim] } }
}

// Two cursors thread the policy: `phaseCursor` (start of the current phase)
// stamps non-blocking popups and the first blocking entry; `phaseEnd` tracks
// the latest end-frame of any blocking entry already in this phase, so
// later openers/closers queue *behind* it. `phaseBoundary` collapses both
// onto `phaseEnd`, serializing the next phase behind this one's blocking
// work.
export function translatePendingEvents(
  ui: Tic80UiState,
  events: readonly DomainEvent[],
): Tic80UiState {
  if (!ENABLE_ANIMATIONS) return ui
  if (events.length === 0) return ui

  let out = ui
  let phaseCursor = ui.clock.frame
  let phaseEnd = phaseCursor

  const append = (anim: Anim): void => {
    out = pushAnim(out, anim)
    if (anim.blocksInput) {
      const end = anim.startFrame + anim.durationFrames
      if (end > phaseEnd) phaseEnd = end
    }
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!
    switch (event.kind) {
      case 'phaseBoundary': {
        phaseCursor = phaseEnd
        break
      }
      case 'positionChanged': {
        append({
          kind: 'moveSlide',
          startFrame: phaseCursor,
          durationFrames: MOVE_SLIDE_FRAMES,
          blocksInput: true,
          params: { fromPos: event.from, toPos: event.to, dx: event.dx, dy: event.dy },
        })
        break
      }
      case 'teleported': {
        append({
          kind: 'gridTransition',
          startFrame: phaseCursor,
          durationFrames: GRID_TRANSITION_FRAMES,
          blocksInput: true,
          params: { from: 'blank', to: 'overworld' },
        })
        break
      }
      case 'resourceChanged': {
        if (event.delta === 0) break
        append({
          kind: 'delta',
          startFrame: phaseCursor,
          durationFrames: FOOD_DELTA_FRAMES,
          blocksInput: false,
          params: { target: event.target, delta: event.delta },
        })
        break
      }
      case 'encounterOpened': {
        append({
          kind: 'gridTransition',
          startFrame: phaseEnd,
          durationFrames: GRID_TRANSITION_FRAMES,
          blocksInput: true,
          params: { from: 'overworld', to: event.encounterKind },
        })
        break
      }
      case 'encounterClosed': {
        append({
          kind: 'gridTransition',
          startFrame: phaseEnd,
          durationFrames: GRID_TRANSITION_FRAMES,
          blocksInput: true,
          params: { from: event.encounterKind, to: 'overworld' },
        })
        break
      }
      case 'runStarted': {
        append({
          kind: 'gridTransition',
          startFrame: phaseCursor,
          durationFrames: GRID_TRANSITION_FRAMES,
          blocksInput: true,
          params: { from: 'blank', to: 'overworld' },
        })
        break
      }
    }
  }

  return out
}
