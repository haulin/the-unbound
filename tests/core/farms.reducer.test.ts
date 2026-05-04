import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_FARM_LEAVE,
  ACTION_MOVE,
  INITIAL_FOOD,
} from '../../src/core/constants'
import { foodCarryCap } from '../../src/core/foodCarry'
import type { State, World } from '../../src/core/types'

function makeWorld(): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'farm', id: 4, name: 'Greyfield', beastGoldCost: 10 }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
    ],
    rngState: 123,
  }
}

function makeState(): State {
  const w = makeWorld()
  return {
    world: w,
    player: { position: { x: 1, y: 0 } },
    run: {
      stepCount: 0,
      hasWon: false,
      isGameOver: false,
      knowsPosition: false,
      path: [],
      lostBufferStartIndex: null,
      copyCursors: {},
    },
    resources: { food: INITIAL_FOOD, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('farms + food reducer', () => {
  it('when food is 0, move triggers hunger (army -1) and no food delta', () => {
    let s = makeState()
    s.resources.food = 0
    s.resources.armySize = 5

    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!

    expect(next.resources.food).toBe(0)
    expect(next.resources.armySize).toBe(4)
  })

  it('stepping onto farm opens modal encounter; only move food cost applies', () => {
    const s = makeState()
    const beforeRng = s.world.rngState
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.encounter?.kind).toBe('farm')
    const cap = foodCarryCap({ armySize: 5, hasTameBeast: false })
    expect(next.resources.food).toBe(Math.min(INITIAL_FOOD - 1, cap))
    expect(next.world.rngState).toBe(beforeRng)
    const cell = next.world.cells[1]![1]!
    expect(cell.kind).toBe('farm')
  })

  it('leaving farm clears encounter so further MOVE applies', () => {
    let s = makeState()
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(s.encounter?.kind).toBe('farm')
    s = processAction(s, { type: ACTION_FARM_LEAVE })!
    expect(s.encounter).toBe(null)
    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next.player.position).toEqual({ x: 2, y: 1 })
  })
})
