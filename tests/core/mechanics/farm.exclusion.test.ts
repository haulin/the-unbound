import { describe, expect, it } from 'vitest'
import { ACTION_MOVE, MULE_BOAR_REFUSED_LINES, BOAR_MULE_REFUSED_LINES } from '../../../src/core/constants'
import { processAction } from '../../../src/core/processAction'
import { ACTION_FARM_BUY_BOAR, ACTION_FARM_BUY_MULE } from '../../../src/core/mechanics/defs/farm'
import type { Cell, FarmCell, State, World } from '../../../src/core/types'
import { makeResources } from '../_helpers/makeResources'

function grass(): Cell {
  return { kind: 'grass' }
}

function farm(): FarmCell {
  return {
    kind: 'farm',
    id: 4,
    name: 'Greyfield',
    offers: ['FARM_BUY_FOOD', 'FARM_BUY_MULE', 'FARM_BUY_BOAR'],
    companionHireGold: 15,
  }
}

function makeWorld(center: Cell): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), center, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(world: World, party: readonly string[]): State {
  return {
    world,
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
    resources: makeResources({ food: 10, gold: 99, armySize: 10, party: [...party] }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' } },
    pendingEvents: [],
  }
}

describe('mule ↔ boar hire exclusion', () => {
  it('refuses boar hire when mule is held and highlights mule', () => {
    const onto = processAction(makeState(makeWorld(farm()), ['mule']), { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const refused = processAction(onto, { type: ACTION_FARM_BUY_BOAR })!
    expect(refused.resources.party).toEqual(['mule'])
    expect(BOAR_MULE_REFUSED_LINES.some((line) => refused.ui.message.includes(line))).toBe(true)
    expect(refused.pendingEvents).toContainEqual({
      kind: 'iconHighlighted',
      target: { band: 'party', id: 'mule' },
    })
  })

  it('refuses mule hire when boar is held and highlights boar', () => {
    const onto = processAction(makeState(makeWorld(farm()), ['boar']), { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const refused = processAction(onto, { type: ACTION_FARM_BUY_MULE })!
    expect(refused.resources.party).toEqual(['boar'])
    expect(MULE_BOAR_REFUSED_LINES.some((line) => refused.ui.message.includes(line))).toBe(true)
    expect(refused.pendingEvents).toContainEqual({
      kind: 'iconHighlighted',
      target: { band: 'party', id: 'boar' },
    })
  })
})
