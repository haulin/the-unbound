import { describe, expect, it } from 'vitest'
import type { DomainEvent } from '../../../src/core/types'
import {
  FOOD_DELTA_FRAMES,
  GRID_TRANSITION_STEP_FRAMES,
  MOVE_SLIDE_FRAMES,
} from '../../../src/platform/tic80/uiConstants'
import {
  initialTic80Ui,
  translatePendingEvents,
  type Anim,
  type Tic80UiState,
} from '../../../src/platform/tic80/anim'

// Table-driven coverage of the translator policy table in
// docs/plans/2026-06-07-event-driven-animation-design.md. The translator is
// the single concentration of event→anim scheduling; one bug here cascades
// to every mechanic at once. Asserting per-event scheduling here keeps that
// risk contained.

const GRID_TRANSITION_FRAMES = GRID_TRANSITION_STEP_FRAMES * 4

function uiAt(frame: number): Tic80UiState {
  const ui = initialTic80Ui()
  return { ...ui, clock: { frame } }
}

function run(events: readonly DomainEvent[], startFrame = 0): readonly Anim[] {
  return translatePendingEvents(uiAt(startFrame), events).anim.active
}

describe('translatePendingEvents — identity', () => {
  it('returns the same ui when no events are pending', () => {
    const ui = uiAt(42)
    expect(translatePendingEvents(ui, [])).toBe(ui)
  })

  it('preserves the clock frame (translator never advances the clock)', () => {
    const out = translatePendingEvents(uiAt(100), [{ kind: 'runStarted' }])
    expect(out.clock.frame).toBe(100)
  })
})

describe('translatePendingEvents — single-event scheduling', () => {
  it('runStarted → blocking blank→overworld grid transition at phaseCursor', () => {
    const anims = run([{ kind: 'runStarted' }], 0)
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({
      kind: 'gridTransition',
      startFrame: 0,
      durationFrames: GRID_TRANSITION_FRAMES,
      blocksInput: true,
      params: { from: 'blank', to: 'overworld' },
    })
  })

  it('positionChanged → blocking moveSlide carrying dx/dy and endpoints', () => {
    const anims = run(
      [
        {
          kind: 'positionChanged',
          from: { x: 1, y: 1 },
          to: { x: 2, y: 1 },
          dx: 1,
          dy: 0,
        },
      ],
      50,
    )
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({
      kind: 'moveSlide',
      startFrame: 50,
      durationFrames: MOVE_SLIDE_FRAMES,
      blocksInput: true,
      params: { fromPos: { x: 1, y: 1 }, toPos: { x: 2, y: 1 }, dx: 1, dy: 0 },
    })
  })

  it('teleported → blocking blank→overworld grid transition at phaseCursor', () => {
    const anims = run(
      [{ kind: 'teleported', from: { x: 0, y: 0 }, to: { x: 5, y: 5 } }],
      10,
    )
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({
      kind: 'gridTransition',
      startFrame: 10,
      durationFrames: GRID_TRANSITION_FRAMES,
      blocksInput: true,
      params: { from: 'blank', to: 'overworld' },
    })
  })

  it('resourceChanged (non-zero) → non-blocking delta popup at phaseCursor', () => {
    const anims = run([{ kind: 'resourceChanged', target: 'food', delta: -2 }], 7)
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({
      kind: 'delta',
      startFrame: 7,
      durationFrames: FOOD_DELTA_FRAMES,
      blocksInput: false,
      params: { target: 'food', delta: -2 },
    })
  })

  it('resourceChanged with delta=0 produces no entry', () => {
    const anims = run([{ kind: 'resourceChanged', target: 'gold', delta: 0 }], 0)
    expect(anims).toHaveLength(0)
  })

  it('encounterOpened → blocking overworld→encounterKind grid transition at phaseEnd', () => {
    const anims = run([{ kind: 'encounterOpened', encounterKind: 'camp' }], 0)
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({
      kind: 'gridTransition',
      startFrame: 0,
      durationFrames: GRID_TRANSITION_FRAMES,
      blocksInput: true,
      params: { from: 'overworld', to: 'camp' },
    })
  })

  it('encounterClosed → blocking encounterKind→overworld grid transition at phaseEnd', () => {
    const anims = run(
      [{ kind: 'encounterClosed', encounterKind: 'combat', outcome: 'victory' }],
      0,
    )
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({
      kind: 'gridTransition',
      startFrame: 0,
      durationFrames: GRID_TRANSITION_FRAMES,
      blocksInput: true,
      params: { from: 'combat', to: 'overworld' },
    })
  })
})

