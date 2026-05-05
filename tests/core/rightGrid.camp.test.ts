import { describe, expect, it } from 'vitest'
import { getRightGridCellDef } from '../../src/core/rightGrid'
import { ACTION_CAMP_LEAVE, ACTION_CAMP_SEARCH, ACTION_TOGGLE_MAP } from '../../src/core/constants'
import type { State, World, Cell } from '../../src/core/types'

function makeWorld(): World {
  const grass = (): Cell => ({ kind: 'grass' })
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), { kind: 'camp', id: 4, name: 'Ember Cross', nextReadyStep: 0 }, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(): State {
  return {
    world: makeWorld(),
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 1, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: 10, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: { kind: 'camp', sourceCellId: 4, restoreMessage: 'x' },
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('rightGrid camp layout', () => {
  it('maps camp cross actions (map corner enabled)', () => {
    const s = makeState()
    expect(getRightGridCellDef(s, 0, 1).action).toBe(null) // North disabled
    expect(getRightGridCellDef(s, 1, 0).action).toEqual({ type: ACTION_CAMP_SEARCH }) // West
    expect(getRightGridCellDef(s, 1, 2).action).toEqual({ type: ACTION_CAMP_LEAVE }) // East
    expect(getRightGridCellDef(s, 1, 1).action).toBe(null) // Center no-op
    expect(getRightGridCellDef(s, 2, 1).action).toBe(null) // South disabled
    expect(getRightGridCellDef(s, 0, 2).action).toEqual({ type: ACTION_TOGGLE_MAP }) // Map corner available during encounter
  })

  it('map corner exists in overworld', () => {
    const s = makeState()
    s.encounter = null
    expect(getRightGridCellDef(s, 0, 2).action).toEqual({ type: ACTION_TOGGLE_MAP })
  })
})

