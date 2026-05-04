import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_MOVE } from '../../src/core/constants'
import type { Cell, State, World } from '../../src/core/types'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), { kind: 'rainbowEnd', id: 4, hasPaidOut: false }, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 12345,
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
    resources: {
      food: 10,
      gold: 0,
      armySize: 5,
      hasBronzeKey: false,
      hasScout: false,
      hasTameBeast: false,
    },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('rainbowEnd', () => {
  it('first visit does not advance world.rngState (fixed payout; keyed message RNG only)', () => {
    const s = makeState()
    const before = s.world.rngState
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.world.rngState).toBe(before)
    const cell = next.world.cells[1]![1]!
    expect(cell.kind).toBe('rainbowEnd')
    if (cell.kind === 'rainbowEnd') expect(cell.hasPaidOut).toBe(true)
  })
})
