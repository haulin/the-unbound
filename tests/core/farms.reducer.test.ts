import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  ENABLE_ANIMATIONS,
  FARM_COOLDOWN_MOVES,
  FARM_REVISIT_LINES,
  INITIAL_FOOD,
} from '../../src/core/constants'
import type { ArmyDeltaAnim, FoodDeltaAnim, State, World } from '../../src/core/types'

function makeWorld(): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'farm', id: 4, name: 'Greyfield', nextReadyStep: 0 }, { kind: 'grass' }],
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
    run: { stepCount: 0, hasWon: false, isGameOver: false },
    resources: { food: INITIAL_FOOD, armySize: 5, hasBronzeKey: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('farms + food reducer', () => {
  it('when food is 0, move triggers hunger (army -1) and no food delta', () => {
    let s = makeState()
    s.resources.food = 0
    s.resources.armySize = 5

    // Move onto a non-farm tile.
    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!

    expect(next.resources.food).toBe(0)
    expect(next.resources.armySize).toBe(4)

    if (ENABLE_ANIMATIONS) {
      const foodDeltas = next.ui.anim.active.filter((a): a is FoodDeltaAnim => a.kind === 'foodDelta')
      expect(foodDeltas.length).toBe(0)

      const armyDeltas = next.ui.anim.active.filter((a): a is ArmyDeltaAnim => a.kind === 'armyDelta')
      expect(armyDeltas.length).toBe(1)
      expect(armyDeltas[0]!.params.delta).toBe(-1)
    }
  })

  it('harvests on ready farm, sets cooldown, advances rngState', () => {
    const s = makeState()
    const beforeRng = s.world.rngState
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(next.resources.food).toBeGreaterThan(INITIAL_FOOD - 1)
    const cell = next.world.cells[1]![1]!
    expect(cell.kind).toBe('farm')
    expect(cell.kind === 'farm' ? cell.nextReadyStep : null).toBe(next.run.stepCount + FARM_COOLDOWN_MOVES)
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

