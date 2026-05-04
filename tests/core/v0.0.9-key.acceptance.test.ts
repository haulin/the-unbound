import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_LOCKSMITH_LEAVE,
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_MOVE,
  ACTION_NEW_RUN,
  GOAL_NARRATIVE,
  INITIAL_FOOD,
} from '../../src/core/constants'
import type { State, World } from '../../src/core/types'

function newRun(seed = 1): State {
  const s = processAction(null, { type: ACTION_NEW_RUN, seed })
  if (!s) throw new Error('expected state')
  return s
}

function makeWorld(): World {
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    // Player starts at (1,0). Move South to Locksmith, then East to Gate.
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'locksmith' }, { kind: 'gate' }],
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
    ],
    rngState: 123,
  }
}

function makeState(): State {
  return {
    world: makeWorld(),
    player: { position: { x: 1, y: 0 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: INITIAL_FOOD, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false, hasTameBeast: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('v0.0.9 key acceptance', () => {
  it('never appends signpost clue on start (even if starting on signpost)', () => {
    let foundSignpostStart = false
    for (let seed = 1; seed <= 500; seed++) {
      const s = newRun(seed)
      const p = s.player.position
      const startKind = s.world.cells[p.y]![p.x]!.kind
      if (startKind !== 'signpost') continue
      foundSignpostStart = true
      expect(s.ui.message).toBe(GOAL_NARRATIVE)
      break
    }
    expect(foundSignpostStart).toBe(true)
  })

  it('gate is locked without key (no win)', () => {
    const s = makeState()
    const ontoGate = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 1 })!
    expect(ontoGate.run.hasWon).toBe(false)
    expect(ontoGate.ui.message.length).toBeGreaterThan(0)
  })

  it('buying key at locksmith costs 10 food and sets hasBronzeKey', () => {
    const s = makeState()
    s.resources.food = 12
    const ontoLocksmith = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const paid = processAction(ontoLocksmith, { type: ACTION_LOCKSMITH_PAY_FOOD })!
    expect(paid.resources.hasBronzeKey).toBe(true)
    // Move spends 1; carry cap clamps 11→10 before paying 10 for the key.
    expect(paid.resources.food).toBe(0)
  })

  it('cannot buy key without enough food', () => {
    const s = makeState()
    s.resources.food = 5
    const ontoLocksmith = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const tryBuy = processAction(ontoLocksmith, { type: ACTION_LOCKSMITH_PAY_FOOD })!
    expect(tryBuy.resources.hasBronzeKey).toBe(false)
  })

  it('gate opens with key (win, and gate cell becomes gateOpen)', () => {
    let s = makeState()
    s.resources.food = 12
    s = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    s = processAction(s, { type: ACTION_LOCKSMITH_PAY_FOOD })!
    s = processAction(s, { type: ACTION_LOCKSMITH_LEAVE })!
    const win = processAction(s, { type: ACTION_MOVE, dx: 1, dy: 0 })! // to gate
    expect(win.run.hasWon).toBe(true)
    expect(win.world.cells[1]![2]!.kind).toBe('gateOpen')
  })
})

