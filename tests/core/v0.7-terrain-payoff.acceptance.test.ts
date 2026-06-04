import { describe, expect, it } from 'vitest'
import '../../src/core/mechanics'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  ENABLE_ANIMATIONS,
  FOOD_COST_DEFAULT,
  FOOD_COST_MOUNTAIN,
  FOOD_COST_SWAMP,
  MOUNTAIN_AMBUSH_PERCENT,
  MOUNTAIN_FIND_LINES,
  MOUNTAIN_FIND_PERCENT,
  RAINBOW_END_GOLD_PAYOUT,
  SWAMP_FIND_LINES,
  SWAMP_FIND_PERCENT,
  SWAMP_LOST_PERCENT,
  TERRAIN_LORE_BY_KIND,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../src/core/constants'
import { tryQuietFind } from '../../src/core/mechanics/encounterHelpers'
import { MOUNTAIN_QUIET_FIND } from '../../src/core/mechanics/defs/mountain'
import { SWAMP_QUIET_FIND } from '../../src/core/mechanics/defs/swamp'
import { RNG } from '../../src/core/rng'
import type { Cell, DeltaAnim, State, World } from '../../src/core/types'
import { findAmbushSeed } from './_helpers/v0.6Combat'
import { makeResources } from './_helpers/makeResources'

function grass(): Cell {
  return { kind: 'grass' }
}

function rainbowEnd(hasPaidOut: boolean): Cell {
  return { kind: 'rainbowEnd', id: 4, hasPaidOut }
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

function terrainWorld(opts: { seed: number; centreKind: 'swamp' | 'mountain' | 'woods' }): World {
  return {
    seed: opts.seed,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), { kind: opts.centreKind }, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(world: World, overrides?: Partial<State['resources']>): State {
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
    resources: makeResources({ food: 10, gold: 5, armySize: 10, ...overrides }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

function stepSouth(state: State): State {
  return processAction(state, { type: ACTION_MOVE, dx: 0, dy: 1 })!
}

const QUIET_CELL_ID = 4 // centre (1,1) on 3x3
const QUIET_STEP = 1

function findQuietFindSeed(kind: 'swamp' | 'mountain'): number {
  const quietLo = kind === 'swamp' ? SWAMP_LOST_PERCENT : MOUNTAIN_AMBUSH_PERCENT
  for (let seed = 1; seed < 200000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount: QUIET_STEP, cellId: QUIET_CELL_ID }, 100)
    if (p < quietLo) continue
    const rollSalt = kind === 'swamp' ? 'swamp.find.roll' : 'mountain.find.roll'
    const findRoll = RNG.keyedIntExclusive(
      {
        seed,
        stepCount: QUIET_STEP,
        cellId: QUIET_CELL_ID,
        salt: rollSalt,
      },
      100,
    )
    const findPercent = kind === 'swamp' ? SWAMP_FIND_PERCENT : MOUNTAIN_FIND_PERCENT
    if (findRoll < findPercent) return seed
  }
  throw new Error(`no quiet+find seed for ${kind}`)
}

function findLostSeed(): number {
  for (let seed = 1; seed < 200000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount: QUIET_STEP, cellId: QUIET_CELL_ID }, 100)
    if (p >= 0 && p < SWAMP_LOST_PERCENT) return seed
  }
  throw new Error('no swamp lost seed')
}

function findWoodsQuietSeed(): number {
  const quietLo = WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT
  for (let seed = 1; seed < 200000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount: QUIET_STEP, cellId: QUIET_CELL_ID }, 100)
    if (p >= quietLo) return seed
  }
  throw new Error('no woods quiet seed')
}

// Acceptance specs are drawn from
// `docs/plans/2026-06-02-v0.7-terrain-payoff-design.md`.
//
// Worlds are hand-built (no `generateWorld`) so each scenario isolates
// one observable behaviour.

