import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  ACTION_RESTART,
  CAMP_COOLDOWN_MOVES,
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
    run: { stepCount: 0, hasFoundCastle: false, isGameOver: false },
    resources: {
      food: INITIAL_FOOD,
      armySize: 1,
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
      run: { stepCount: 0, hasFoundCastle: false, isGameOver: false },
      resources: { food: 2, armySize: 5 },
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
      run: { stepCount: 0, hasFoundCastle: false, isGameOver: false },
      resources: { food: 1, armySize: 5 },
      encounter: null,
      ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
    }

    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next.resources.food).toBe(0)
    expect(next.resources.armySize).toBe(4)
  })

  it('camps can save you on the same move when hunger would drop army to 0', () => {
    const s = makeState()
    s.resources.food = 0
    s.resources.armySize = 1

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.run.isGameOver).toBe(false)
    expect(next.resources.armySize).toBeGreaterThan(0)
  })

  it('ready camps also grant food (+2), even if you arrive with 0', () => {
    const s = makeState()
    s.resources.food = 0
    s.resources.armySize = 3

    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.resources.food).toBe(2)

    if (ENABLE_ANIMATIONS) {
      const foodDeltas = next.ui.anim.active.filter((a): a is FoodDeltaAnim => a.kind === 'foodDelta')
      expect(foodDeltas.length).toBe(1)
      expect(foodDeltas[0]!.params.delta).toBe(2)
    }
  })

  it('when camp is not ready, hunger can still game-over and game-over message wins', () => {
    let s = makeState()

    // First visit: recruit (ready)
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const recruitedRng = s.world.rngState

    // Move away
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: -1 })!

    // Force hunger on return and force camp to be not-ready
    s.resources.food = 0
    s.resources.armySize = 1
    const campCell = s.world.cells[1]![1]!
    if (campCell.kind === 'camp') campCell.nextReadyStep = s.run.stepCount + CAMP_COOLDOWN_MOVES

    const back = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(back.world.rngState).toBe(recruitedRng)
    expect(back.run.isGameOver).toBe(true)
    expect(back.ui.message).toBe(expectedGameOverLine(back.world.seed, back.run.stepCount))
  })

  it('a camp can recruit again once cooldown has passed', () => {
    let s = makeState()
    s.resources.food = INITIAL_FOOD
    s.resources.armySize = 5

    // Step 1: recruit
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const campCellAfter = s.world.cells[1]![1]!
    expect(campCellAfter.kind).toBe('camp')
    expect(campCellAfter.kind === 'camp' ? campCellAfter.nextReadyStep : null).toBe(s.run.stepCount + CAMP_COOLDOWN_MOVES)

    // Move away.
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: -1 })!

    // Force ready and re-enter to validate the readiness predicate and second recruit path.
    const campCellForSecond = s.world.cells[1]![1]!
    if (campCellForSecond.kind === 'camp') campCellForSecond.nextReadyStep = s.run.stepCount
    const beforeArmy = s.resources.armySize
    const beforeRng = s.world.rngState
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!

    expect(s.resources.armySize).toBeGreaterThan(beforeArmy)
    expect(s.world.rngState).not.toBe(beforeRng)
  })

  it('ignores MOVE when game over', () => {
    const s = makeState()
    s.run.isGameOver = true
    const next = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(next).toBe(s)
  })

  it('ignores MOVE when you have already won (hasFoundCastle)', () => {
    const s = makeState()
    s.run.hasFoundCastle = true
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
