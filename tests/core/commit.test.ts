import { describe, expect, it } from 'vitest'
import { applyChanges, commit, type Change } from '../../src/core/reducer'
import {
  LEFT_PANEL_KIND_AUTO,
  type DomainEvent,
  type Encounter,
  type Resources,
  type State,
} from '../../src/core/types'

// commit() and applyChanges() are the central state-transition primitives
// the dispatcher and every mechanic def go through. The auto-derive
// resource-diff contract and the multi-beat phaseBoundary insertion are
// what every mechanic relies on; both deserve a focused unit suite that
// doesn't go through the full processAction stack.

function makeResources(overrides: Partial<Resources> = {}): Resources {
  return {
    food: 10,
    gold: 5,
    armySize: 8,
    inventory: [],
    party: [],
    ...overrides,
  }
}

function makeState(overrides: Partial<State> = {}): State {
  return {
    world: { width: 0, height: 0, cells: [], seed: 0, rngState: 0 } as unknown as State['world'],
    player: { position: { x: 0, y: 0 } },
    run: {
      stepCount: 0,
      hasWon: false,
      isGameOver: false,
      knowsPosition: false,
      path: [],
      lostBufferStartIndex: null,
    },
    resources: makeResources(),
    encounter: null,
    ui: { message: 'initial', leftPanel: { kind: LEFT_PANEL_KIND_AUTO } },
    pendingEvents: [],
    ...overrides,
  }
}

describe('commit() — auto-derived resource events', () => {
  it('emits no events when resources are not in the change', () => {
    const next = commit(makeState(), { message: 'hi' })
    expect(next.pendingEvents).toEqual([])
    expect(next.ui.message).toBe('hi')
  })

  it('emits no events when resources object is present but every per-target delta is zero', () => {
    const state = makeState()
    const next = commit(state, { resources: makeResources() })
    expect(next.pendingEvents).toEqual([])
  })

  it('emits one resourceChanged per non-zero per-target delta', () => {
    const state = makeState()
    const next = commit(state, {
      resources: makeResources({ food: 8, gold: 7, armySize: 9 }),
    })
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'food', delta: -2 },
      { kind: 'resourceChanged', target: 'gold', delta: 2 },
      { kind: 'resourceChanged', target: 'army', delta: 1 },
    ])
  })

  it('skips per-target events when only one target moved', () => {
    const state = makeState()
    const next = commit(state, { resources: makeResources({ food: 13 }) })
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'food', delta: 3 },
    ])
  })

  it('emits negative deltas with the correct sign', () => {
    const state = makeState({ resources: makeResources({ gold: 10 }) })
    const next = commit(state, { resources: makeResources({ gold: 4 }) })
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'gold', delta: -6 },
    ])
  })
})

describe('commit() — explicit events', () => {
  it('appends change.events after auto-derived resource events', () => {
    const state = makeState()
    const explicit: DomainEvent = {
      kind: 'positionChanged',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
      dx: 1,
      dy: 0,
    }
    const next = commit(state, {
      resources: makeResources({ food: 9 }),
      events: [explicit],
    })
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'food', delta: -1 },
      explicit,
    ])
  })

  it('passes explicit events through when no resources field is in the change', () => {
    const state = makeState({ encounter: { kind: 'camp', sourceCellId: 1, restoreMessage: '' } })
    const close: DomainEvent = {
      kind: 'encounterClosed',
      encounterKind: 'camp',
      outcome: 'leave',
    }
    const next = commit(state, { encounter: null, message: 'back', events: [close] })
    expect(next.pendingEvents).toEqual([close])
    expect(next.encounter).toBeNull()
    expect(next.ui.message).toBe('back')
  })
})

describe('commit() — field semantics', () => {
  it('falls back to state for omitted fields', () => {
    const state = makeState({ ui: { message: 'prev', leftPanel: { kind: LEFT_PANEL_KIND_AUTO } } })
    const next = commit(state, {})
    expect(next.ui.message).toBe('prev')
    expect(next.resources).toBe(state.resources)
    expect(next.player).toBe(state.player)
    expect(next.world).toBe(state.world)
    expect(next.run).toBe(state.run)
    expect(next.encounter).toBe(state.encounter)
  })

  it('treats encounter: null as explicit clear (distinct from omitted)', () => {
    const enc: Encounter = { kind: 'camp', sourceCellId: 1, restoreMessage: '' }
    const state = makeState({ encounter: enc })
    expect(commit(state, {}).encounter).toBe(enc)
    expect(commit(state, { encounter: null }).encounter).toBeNull()
  })

  it('preserves prior pendingEvents and appends the new ones in order', () => {
    const prior: DomainEvent = { kind: 'runStarted' }
    const state = makeState({ pendingEvents: [prior] })
    const next = commit(state, { resources: makeResources({ food: 11 }) })
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      prior,
      { kind: 'resourceChanged', target: 'food', delta: 1 },
    ])
  })
})

describe('applyChanges()', () => {
  it('is identity for an empty change list', () => {
    const state = makeState()
    expect(applyChanges(state, [])).toBe(state)
  })

  it('runs a single beat without inserting a phaseBoundary', () => {
    const state = makeState()
    const next = applyChanges(state, [{ resources: makeResources({ food: 12 }) }])
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'food', delta: 2 },
    ])
  })

  it('inserts an implicit phaseBoundary between each beat', () => {
    const state = makeState()
    const beats: Change[] = [
      { resources: makeResources({ food: 9 }) },
      { resources: makeResources({ food: 9, gold: 8 }) },
      { resources: makeResources({ food: 9, gold: 8, armySize: 7 }) },
    ]
    const next = applyChanges(state, beats)
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'food', delta: -1 },
      { kind: 'phaseBoundary' },
      { kind: 'resourceChanged', target: 'gold', delta: 3 },
      { kind: 'phaseBoundary' },
      { kind: 'resourceChanged', target: 'army', delta: -1 },
    ])
  })

  it('threads state through beats so each beat sees the prior beat applied', () => {
    // Beat 2 reads the resources Beat 1 just committed when computing its
    // own diff — this is the contract reduceMove relies on for the
    // cost-then-gain split.
    const state = makeState()
    const beats: Change[] = [
      { resources: makeResources({ food: 9 }) },
      { resources: makeResources({ food: 14 }) },
    ]
    const next = applyChanges(state, beats)
    expect(next.resources.food).toBe(14)
    expect(next.pendingEvents).toEqual<DomainEvent[]>([
      { kind: 'resourceChanged', target: 'food', delta: -1 },
      { kind: 'phaseBoundary' },
      { kind: 'resourceChanged', target: 'food', delta: 5 },
    ])
  })
})
