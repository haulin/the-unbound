import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  FARM_COOLDOWN_MOVES,
  FARM_REVISIT_LINES,
  INITIAL_FOOD,
  TILE_FARM,
} from '../../src/core/constants'
import type { FoodDeltaAnim, State, World } from '../../src/core/types'

function makeWorld(): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    tiles: [
      [0, 0, 0],
      [0, TILE_FARM, 0],
      [0, 0, 0],
    ],
    castlePosition: { x: 0, y: 0 },
    farms: [{ position: { x: 1, y: 1 }, name: 'Greyfield' }],
    rngState: 123,
  }
}

function makeState(): State {
  const w = makeWorld()
  return {
    world: w,
    player: { position: { x: 1, y: 0 } },
    run: { stepCount: 0, hasFoundCastle: false },
    resources: { food: INITIAL_FOOD, farmNextReadyStep: [0] },
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('farms + food reducer', () => {
  it('charges food per move but not below 0', () => {
    let s = makeState()
    s.resources.food = 0
    // Move onto a non-farm tile.
    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next.resources.food).toBe(0)
    // should not enqueue -1 flash when no actual decrease
    const deltas = next.ui.anim.active.filter((a): a is FoodDeltaAnim => a.kind === 'foodDelta')
    expect(deltas.length).toBe(0)
  })

  it('harvests on ready farm, sets cooldown, advances rngState', () => {
    const s = makeState()
    const beforeRng = s.world.rngState
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.resources.food).toBeGreaterThan(INITIAL_FOOD - 1)
    expect(next.resources.farmNextReadyStep[0]).toBe(next.run.stepCount + FARM_COOLDOWN_MOVES)
    expect(next.world.rngState).not.toBe(beforeRng)

    const deltas = next.ui.anim.active.filter((a): a is FoodDeltaAnim => a.kind === 'foodDelta')
    // expect at least -1 and +gain
    expect(deltas.length).toBeGreaterThanOrEqual(2)
  })

  it('revisit in cooldown uses deterministic line without advancing rngState', () => {
    let s = makeState()
    // First, harvest by stepping onto farm
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const harvestedRng = s.world.rngState

    // Move away then back within cooldown window
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: -1 })!
    const back = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(back.world.rngState).toBe(harvestedRng)
    expect(FARM_REVISIT_LINES.some((l) => back.ui.message.includes(l))).toBe(true)
  })
})

