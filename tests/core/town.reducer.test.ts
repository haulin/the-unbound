import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
  BARKEEP_TIPS,
  ENABLE_ANIMATIONS,
  TOWN_BUY_LINES,
  TOWN_NO_GOLD_LINES,
  TOWN_SCOUT_ALREADY_HAVE_LINES,
  TOWN_SCOUT_HIRE_LINES,
} from '../../src/core/constants'
import { RNG } from '../../src/core/rng'
import type { Cell, DeltaAnim, GridTransitionAnim, State, TownCell, World } from '../../src/core/types'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(seed: number): { world: World; town: TownCell } {
  const town: TownCell = {
    kind: 'town',
    id: 4,
    name: 'Stonebridge',
    offers: ['buyFood', 'buyTroops', 'hireScout'],
    prices: { foodGold: 3, troopsGold: 5, scoutGold: 12, rumorGold: 3 },
    bundles: { food: 3, troops: 2 },
  }
  const world: World = {
    seed,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), town, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
  return { world, town }
}

function makeState(seed = 7): State {
  const { world } = makeWorld(seed)
  return {
    world,
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 10, hasWon: false, isGameOver: false, knowsPosition: true, path: [], lostBufferStartIndex: null },
    resources: { food: 0, gold: 0, armySize: 5, hasBronzeKey: false, hasScout: false },
    encounter: { kind: 'town', sourceKind: 'town', sourceCellId: 4, restoreMessage: 'restored' },
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('town reducer', () => {
  it('buy food: pays gold and grants food (repeatable)', () => {
    const s0 = makeState()
    s0.resources.gold = 6

    const s1 = processAction(s0, { type: ACTION_TOWN_BUY_FOOD })!
    expect(s1.resources.gold).toBe(3)
    expect(s1.resources.food).toBe(3)

    const s2 = processAction(s1, { type: ACTION_TOWN_BUY_FOOD })!
    expect(s2.resources.gold).toBe(0)
    expect(s2.resources.food).toBe(6)
  })

  it('successful buy copy uses a run-global cursor (no repeats across purchases until cycling)', () => {
    expect(TOWN_BUY_LINES.length).toBeGreaterThan(1)
    const s0 = makeState()
    s0.resources.gold = 999

    const s1 = processAction(s0, { type: ACTION_TOWN_BUY_FOOD })!
    const s2 = processAction(s1, { type: ACTION_TOWN_BUY_TROOPS })!

    expect(s1.run.copyCursors?.['town.buyFeedback']).toBe(1)
    expect(s2.run.copyCursors?.['town.buyFeedback']).toBe(2)

    const body1 = s1.ui.message.split('\n').slice(1).join('\n')
    const body2 = s2.ui.message.split('\n').slice(1).join('\n')
    expect(TOWN_BUY_LINES.includes(body1)).toBe(true)
    expect(TOWN_BUY_LINES.includes(body2)).toBe(true)
    expect(body1).not.toBe(body2)
  })

  it('buy troops: pays gold and grants armySize', () => {
    const s0 = makeState()
    s0.resources.gold = 5

    const next = processAction(s0, { type: ACTION_TOWN_BUY_TROOPS })!
    expect(next.resources.gold).toBe(0)
    expect(next.resources.armySize).toBe(7)
  })

  it('hire scout: pays gold and sets hasScout', () => {
    const s0 = makeState()
    s0.resources.gold = 12

    const next = processAction(s0, { type: ACTION_TOWN_HIRE_SCOUT })!
    expect(next.resources.hasScout).toBe(true)
    expect(next.resources.gold).toBe(0)

    const expectedLine = RNG.createRunCopyRandom(s0).perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: 4 })
    expect(next.ui.message).toBe(`Stonebridge Town\n${expectedLine}`)
  })

  it('hire scout when already owned shows lore and changes nothing', () => {
    const s0 = makeState()
    s0.resources.gold = 999
    s0.resources.hasScout = true

    const next = processAction(s0, { type: ACTION_TOWN_HIRE_SCOUT })!
    expect(next.resources).toEqual(s0.resources)

    const expectedLine = RNG.createRunCopyRandom(s0).perMoveLine(TOWN_SCOUT_ALREADY_HAVE_LINES, { cellId: 4 })
    expect(next.ui.message).toBe(`Stonebridge Town\n${expectedLine}`)
  })

  it('buy rumor: pays gold and shows rumor line', () => {
    const s0 = makeState()
    s0.resources.gold = 3

    const next = processAction(s0, { type: ACTION_TOWN_BUY_RUMOR })!
    expect(next.resources.gold).toBe(0)

    // Rumors cycle through the pool per-purchase (deterministic base + cursor).
    expect(next.ui.message.startsWith('Stonebridge Town\n')).toBe(true)
    const body = next.ui.message.split('\n').slice(1).join('\n')
    const pool = ([] as string[]).concat(
      ...Object.values(BARKEEP_TIPS).map((v) => Array.from(v as any)),
      ['Someone saw the Locksmith three nights ago.'],
    )
    expect(pool.includes(body)).toBe(true)
  })

  it('insufficient gold: shows lore and changes nothing', () => {
    const s0 = makeState()
    s0.resources.gold = 0

    const next = processAction(s0, { type: ACTION_TOWN_BUY_TROOPS })!
    expect(next.resources).toEqual(s0.resources)

    const expectedLine = RNG.createRunCopyRandom(s0).perMoveLine(TOWN_NO_GOLD_LINES, { cellId: 4 })
    expect(next.ui.message).toBe(`Stonebridge Town\n${expectedLine}`)
  })

  it('leave: clears encounter and restores message (and animates when enabled)', () => {
    const s0 = makeState()
    s0.ui.message = 'in town'

    const next = processAction(s0, { type: ACTION_TOWN_LEAVE })!
    expect(next.encounter).toBe(null)
    expect(next.ui.message).toBe('restored')

    if (ENABLE_ANIMATIONS) {
      const trans = next.ui.anim.active.filter((a): a is GridTransitionAnim => a.kind === 'gridTransition')
      expect(trans.some((a) => a.params.from === 'town' && a.params.to === 'overworld')).toBe(true)
    }
  })

  it('successful purchases enqueue goldDelta when animations enabled', () => {
    const s0 = makeState()
    s0.resources.gold = 3

    const next = processAction(s0, { type: ACTION_TOWN_BUY_FOOD })!
    if (!ENABLE_ANIMATIONS) return
    const deltas = next.ui.anim.active.filter((a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'gold')
    expect(deltas.some((d) => d.params.delta === -3)).toBe(true)

    const body = next.ui.message.split('\n').slice(1).join('\n')
    expect(TOWN_BUY_LINES.includes(body)).toBe(true)
  })
})