describe('translatePendingEvents — phase composition', () => {
  it('non-blocking popups share startFrame with the blocking slide in the same phase', () => {
    // The "food cost popup floats over the slide" contract.
    const anims = run(
      [
        {
          kind: 'positionChanged',
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
          dx: 1,
          dy: 0,
        },
        { kind: 'resourceChanged', target: 'food', delta: -2 },
      ],
      100,
    )
    expect(anims).toHaveLength(2)
    expect(anims[0]).toMatchObject({ kind: 'moveSlide', startFrame: 100 })
    expect(anims[1]).toMatchObject({
      kind: 'delta',
      startFrame: 100,
      blocksInput: false,
    })
  })

  it('encounterOpened scheduled at phaseEnd serializes behind a slide in the same phase', () => {
    // Within a single beat (no phaseBoundary), encounterOpened pushes against
    // phaseEnd so it lands after the slide finishes.
    const anims = run(
      [
        {
          kind: 'positionChanged',
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
          dx: 1,
          dy: 0,
        },
        { kind: 'encounterOpened', encounterKind: 'camp' },
      ],
      0,
    )
    expect(anims).toHaveLength(2)
    expect(anims[0]).toMatchObject({ kind: 'moveSlide', startFrame: 0 })
    expect(anims[1]).toMatchObject({
      kind: 'gridTransition',
      startFrame: MOVE_SLIDE_FRAMES,
      params: { from: 'overworld', to: 'camp' },
    })
  })

  it('phaseBoundary advances phaseCursor past the prior phase end', () => {
    // Two-beat move: beat 1 popup → boundary → beat 2 popup. The second
    // popup is non-blocking but its startFrame must reflect the prior
    // blocking work's end frame.
    const anims = run(
      [
        {
          kind: 'positionChanged',
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
          dx: 1,
          dy: 0,
        },
        { kind: 'phaseBoundary' },
        { kind: 'resourceChanged', target: 'food', delta: 5 },
      ],
      0,
    )
    expect(anims).toHaveLength(2)
    expect(anims[0]).toMatchObject({ kind: 'moveSlide', startFrame: 0 })
    expect(anims[1]).toMatchObject({
      kind: 'delta',
      startFrame: MOVE_SLIDE_FRAMES,
      params: { target: 'food', delta: 5 },
    })
  })

  it('combat-victory close: enemy popup → boundary → close transition + loot popup', () => {
    // The design's "Combat Fight — player hits, enemy dies, victory loot"
    // example. Enemy popup is non-blocking; close transition is blocking and
    // its startFrame anchors the loot popup in the second beat.
    const anims = run(
      [
        { kind: 'resourceChanged', target: 'enemyArmy', delta: -4 },
        { kind: 'phaseBoundary' },
        { kind: 'encounterClosed', encounterKind: 'combat', outcome: 'victory' },
        { kind: 'resourceChanged', target: 'gold', delta: 12 },
      ],
      0,
    )
    expect(anims).toHaveLength(3)
    expect(anims[0]).toMatchObject({
      kind: 'delta',
      startFrame: 0,
      params: { target: 'enemyArmy', delta: -4 },
    })
    expect(anims[1]).toMatchObject({
      kind: 'gridTransition',
      startFrame: 0,
      params: { from: 'combat', to: 'overworld' },
    })
    expect(anims[2]).toMatchObject({
      kind: 'delta',
      startFrame: 0,
      params: { target: 'gold', delta: 12 },
    })
  })
})

describe('translatePendingEvents — incremental append', () => {
  it('preserves existing queue entries and appends new ones', () => {
    // The translator runs once per dispatch and consumes only the new
    // pendingEvents; prior queue entries from earlier dispatches must
    // survive.
    const seeded = translatePendingEvents(uiAt(0), [{ kind: 'runStarted' }])
    expect(seeded.anim.active).toHaveLength(1)
    const next = translatePendingEvents(seeded, [
      { kind: 'resourceChanged', target: 'food', delta: 3 },
    ])
    expect(next.anim.active).toHaveLength(2)
    expect(next.anim.active[0]!.kind).toBe('gridTransition')
    expect(next.anim.active[1]).toMatchObject({
      kind: 'delta',
      params: { target: 'food', delta: 3 },
    })
  })
})
