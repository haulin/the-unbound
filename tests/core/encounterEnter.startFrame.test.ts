import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  ENABLE_ANIMATIONS,
  INITIAL_ARMY_SIZE,
  INITIAL_FOOD,
  MOUNTAIN_AMBUSH_PERCENT,
  MOVE_SLIDE_FRAMES,
  WOODS_AMBUSH_PERCENT,
} from '../../src/core/constants'
import { RNG } from '../../src/core/rng'
import type {
  Action,
  CampCell,
  Cell,
  FarmCell,
  GridTransitionAnim,
  HengeCell,
  State,
  TownCell,
  TownOfferKind,
  World,
} from '../../src/core/types'

// Regression lock for the entire class of "encounter grid-transition fires at the wrong frame"
// bugs. The contract is: when entering an encounter modal, the gridTransition anim must be
// scheduled at exactly `startFrame + MOVE_SLIDE_FRAMES` (i.e. fires the moment the move-slide
// reveal completes — not before, not after). One earlier regression double-counted the offset
// because both defs and the reducer added `MOVE_SLIDE_FRAMES`; this suite covers all 6
// encounter-opening paths so a similar bug in any one mechanic trips a test.

function blankWorldWith(opts: { center: Cell; rngState?: number }): World {
  const grass = (): Cell => ({ kind: 'grass' })
  return {
    seed: 1,
    width: 5,
    height: 5,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass(), grass(), grass()],
      [grass(), grass(), grass(), grass(), grass()],
      [grass(), grass(), opts.center, grass(), grass()],
      [grass(), grass(), grass(), grass(), grass()],
      [grass(), grass(), grass(), grass(), grass()],
    ],
    rngState: opts.rngState ?? 12345,
  }
}

function stateAt(world: World, opts: { hasBronzeKey?: boolean } = {}): State {
  return {
    world,
    player: { position: { x: 2, y: 1 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: {
      food: INITIAL_FOOD,
      gold: 100,
      armySize: INITIAL_ARMY_SIZE,
      hasBronzeKey: opts.hasBronzeKey ?? false,
      hasScout: false,
      hasTameBeast: false,
    },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

const moveSouth: Action = { type: ACTION_MOVE, dx: 0, dy: 1 }

// Find a world.seed where the percentile (keyed by {seed, stepCount=1, cellId}) falls in the
// ambush band. cellId for the center (2,2) of a 5x5 world is `y*width + x` = 12.
function findAmbushSeed(ambushPercent: number, cellId = 12, stepCount = 1): number {
  for (let seed = 1; seed < 200000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount, cellId }, 100)
    if (p < ambushPercent) return seed
  }
  throw new Error('no ambush seed found')
}

function gridTransition(state: State, from: string, to: string): GridTransitionAnim | undefined {
  return state.ui.anim.active
    .filter((a): a is GridTransitionAnim => a.kind === 'gridTransition')
    .find((a) => a.params.from === from && a.params.to === to)
}

describe('encounter-enter grid transitions fire at startFrame + MOVE_SLIDE_FRAMES', () => {
  if (!ENABLE_ANIMATIONS) {
    it('animations disabled — skipped', () => {
      expect(ENABLE_ANIMATIONS).toBe(false)
    })
    return
  }

  it('camp', () => {
    const camp: CampCell = { kind: 'camp', id: 1, name: 'Ember', nextReadyStep: 0 }
    const next = processAction(stateAt(blankWorldWith({ center: camp })), moveSouth)!
    const t = gridTransition(next, 'overworld', 'camp')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })

  it('town', () => {
    const town: TownCell = {
      kind: 'town',
      id: 2,
      name: 'Harbor',
      offers: ['buyFood', 'buyTroops', 'hireScout'] as TownOfferKind[],
      bundles: { food: 5, troops: 2 },
      prices: { foodGold: 5, troopsGold: 10, scoutGold: 20, rumorGold: 3 },
    }
    const next = processAction(stateAt(blankWorldWith({ center: town })), moveSouth)!
    const t = gridTransition(next, 'overworld', 'town')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })

  it('farm', () => {
    const farm: FarmCell = { kind: 'farm', id: 3, name: 'Heron', beastGoldCost: 10 }
    const next = processAction(stateAt(blankWorldWith({ center: farm })), moveSouth)!
    const t = gridTransition(next, 'overworld', 'farm')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })

  it('locksmith', () => {
    const next = processAction(stateAt(blankWorldWith({ center: { kind: 'locksmith' } })), moveSouth)!
    const t = gridTransition(next, 'overworld', 'locksmith')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })

  it('henge → combat (ambushPercent: 100, always fights when ready)', () => {
    const henge: HengeCell = { kind: 'henge', id: 4, name: 'The Mending', nextReadyStep: 0 }
    const next = processAction(stateAt(blankWorldWith({ center: henge })), moveSouth)!
    const t = gridTransition(next, 'overworld', 'combat')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })

  it('terrainHazards (woods → combat) on an ambush-rolling seed', () => {
    const seed = findAmbushSeed(WOODS_AMBUSH_PERCENT)
    const world = { ...blankWorldWith({ center: { kind: 'woods' } }), seed }
    const next = processAction(stateAt(world), moveSouth)!
    const t = gridTransition(next, 'overworld', 'combat')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })

  it('terrainHazards (mountain → combat) on an ambush-rolling seed', () => {
    const seed = findAmbushSeed(MOUNTAIN_AMBUSH_PERCENT)
    const world = { ...blankWorldWith({ center: { kind: 'mountain' } }), seed }
    const next = processAction(stateAt(world), moveSouth)!
    const t = gridTransition(next, 'overworld', 'combat')
    expect(t).toBeDefined()
    expect(t!.startFrame).toBe(MOVE_SLIDE_FRAMES)
  })
})
