import { describe, expect, it } from 'vitest'
import { ACTION_MOVE } from '../../../src/core/constants'
import { MECHANIC_INDEX } from '../../../src/core/mechanics'
import { processAction } from '../../../src/core/processAction'
import { getRightGridCellDef } from '../../../src/core/rightGrid'
import {
  ACTION_CROSSING_LEAVE,
  ACTION_CROSSING_SELL,
  crossingSellGold,
} from '../../../src/core/mechanics/defs/crossing'
import type { Cell, CrossingCell, State, World } from '../../../src/core/types'
import { makeResources } from '../_helpers/makeResources'

function grass(): Cell {
  return { kind: 'grass' }
}

function crossing(name = 'Salt'): CrossingCell {
  return { kind: 'crossing', id: 4, name }
}

function makeWorld(center: Cell): World {
  return {
    seed: 47,
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

function makeState(world: World, party: readonly string[] = []): State {
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
    resources: makeResources({ food: 20, gold: 5, armySize: 10, party: [...party] }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' } },
    pendingEvents: [],
  }
}

describe('crossing mechanic', () => {
  it('caches deterministic sell gold per slot and step', () => {
    const goldA = crossingSellGold({ seed: 47, stepCount: 3, cellId: 12, slotId: 'mule' })
    const goldB = crossingSellGold({ seed: 47, stepCount: 3, cellId: 12, slotId: 'mule' })
    const goldC = crossingSellGold({ seed: 47, stepCount: 4, cellId: 12, slotId: 'mule' })
    expect(goldA).toBe(goldB)
    expect(goldA).not.toBe(goldC)
    expect(goldA).toBeGreaterThanOrEqual(7)
    expect(goldA).toBeLessThanOrEqual(10)
  })

  it('empty party steps on crossing without opening encounter', () => {
    const onto = processAction(makeState(makeWorld(crossing()), []), { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter).toBeNull()
    expect(onto.ui.message).toMatch(/Crossing/)
  })

  it('sell removes party slot and pays cached gold', () => {
    const onto = processAction(makeState(makeWorld(crossing()), ['mule', 'scout']), {
      type: ACTION_MOVE,
      dx: 0,
      dy: 1,
    })!
    expect(onto.encounter?.kind).toBe('crossing')
    const enc = onto.encounter
    if (!enc || enc.kind !== 'crossing') throw new Error('expected crossing')
    const sellGold = enc.sellGoldBySlot.mule!
    const after = processAction(onto, { type: ACTION_CROSSING_SELL, slotId: 'mule' })!
    expect(after.resources.party).toEqual(['scout'])
    expect(after.resources.gold).toBe(5 + sellGold)
    expect(after.encounter?.kind).toBe('crossing')
    const left = processAction(after, { type: ACTION_CROSSING_LEAVE })!
    expect(left.encounter).toBeNull()
  })

  it('preview encounter fills sell gold from live party for grid transitions', () => {
    const s = makeState(makeWorld(crossing()), ['mule'])
    s.player.position = { x: 1, y: 1 }
    const preview = MECHANIC_INDEX.previewEncounterByEncounterKind.crossing!(s)
    expect(preview.kind).toBe('crossing')
    if (preview.kind !== 'crossing') throw new Error('expected crossing')
    expect(preview.sellGoldBySlot.mule).toBe(
      crossingSellGold({ seed: 47, stepCount: 0, cellId: 4, slotId: 'mule' }),
    )
  })

  it('sell cell omits badge when cached gold is missing', () => {
    const s = makeState(makeWorld(crossing()), ['mule'])
    s.encounter = { kind: 'crossing', sourceCellId: 4, restoreMessage: '', sellGoldBySlot: {} }
    const def = getRightGridCellDef(s, 1, 0)
    expect(def.badge).toBeUndefined()
    expect(def.spriteId).toBeDefined()
  })

  it('auto-closes when the last companion is sold', () => {
    const onto = processAction(makeState(makeWorld(crossing()), ['boar']), {
      type: ACTION_MOVE,
      dx: 0,
      dy: 1,
    })!
    const after = processAction(onto, { type: ACTION_CROSSING_SELL, slotId: 'boar' })!
    expect(after.resources.party).toEqual([])
    expect(after.encounter).toBeNull()
    expect(after.pendingEvents).toContainEqual({
      kind: 'encounterClosed',
      encounterKind: 'crossing',
      outcome: 'purchase',
    })
  })
})
