import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_FIGHT, ACTION_RETURN } from '../../src/core/constants'
import type { State, World } from '../../src/core/types'

// When the run is over (game-over or won), the encounter dispatcher must skip the
// per-encounter handler entirely and return prevState unchanged. Mechanics rely on
// this gate so they don't have to defensively check `run.isGameOver` themselves.

function makeState(): State {
  const world: World = {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'henge', id: 4, name: 'X', nextReadyStep: 0 }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
    ],
    rngState: 1,
  }
  return {
    world,
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: 5, gold: 0, armySize: 3, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: { kind: 'combat', enemyArmySize: 4, sourceKind: 'henge', sourceCellId: 4, restoreMessage: 'X' },
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('reducer encounter dispatcher: gated by run.isGameOver / run.hasWon', () => {
  it('ACTION_FIGHT on a game-over state returns prevState unchanged (handler not invoked)', () => {
    const prev: State = { ...makeState(), run: { ...makeState().run, isGameOver: true } }
    const next = processAction(prev, { type: ACTION_FIGHT })!
    expect(next).toBe(prev)
  })

  it('ACTION_RETURN on a game-over state returns prevState unchanged', () => {
    const prev: State = { ...makeState(), run: { ...makeState().run, isGameOver: true } }
    const next = processAction(prev, { type: ACTION_RETURN })!
    expect(next).toBe(prev)
  })

  it('ACTION_FIGHT on a won state returns prevState unchanged', () => {
    const prev: State = { ...makeState(), run: { ...makeState().run, hasWon: true } }
    const next = processAction(prev, { type: ACTION_FIGHT })!
    expect(next).toBe(prev)
  })
})
