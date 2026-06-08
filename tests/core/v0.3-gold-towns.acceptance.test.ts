import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_MOVE } from '../../src/core/constants'
import { ACTION_TOWN_LEAVE } from '../../src/core/mechanics/defs/town'
import type { Cell, State, World } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(seed: number): World {
  return {
    seed,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [
        grass(),
        {
          kind: 'town',
          id: 4,
          name: 'Stonebridge',
          offers: ['buyFood', 'buyTroops', 'hireScout'],
          prices: { foodGold: 3, troopsGold: 5, companionHireGold: 12, rumorGold: 3 },
          bundles: { food: 3, troops: 2 },
        },
        grass(),
      ],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(world: World): State {
  return {
    world,
    player: { position: { x: 1, y: 0 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: makeResources({ food: 10, gold: 0, armySize: 5 }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' } },
    pendingEvents: [],
  }
}

describe('v0.3 gold+towns acceptance', () => {
  it('stepping onto a town enters town encounter; MOVE ignored until Leave', () => {
    const s0 = makeState(makeWorld(7))

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('town')

    const ignored = processAction(onto, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    // MOVE while in encounter is ignored: same data, except pendingEvents
    // is reset (every dispatch clears the per-action event log).
    expect(ignored).toEqual({ ...onto, pendingEvents: [] })

    const left = processAction(onto, { type: ACTION_TOWN_LEAVE })!
    expect(left.encounter).toBe(null)
  })

  it('town entry description is stable across visits (not keyed to stepCount)', () => {
    const s0 = makeState(makeWorld(7))

    const first = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(first.encounter?.kind).toBe('town')
    const firstMsg = first.ui.message

    const left = processAction(first, { type: ACTION_TOWN_LEAVE })!
    const back = processAction(left, { type: ACTION_MOVE, dx: 0, dy: -1 })!
    const second = processAction(back, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(second.encounter?.kind).toBe('town')
    expect(second.ui.message).toBe(firstMsg)
  })

  it('entering a town orients the player (knowsPosition = true)', () => {
    const s0 = makeState(makeWorld(7))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.run.knowsPosition).toBe(true)
  })

  it('entering a town emits encounterOpened event after a phaseBoundary', () => {
    const s0 = makeState(makeWorld(7))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    // The reducer emits three beats with phaseBoundary between each:
    //   beat 1: cost diff (resourceChanged food cost)
    //   beat 2: slide (positionChanged)
    //   beat 3: arrival (resourceChanged tile gain) + encounterOpened
    // So encounterOpened lands after at least one phaseBoundary, scheduling
    // the encounter-open grid transition strictly after the slide.
    const phaseBoundaryIdx = onto.pendingEvents.findIndex((e) => e.kind === 'phaseBoundary')
    expect(phaseBoundaryIdx).toBeGreaterThanOrEqual(0)

    const slideIdx = onto.pendingEvents.findIndex((e) => e.kind === 'positionChanged')
    expect(slideIdx).toBeGreaterThan(phaseBoundaryIdx)

    const openedIdx = onto.pendingEvents.findIndex(
      (e) => e.kind === 'encounterOpened' && e.encounterKind === 'town',
    )
    expect(openedIdx).toBeGreaterThan(slideIdx)

    const left = processAction(onto, { type: ACTION_TOWN_LEAVE })!
    expect(left.pendingEvents).toContainEqual({
      kind: 'encounterClosed',
      encounterKind: 'town',
      outcome: 'leave',
    })
  })
})

