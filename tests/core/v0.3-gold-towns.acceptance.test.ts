import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_MOVE, ACTION_TOWN_LEAVE, ENABLE_ANIMATIONS } from '../../src/core/constants'
import type { Cell, GridTransitionAnim, State, World } from '../../src/core/types'

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
          prices: { foodGold: 3, troopsGold: 5, scoutGold: 12, rumorGold: 3 },
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
    resources: { food: 10, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('v0.3 gold+towns acceptance', () => {
  it('stepping onto a town enters town encounter; MOVE ignored until Leave', () => {
    const s0 = makeState(makeWorld(7))

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('town')

    const ignored = processAction(onto, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(ignored).toBe(onto)

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

  it('entering/leaving towns enqueue gridTransition (when animations enabled)', () => {
    const s0 = makeState(makeWorld(7))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    if (ENABLE_ANIMATIONS) {
      const trans = onto.ui.anim.active.filter((a): a is GridTransitionAnim => a.kind === 'gridTransition')
      expect(trans.some((a) => a.params.from === 'overworld' && a.params.to === 'town')).toBe(true)
    }

    const left = processAction(onto, { type: ACTION_TOWN_LEAVE })!
    if (ENABLE_ANIMATIONS) {
      const trans2 = left.ui.anim.active.filter((a): a is GridTransitionAnim => a.kind === 'gridTransition')
      expect(trans2.some((a) => a.params.from === 'town' && a.params.to === 'overworld')).toBe(true)
    }
  })
})