describe('v0.7 terrain payoff acceptance', () => {
  // Move-step resource feedback: rainbow first visit enqueues a gold delta
  // on the move step (same frame as food/army), not only in combat reducers.
  it('rainbow first visit: gold inventory delta animates on move when animations enabled', () => {
    const s0 = makeState(makeWorld(rainbowEnd(false)))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(onto).not.toBeNull()

    expect(onto!.resources.gold).toBe(s0.resources.gold + RAINBOW_END_GOLD_PAYOUT)
    const cell = onto!.world.cells[1]![1]!
    expect(cell.kind).toBe('rainbowEnd')
    if (cell.kind === 'rainbowEnd') expect(cell.hasPaidOut).toBe(true)

    if (ENABLE_ANIMATIONS) {
      const goldDeltas = onto!.ui.anim.active.filter(
        (a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'gold',
      )
      expect(goldDeltas.some((d) => d.params.delta === RAINBOW_END_GOLD_PAYOUT)).toBe(true)
    }
  })

  describe('tryQuietFind (swamp/mountain specs)', () => {
    it('swamp quiet-find seed: food-primary payout with floor 0', () => {
      const seed = findQuietFindSeed('swamp')
      const world = terrainWorld({ seed, centreKind: 'swamp' })
      const keys = { seed, stepCount: QUIET_STEP, cellId: QUIET_CELL_ID }
      const tileRand = RNG.createTileRandom({ world, stepCount: QUIET_STEP, pos: { x: 1, y: 1 } })
      const base = makeResources({ food: 10, gold: 3 })
      const ctx = { tileMessage: '', rngKeys: keys, tileRand, resources: base }
      const out = tryQuietFind(SWAMP_QUIET_FIND, ctx)
      expect(out).toBeDefined()
      expect(out!.resources!.food).toBeGreaterThan(base.food)
      expect(out!.resources!.gold).toBeGreaterThanOrEqual(base.gold)
      expect(SWAMP_FIND_LINES).toContain(out!.message)
    })

    it('mountain quiet-find seed: gold-primary payout with floor 0', () => {
      const seed = findQuietFindSeed('mountain')
      const world = terrainWorld({ seed, centreKind: 'mountain' })
      const keys = { seed, stepCount: QUIET_STEP, cellId: QUIET_CELL_ID }
      const tileRand = RNG.createTileRandom({ world, stepCount: QUIET_STEP, pos: { x: 1, y: 1 } })
      const base = makeResources({ food: 10, gold: 3 })
      const ctx = { tileMessage: '', rngKeys: keys, tileRand, resources: base }
      const out = tryQuietFind(MOUNTAIN_QUIET_FIND, ctx)
      expect(out).toBeDefined()
      expect(out!.resources!.gold).toBeGreaterThan(base.gold)
      expect(MOUNTAIN_FIND_LINES).toContain(out!.message)
    })
  })

  it('swamp quiet find seed: lore is swamp find line and food rises', () => {
    const seed = findQuietFindSeed('swamp')
    const s0 = makeState(terrainWorld({ seed, centreKind: 'swamp' }))
    const next = stepSouth(s0)

    expect(SWAMP_FIND_LINES).toContain(next.ui.message)
    expect(TERRAIN_LORE_BY_KIND.swamp).not.toContain(next.ui.message)
    expect(next.resources.food).toBeGreaterThan(s0.resources.food)
    expect(next.resources.gold).toBeGreaterThanOrEqual(s0.resources.gold)

    if (ENABLE_ANIMATIONS) {
      const foodGain = next.resources.food - s0.resources.food + FOOD_COST_SWAMP
      const foodDeltas = next.ui.anim.active.filter(
        (a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'food',
      )
      expect(foodDeltas.some((d) => d.params.delta === foodGain)).toBe(true)
    }
  })

  it('mountain quiet find seed: lore is mountain find line and gold rises', () => {
    const seed = findQuietFindSeed('mountain')
    const s0 = makeState(terrainWorld({ seed, centreKind: 'mountain' }))
    const next = stepSouth(s0)

    expect(MOUNTAIN_FIND_LINES).toContain(next.ui.message)
    expect(TERRAIN_LORE_BY_KIND.mountain).not.toContain(next.ui.message)
    expect(next.resources.gold).toBeGreaterThan(s0.resources.gold)

    if (ENABLE_ANIMATIONS) {
      const goldGain = next.resources.gold - s0.resources.gold
      const goldDeltas = next.ui.anim.active.filter(
        (a): a is DeltaAnim => a.kind === 'delta' && a.params.target === 'gold',
      )
      expect(goldDeltas.some((d) => d.params.delta === goldGain)).toBe(true)
    }
  })

  it('mountain ambush seed: combat opens with no terrain find payout', () => {
    const seed = findAmbushSeed({ cellId: QUIET_CELL_ID, ambushPercent: MOUNTAIN_AMBUSH_PERCENT })
    const s0 = makeState(terrainWorld({ seed, centreKind: 'mountain' }))
    const next = stepSouth(s0)

    expect(next.encounter?.kind).toBe('combat')
    expect(next.resources.gold).toBe(s0.resources.gold)
    expect(next.resources.food).toBe(s0.resources.food - FOOD_COST_MOUNTAIN)
  })

  it('swamp lost seed: teleport with no terrain find payout', () => {
    const seed = findLostSeed()
    const s0 = makeState(terrainWorld({ seed, centreKind: 'swamp' }))
    const next = stepSouth(s0)

    expect(next.player.position).not.toEqual({ x: 1, y: 1 })
    expect(next.resources.gold).toBe(s0.resources.gold)
    expect(next.resources.food).toBe(s0.resources.food - FOOD_COST_SWAMP)
  })

  it('woods quiet seed: no swamp/mountain find payout on step', () => {
    const seed = findWoodsQuietSeed()
    const s0 = makeState(terrainWorld({ seed, centreKind: 'woods' }))
    const next = stepSouth(s0)

    expect(next.encounter).toBeNull()
    expect(next.resources.gold).toBe(s0.resources.gold)
    expect(next.resources.food).toBe(s0.resources.food - FOOD_COST_DEFAULT)
    expect(SWAMP_FIND_LINES).not.toContain(next.ui.message)
    expect(MOUNTAIN_FIND_LINES).not.toContain(next.ui.message)
  })
})
