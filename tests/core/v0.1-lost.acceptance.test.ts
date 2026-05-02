import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  INITIAL_FOOD,
  LOST_COORD_LABEL,
  LOST_FLAVOR_LINES,
  SWAMP_LOST_PERCENT,
  TELEPORT_MIN_DISTANCE,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../src/core/constants'
import { manhattan, torusDelta } from '../../src/core/math'
import { RNG } from '../../src/core/rng'
import type { Cell, State, World } from '../../src/core/types'

function newRun(seed = 1): State {
  const s = processAction(null, { type: ACTION_NEW_RUN, seed })
  if (!s) throw new Error('expected state')
  return s
}

function blankWorld(opts: { center: Cell; rngState?: number }): World {
  // 5x5 grass world with `center` at (2,2). Player starts at (2,1) so a south
  // move enters `center`. Grass is non-orienting, non-lost, non-fight, so the
  // setup is inert apart from the centre tile.
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

function makeState(world: World): State {
  return {
    world,
    player: { position: { x: 2, y: 1 } },
    run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
    resources: { food: INITIAL_FOOD, armySize: 5, hasBronzeKey: false, hasScout: false },
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

// Find a {seed, stepCount, cellId} where the percentile lands in [lo, hi).
function findEventSeed(opts: { stepCount: number; cellId: number; lo: number; hi: number }): number {
  for (let seed = 1; seed < 200000; seed++) {
    const p = RNG._keyedIntExclusive({ seed, stepCount: opts.stepCount, cellId: opts.cellId }, 100)
    if (p >= opts.lo && p < opts.hi) return seed
  }
  throw new Error('no seed found in range')
}

describe('v0.1 lost acceptance', () => {
  // S1
  it('run starts unoriented; coord-display shows the lost label', () => {
    const s = newRun(1)
    expect(s.run.knowsPosition).toBe(false)
    expect(LOST_COORD_LABEL).toBe('??')
  })

  // S2
  it('stepping onto a signpost orients the player', () => {
    const s = makeState(blankWorld({ center: { kind: 'signpost' } }))
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.run.knowsPosition).toBe(true)
  })

  // S3
  it('stepping onto a farm orients the player', () => {
    const s = makeState(blankWorld({ center: { kind: 'farm', id: 12, name: 'The Stemming', nextReadyStep: 0 } }))
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.run.knowsPosition).toBe(true)
  })

  // S4
  it('gate and locksmith do not orient', () => {
    const s1 = makeState(blankWorld({ center: { kind: 'gate' } }))
    expect(processAction(s1, { type: ACTION_MOVE, dx: 0, dy: 1 })!.run.knowsPosition).toBe(false)
    const s2 = makeState(blankWorld({ center: { kind: 'locksmith' } }))
    expect(processAction(s2, { type: ACTION_MOVE, dx: 0, dy: 1 })!.run.knowsPosition).toBe(false)
  })

  // S5
  it('camps and henges do not orient', () => {
    const sCamp = makeState(blankWorld({ center: { kind: 'camp', id: 12, name: 'Ember Cross', nextReadyStep: 0 } }))
    expect(processAction(sCamp, { type: ACTION_MOVE, dx: 0, dy: 1 })!.run.knowsPosition).toBe(false)
    // Henge starts combat; we still expect knowsPosition to remain false.
    const sHenge = makeState(blankWorld({ center: { kind: 'henge', id: 12, name: 'The Mending', nextReadyStep: 0 } }))
    const next = processAction(sHenge, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.run.knowsPosition).toBe(false)
  })

  // S6
  it('starting tile is inert (no auto-orient even if signpost or farm)', () => {
    let foundSignpostStart = false
    for (let seed = 1; seed <= 1000 && !foundSignpostStart; seed++) {
      const s = newRun(seed)
      const cell = s.world.cells[s.player.position.y]![s.player.position.x]!
      if (cell.kind !== 'signpost' && cell.kind !== 'farm') continue
      foundSignpostStart = true
      expect(s.run.knowsPosition).toBe(false)
    }
    expect(foundSignpostStart).toBe(true)
  })

  // S7
  it('swamp can teleport the player', () => {
    // Pick a seed where percentile is in [0, SWAMP_LOST_PERCENT).
    const cellId = 2 * 5 + 2 // (2,2) on a 5x5
    const seed = findEventSeed({ stepCount: 1, cellId, lo: 0, hi: SWAMP_LOST_PERCENT })
    const w = blankWorld({ center: { kind: 'swamp' } })
    const s = makeState({ ...w, seed })
    s.run.knowsPosition = true // GIVEN the player knows their position.
    const before = { x: 2, y: 2 }
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.player.position).not.toEqual(before)
    const dx = torusDelta(before.x, next.player.position.x, 5)
    const dy = torusDelta(before.y, next.player.position.y, 5)
    expect(manhattan(dx, dy)).toBeGreaterThanOrEqual(TELEPORT_MIN_DISTANCE)
    const dest = next.world.cells[next.player.position.y]![next.player.position.x]!
    expect(['grass', 'road', 'mountain', 'lake', 'swamp', 'woods', 'rainbow']).toContain(dest.kind)
    expect(next.run.knowsPosition).toBe(false)
    const flavor: readonly string[] = LOST_FLAVOR_LINES
    expect(flavor.includes(next.ui.message)).toBe(true)
  })

  // S8
  it('woods can teleport the player', () => {
    const cellId = 2 * 5 + 2
    const seed = findEventSeed({
      stepCount: 1,
      cellId,
      lo: WOODS_AMBUSH_PERCENT,
      hi: WOODS_AMBUSH_PERCENT + WOODS_LOST_PERCENT,
    })
    const w = blankWorld({ center: { kind: 'woods' } })
    const s = makeState({ ...w, seed })
    s.run.knowsPosition = true
    const before = { x: 2, y: 2 }
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.player.position).not.toEqual(before)
    const dx = torusDelta(before.x, next.player.position.x, 5)
    const dy = torusDelta(before.y, next.player.position.y, 5)
    expect(manhattan(dx, dy)).toBeGreaterThanOrEqual(TELEPORT_MIN_DISTANCE)
    expect(next.run.knowsPosition).toBe(false)
    expect(next.encounter).toBe(null)
  })

  // S9
  it('combat and lost are mutually exclusive on a single move', () => {
    // Sample many seeds entering woods; for each, assert that teleport and combat
    // never co-occur.
    const cellId = 2 * 5 + 2
    let combats = 0
    let teleports = 0
    for (let seed = 1; seed <= 200; seed++) {
      const w = blankWorld({ center: { kind: 'woods' } })
      const s = makeState({ ...w, seed })
      s.run.knowsPosition = true
      const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
      const teleported = next.player.position.x !== 2 || next.player.position.y !== 2
      const inCombat = !!next.encounter
      // Cannot be both:
      expect(teleported && inCombat).toBe(false)
      if (teleported) teleports++
      if (inCombat) combats++
    }
    // Sanity: across 200 seeds we should observe both at least sometimes.
    expect(teleports).toBeGreaterThan(0)
    expect(combats).toBeGreaterThan(0)
  })

  // S10
  it('mountain ambushes are unchanged; mountain does not teleport', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const w = blankWorld({ center: { kind: 'mountain' } })
      const s = makeState({ ...w, seed })
      s.run.knowsPosition = true
      const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
      // Player position is the mountain tile (no teleport).
      expect(next.player.position).toEqual({ x: 2, y: 2 })
    }
  })

  // S11
  it('swamp does not start combat', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const w = blankWorld({ center: { kind: 'swamp' } })
      const s = makeState({ ...w, seed })
      s.run.knowsPosition = true
      const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
      expect(next.encounter).toBe(null)
    }
  })

  // S12
  it('becoming oriented again clears lost', () => {
    // After teleport, step onto a signpost in the new world.
    const cellId = 2 * 5 + 2
    const seed = findEventSeed({ stepCount: 1, cellId, lo: 0, hi: SWAMP_LOST_PERCENT })
    const w = blankWorld({ center: { kind: 'swamp' } })
    // Place a signpost adjacent to every grass tile (corner-safe): use (0,0).
    const cells = w.cells.map((row) => row.slice())
    cells[0]![0] = { kind: 'signpost' }
    const s = makeState({ ...w, seed, cells })
    s.run.knowsPosition = true
    const lost = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(lost.run.knowsPosition).toBe(false)
    // Now teleport again or just assert: stepping onto (0,0) signpost orients.
    // Easier: build a fresh state directly representing post-teleport.
    const after = makeState({ ...w, seed: 1, cells })
    after.player.position = { x: 1, y: 0 }
    after.run.knowsPosition = false
    const onto = processAction(after, { type: ACTION_MOVE, dx: -1, dy: 0 })!
    expect(onto.run.knowsPosition).toBe(true)
  })

  // S13
  it('teleport landing is inert (no tile effects, no event re-roll, no cost)', () => {
    const cellId = 2 * 5 + 2
    const seed = findEventSeed({ stepCount: 1, cellId, lo: 0, hi: SWAMP_LOST_PERCENT })
    const w = blankWorld({ center: { kind: 'swamp' } })
    const s = makeState({ ...w, seed })
    s.run.knowsPosition = true
    const foodBefore = s.resources.food
    const armyBefore = s.resources.armySize
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    // Move cost (1) + swamp enter cost (FOOD_COST_SWAMP=2-1=extra 1) is paid for entering the swamp.
    // Teleport itself adds no further cost: food == foodBefore - swamp enter cost (already in baseResources).
    // We check teleport adds no army loss and no tile-effect message changes.
    expect(next.resources.armySize).toBe(armyBefore)
    expect(foodBefore - next.resources.food).toBeLessThanOrEqual(2) // worst case: swamp cost 2; teleport adds nothing
    expect(next.encounter).toBe(null)
    // Landing tile is non-feature terrain, no farm food gain, etc.: message must be a lost flavor line.
    const flavor: readonly string[] = LOST_FLAVOR_LINES
    expect(flavor.includes(next.ui.message)).toBe(true)
  })

  // S14
  it('lost again is possible (no immune-after-teleport)', () => {
    // GIVEN the player does NOT know their position (just teleported in a prior step).
    // WHEN they step onto another swamp whose percentile lands in the lost bucket.
    // THEN the player is teleported again — being lost grants no immunity.
    const cellId = 2 * 5 + 2
    const seed = findEventSeed({ stepCount: 1, cellId, lo: 0, hi: SWAMP_LOST_PERCENT })
    const w = blankWorld({ center: { kind: 'swamp' } })
    const s = makeState({ ...w, seed })
    s.run.knowsPosition = false // already lost from a prior teleport
    const before = { x: 2, y: 2 }
    const next = processAction(s, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(next.player.position).not.toEqual(before) // teleport actually fired
    expect(next.run.knowsPosition).toBe(false)
  })
})
