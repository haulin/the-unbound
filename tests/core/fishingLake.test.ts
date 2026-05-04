import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_MOVE } from '../../src/core/constants'
import type { Cell, State, World } from '../../src/core/types'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(lakeReady: number): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), { kind: 'fishingLake', id: 4, nextReadyStep: lakeReady }, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 12345,
  }
}

function makeState(lakeReady: number): State {
  const w = makeWorld(lakeReady)
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
      food: 5,
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

describe('fishingLake', () => {
  it('cooldown visit does not advance world.rngState', () => {
    const s = makeState(999)
    const before = s.world.rngState
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.world.rngState).toBe(before)
  })

  it('ready visit advances world.rngState (gain roll)', () => {
    const s = makeState(0)
    const before = s.world.rngState
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.world.rngState).not.toBe(before)
  })
})
