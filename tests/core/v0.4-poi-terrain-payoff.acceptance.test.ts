import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_FARM_BUY_BEAST,
  ACTION_FARM_BUY_FOOD,
  ACTION_FARM_LEAVE,
  ACTION_LOCKSMITH_LEAVE,
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
  ACTION_MOVE,
  ACTION_TOWN_BUY_FOOD,
  FISHING_LAKE_COOLDOWN_LINES,
  FISHING_LAKE_COOLDOWN_MOVES,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  RAINBOW_END_GOLD_PAYOUT,
  RAINBOW_END_SPENT_LINES,
} from '../../src/core/constants'
import type { Cell, State, TownCell, World } from '../../src/core/types'
import { FOOD_CARRY_FULL_MESSAGE } from '../../src/core/foodCarry'

function grass(): Cell {
  return { kind: 'grass' }
}

function fishingLake(nextReadyStep: number): Cell {
  return { kind: 'fishingLake', id: 4, nextReadyStep }
}

function rainbowEnd(hasPaidOut: boolean): Cell {
  return { kind: 'rainbowEnd', id: 4, hasPaidOut }
}

function townAtCapTest(): TownCell {
  return {
    kind: 'town',
    id: 44,
    name: 'Capford',
    offers: ['buyFood', 'buyTroops'],
    prices: { foodGold: 3, troopsGold: 5, scoutGold: 10, rumorGold: 3 },
    bundles: { food: 3, troops: 1 },
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

function makeState(world: World): State {
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
    resources: {
      food: 5,
      gold: 0,
      armySize: 5,
      hasBronzeKey: false,
      hasScout: false,
      hasTameBeast: false,
    },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

describe('v0.4 POI + terrain payoff acceptance (harness)', () => {
  it('sanity: MOVE onto grass increments run.stepCount', () => {
    const s0 = makeState(makeWorld(grass()))
    const after = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(after).not.toBeNull()
    expect(after!.run.stepCount).toBe(s0.run.stepCount + 1)
  })

  it('fishingLake when ready: grants 1..3 food (after move cost) and sets cooldown from this step', () => {
    const s0 = makeState(makeWorld(fishingLake(0)))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(onto).not.toBeNull()
    const gain = onto!.resources.food - (s0.resources.food - 1)
    expect(gain).toBeGreaterThanOrEqual(1)
    expect(gain).toBeLessThanOrEqual(3)
    const cell = onto!.world.cells[1]![1]!
    expect(cell.kind).toBe('fishingLake')
    if (cell.kind === 'fishingLake') {
      expect(cell.nextReadyStep).toBe(onto!.run.stepCount + FISHING_LAKE_COOLDOWN_MOVES)
    }
  })

  it('fishingLake on cooldown: no food beyond move cost; cooldown line in message', () => {
    const s0 = makeState(makeWorld(fishingLake(999)))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(onto).not.toBeNull()
    expect(onto!.resources.food).toBe(s0.resources.food - 1)
    const gain = onto!.resources.food - (s0.resources.food - 1)
    expect(gain).toBe(0)
    expect(FISHING_LAKE_COOLDOWN_LINES.some((l) => onto!.ui.message.includes(l))).toBe(true)
  })

  it('rainbowEnd first visit: +RAINBOW_END_GOLD_PAYOUT gold and hasPaidOut true', () => {
    const s0 = makeState(makeWorld(rainbowEnd(false)))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(onto).not.toBeNull()
    expect(onto!.resources.gold).toBe(s0.resources.gold + RAINBOW_END_GOLD_PAYOUT)
    const cell = onto!.world.cells[1]![1]!
    expect(cell.kind).toBe('rainbowEnd')
    if (cell.kind === 'rainbowEnd') expect(cell.hasPaidOut).toBe(true)
  })

  it('town buy food at carry cap: no gold or food spent; shows carry-full message', () => {
    const town = townAtCapTest()
    const w = makeWorld(town)
    const s0: State = {
      ...makeState(w),
      player: { position: { x: 1, y: 1 } },
      resources: {
        food: 10,
        gold: 99,
        armySize: 5,
        hasBronzeKey: false,
        hasScout: false,
        hasTameBeast: false,
      },
      encounter: { kind: 'town', sourceKind: 'town', sourceCellId: town.id, restoreMessage: 'x' },
    }
    const after = processAction(s0, { type: ACTION_TOWN_BUY_FOOD })!
    expect(after.resources.gold).toBe(99)
    expect(after.resources.food).toBe(10)
    expect(after.ui.message.length).toBeGreaterThan(0)
    expect(after.ui.message).toContain(FOOD_CARRY_FULL_MESSAGE)
  })

  it('rainbowEnd revisit spent: gold unchanged; spent line in message', () => {
    const s0 = makeState(makeWorld(rainbowEnd(true)))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(onto).not.toBeNull()
    expect(onto!.resources.gold).toBe(s0.resources.gold)
    expect(RAINBOW_END_SPENT_LINES.some((l) => onto!.ui.message.includes(l))).toBe(true)
  })
})

describe('v0.4 farm modal', () => {
  it('stepping onto a farm starts an encounter and blocks MOVE until leave', () => {
      const w = makeWorld({ kind: 'farm', id: 4, name: 'Greyfield', beastGoldCost: 10 })
    const s0 = makeState(w)

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('farm')

    const ignored = processAction(onto, { type: ACTION_MOVE, dx: 1, dy: 0 })!
    expect(ignored).toBe(onto)

    const left = processAction(onto, { type: ACTION_FARM_LEAVE })!
    expect(left.encounter).toBe(null)
  })

  it('buy food trades 3g->3f and rejects when at cap', () => {
      const w = makeWorld({ kind: 'farm', id: 4, name: 'Greyfield', beastGoldCost: 10 })
    const s0 = makeState(w)
    s0.resources.gold = 3
    s0.resources.food = 10
    s0.resources.armySize = 5 // cap=10

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    // Lower food so we can observe the +3 easily.
    const setup = { ...onto, resources: { ...onto.resources, food: 4 } }
    const bought = processAction(setup, { type: ACTION_FARM_BUY_FOOD })!
    expect(bought.resources.gold).toBe(0)
    expect(bought.resources.food).toBe(7)

    // Put food at cap and try again.
    const atCap = { ...bought, resources: { ...bought.resources, gold: 3, food: 10 } }
    const rejected = processAction(atCap, { type: ACTION_FARM_BUY_FOOD })!
    expect(rejected.resources.gold).toBe(3)
    expect(rejected.resources.food).toBe(10)
    expect(rejected.ui.message.length).toBeGreaterThan(0)
    expect(rejected.ui.message).toContain(FOOD_CARRY_FULL_MESSAGE)
  })

  it('buy beast spends farm-specific cost and sets hasTameBeast once', () => {
      const w = makeWorld({ kind: 'farm', id: 4, name: 'Greyfield', beastGoldCost: 10 })
    const s0 = makeState(w)
    s0.resources.gold = 10

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const beast = processAction(onto, { type: ACTION_FARM_BUY_BEAST })!
    expect(beast.resources.hasTameBeast).toBe(true)
    expect(beast.resources.gold).toBe(0)

    const again = processAction(beast, { type: ACTION_FARM_BUY_BEAST })!
    expect(again.resources.hasTameBeast).toBe(true)
    expect(again.ui.message.length).toBeGreaterThan(0)
  })
})

describe('v0.4 locksmith modal', () => {
  it('stepping onto locksmith starts encounter; pay gold grants key; revisit is no-op', () => {
    const w = makeWorld({ kind: 'locksmith' })
    const s0 = makeState(w)
    s0.resources.gold = LOCKSMITH_KEY_GOLD_COST

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.encounter?.kind).toBe('locksmith')
    expect(onto.resources.hasBronzeKey).toBe(false)

    const paid = processAction(onto, { type: ACTION_LOCKSMITH_PAY_GOLD })!
    expect(paid.resources.hasBronzeKey).toBe(true)
    expect(paid.resources.gold).toBe(0)

    const revisit = processAction(paid, { type: ACTION_LOCKSMITH_PAY_GOLD })!
    expect(revisit.resources.gold).toBe(0)
    expect(revisit.ui.message.length).toBeGreaterThan(0)
  })

  it('pay food grants key', () => {
    const w = makeWorld({ kind: 'locksmith' })
    const s0 = makeState(w)
    // Need to have enough after MOVE cost is paid on entry.
    s0.resources.food = LOCKSMITH_KEY_FOOD_COST + 1

    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const paid = processAction(onto, { type: ACTION_LOCKSMITH_PAY_FOOD })!
    expect(paid.resources.hasBronzeKey).toBe(true)
    expect(paid.resources.food).toBe(0)
  })

  it('leave ends encounter and restores MOVE', () => {
    const w = makeWorld({ kind: 'locksmith' })
    const s0 = makeState(w)
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const left = processAction(onto, { type: ACTION_LOCKSMITH_LEAVE })!
    expect(left.encounter).toBe(null)
  })
})
