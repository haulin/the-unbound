import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_CAMP_LEAVE,
  ACTION_CAMP_SEARCH,
  ACTION_MOVE,
  ACTION_RESTART,
  CAMP_COOLDOWN_MOVES,
  CAMP_FOOD_GAIN,
  GAME_OVER_LINES,
  ENABLE_ANIMATIONS,
  INITIAL_FOOD,
} from '../../src/core/constants'
import type { FoodDeltaAnim, State, World } from '../../src/core/types'

function makeWorld(): World {
  return {
    seed: 7,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'camp', id: 4, name: 'Ember Cross', nextReadyStep: 0 }, { kind: 'grass' }],
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
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: {
      food: INITIAL_FOOD,
      armySize: 1,
      hasBronzeKey: false,
      hasScout: false,
    },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

function expectedGameOverLine(seed: number, stepCount: number) {
  const k = ((seed | 0) + (stepCount | 0)) | 0
  const m = GAME_OVER_LINES.length
  const idx = ((k % m) + m) % m
  return GAME_OVER_LINES[idx] || ''
}

describe('army + camps + game over', () => {
  it('mountains cost 2 food when available', () => {
    const w: World = {
      seed: 1,
      width: 3,
      height: 3,
      mapGenAlgorithm: 'TEST',
      cells: [
        [{ kind: 'grass' }, { kind: 'mountain' }, { kind: 'grass' }],
        [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
        [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      ],
      rngState: 1,
    }

    const s: State = {
      world: w,
      player: { position: { x: 0, y: 0 } },
      run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
      resources: { food: 2, armySize: 5, hasBronzeKey: false, hasScout: false },
      encounter: null,
      ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
    }

    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next.resources.food).toBe(0)
    expect(next.resources.armySize).toBe(5)
  })

  it('swamps cost 2 food; if you only have 1, hunger triggers (army -1) and food becomes 0', () => {
    const w: World = {
      seed: 1,
      width: 3,
      height: 3,
      mapGenAlgorithm: 'TEST',
      cells: [
        [{ kind: 'grass' }, { kind: 'swamp' }, { kind: 'grass' }],
        [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
        [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      ],
      rngState: 1,
    }

    const s: State = {
      world: w,
      player: { position: { x: 0, y: 0 } },
      run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
      resources: { food: 1, armySize: 5, hasBronzeKey: false, hasScout: false },
      encounter: null,
      ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
    }

    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next.resources.food).toBe(0)
    expect(next.resources.armySize).toBe(4)
  })

  it('camp does not rescue hunger death on entry', () => {
    const s = makeState()
    s.resources.food = 0
    s.resources.armySize = 1

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.run.isGameOver).toBe(true)
    expect(next.encounter).toBe(null)
    expect(next.ui.message).toBe(expectedGameOverLine(next.world.seed, next.run.stepCount))
  })

  it('entering a camp opens an encounter; Search grants food even if you arrive with 0', () => {
    const s = makeState()
    s.resources.food = 0
    s.resources.armySize = 3

    const onto = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('camp')
    expect(onto.resources.food).toBe(0)

    const next = processAction(onto, { type: ACTION_CAMP_SEARCH })!
    expect(next.resources.food).toBe(CAMP_FOOD_GAIN)

    if (ENABLE_ANIMATIONS) {
      const foodDeltas = next.ui.anim.active.filter((a): a is FoodDeltaAnim => a.kind === 'foodDelta')
      expect(foodDeltas.some((a) => a.params.delta === CAMP_FOOD_GAIN)).toBe(true)
    }
  })

  it('a camp can be searched again once cooldown has passed', () => {
    let s = makeState()
    s.resources.food = INITIAL_FOOD
    s.resources.armySize = 5

    // Enter camp and Search once.
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(s.encounter?.kind).toBe('camp')
    const beforeArmy = s.resources.armySize
    const beforeRng = s.world.rngState
    s = processAction(s, { type: ACTION_CAMP_SEARCH })!
    expect(s.resources.armySize).toBeGreaterThan(beforeArmy)
    expect(s.world.rngState).toBe(beforeRng) // Search uses deterministic offer; does not consume rngState.

    const campCellAfter = s.world.cells[1]![1]!
    expect(campCellAfter.kind).toBe('camp')
    expect(campCellAfter.kind === 'camp' ? campCellAfter.nextReadyStep : null).toBe(s.run.stepCount + CAMP_COOLDOWN_MOVES)

    // Leave camp and take enough moves for cooldown to pass before re-entering.
    s = processAction(s, { type: ACTION_CAMP_LEAVE })!
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: -1 })! // (1,0)
    s = processAction(s, { type: ACTION_MOVE, dx: -1, dy: 0 })! // (0,0)
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })! // (0,1)

    // Re-enter camp (MOVE increments stepCount, enabling readiness).
    s = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })! // (1,1) camp
    expect(s.encounter?.kind).toBe('camp')
    const beforeArmy2 = s.resources.armySize
    s = processAction(s, { type: ACTION_CAMP_SEARCH })!
    expect(s.resources.armySize).toBeGreaterThan(beforeArmy2)
    expect(s.world.rngState).toBe(beforeRng)
  })

  it('ignores MOVE when game over', () => {
    const s = makeState()
    s.run.isGameOver = true
    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next).toBe(s)
  })

  it('ignores MOVE when you have already won', () => {
    const s = makeState()
    s.run.hasWon = true
    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next).toBe(s)
  })

  it('restart works even when game over', () => {
    const s = makeState()
    s.run.isGameOver = true
    const next = processAction(s, { type: ACTION_RESTART })!
    expect(next.run.isGameOver).toBe(false)
    expect(next.run.stepCount).toBe(0)
    expect(next.world.seed).toBe(s.world.seed + 1)
  })
})
