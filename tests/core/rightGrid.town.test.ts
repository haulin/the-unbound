import { describe, expect, it } from 'vitest'
import { getRightGridCellDef } from '../../src/core/rightGrid'
import { ACTION_TOGGLE_MAP } from '../../src/core/constants'
import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
} from '../../src/core/mechanics/defs/town'
import type { Cell, State, World } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

function makeWorld(): World {
  const grass = (): Cell => ({ kind: 'grass' })
  return {
    seed: 1,
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

function makeState(): State {
  return {
    world: makeWorld(),
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 1, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: makeResources({ food: 10, gold: 99, armySize: 5 }),
    encounter: { kind: 'town', sourceCellId: 4, restoreMessage: 'x', rumorsBought: 0 },
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('rightGrid town layout', () => {
  it('maps town cross actions (map corner enabled)', () => {
    const s = makeState()
    expect(getRightGridCellDef(s, 1, 0).action).toEqual({ type: ACTION_TOWN_BUY_FOOD }) // West (1st offer → left)
    expect(getRightGridCellDef(s, 0, 1).action).toEqual({ type: ACTION_TOWN_BUY_TROOPS }) // North (2nd → top)
    expect(getRightGridCellDef(s, 2, 1).action).toEqual({ type: ACTION_TOWN_HIRE_SCOUT }) // South (3rd → bottom)
    expect(getRightGridCellDef(s, 1, 2).action).toEqual({ type: ACTION_TOWN_LEAVE }) // East
    expect(getRightGridCellDef(s, 1, 1).action).toBe(null) // Center no-op
    expect(getRightGridCellDef(s, 0, 2).action).toEqual({ type: ACTION_TOGGLE_MAP }) // Map corner available during encounter
  })
})

