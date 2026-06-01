import { processAction } from '../../../src/core/processAction'
import {
  ACTION_MOVE,
  INITIAL_FOOD,
  INITIAL_GOLD,
  MOUNTAIN_AMBUSH_PERCENT,
  WOODS_AMBUSH_PERCENT,
} from '../../../src/core/constants'
import { MECHANIC_INDEX } from '../../../src/core/mechanics'
import type { CombatVariantConfig } from '../../../src/core/mechanics/defs/combat'
import { RNG } from '../../../src/core/rng'
import type { Cell, HengeCell, LairCell, State, World } from '../../../src/core/types'
import { makeResources } from './makeResources'

// Shared fixtures for v0.6 combat acceptance tests. Worlds are 3x3 with the
// destination terrain centered at (1, 1) and the player at (1, 0); a single
// `MOVE` step drives the on-enter handlers and (when the ambush roll fires)
// opens combat. Convention follows `tests/core/_helpers/makeResources.ts`.

// Find a seed that triggers the ambush roll for the destination cell on its
// first step. The `rollMoveEvent` flow in `terrainHazardsMechanic` keys the
// roll on `(seed, stepCount, cellId)`.
export function findAmbushSeed(opts: {
  cellId: number
  ambushPercent: number
  stepCount?: number
  startSeed?: number
}): number {
  const stepCount = opts.stepCount ?? 1
  for (let seed = opts.startSeed ?? 1; seed < 100000; seed++) {
    const p = RNG.keyedIntExclusive({ seed, stepCount, cellId: opts.cellId }, 100)
    if (p < opts.ambushPercent) return seed
  }
  throw new Error(`could not find ambush seed (cellId=${opts.cellId})`)
}

// Hand-build a 3x3 ambush world with `kind` at the centre (1,1) and the
// player at (1,0). `stepSouth` then steps onto the ambush tile. Used by
// both mountain (brigand) and woods (goblin) acceptance scenarios — only
// the centre kind and the ambush-percent for `findAmbushSeed` differ.
function stateOnAmbush(opts: {
  centreKind: 'mountain' | 'woods'
  ambushPercent: number
  playerArmy: number
  rngState?: number
  food?: number
  gold?: number
}): State {
  const cellId = 1 * 3 + 1
  const seed = findAmbushSeed({ cellId, ambushPercent: opts.ambushPercent })
  const world: World = {
    seed,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: opts.centreKind }, { kind: 'grass' }],
      [{ kind: 'grass' }, { kind: 'grass' }, { kind: 'grass' }],
    ],
    rngState: opts.rngState ?? 1,
  }
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
    },
    resources: makeResources({
      food: opts.food ?? INITIAL_FOOD,
      gold: opts.gold ?? INITIAL_GOLD,
      armySize: opts.playerArmy,
    }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

// Pre-seeded world that opens a mountain ambush on the player's first move
// south. `playerArmy` controls the spawn band via `rolledEnemySpawn`.
export function stateOnMountainAmbush(opts: { playerArmy: number; rngState?: number; food?: number; gold?: number }): State {
  return stateOnAmbush({ centreKind: 'mountain', ambushPercent: MOUNTAIN_AMBUSH_PERCENT, ...opts })
}

// Same shape as `stateOnMountainAmbush`, but the centre tile is woods so
// the move-event rolls a goblin ambush (post-T3.4 wiring).
export function stateOnWoodsAmbush(opts: { playerArmy: number; rngState?: number; food?: number; gold?: number }): State {
  return stateOnAmbush({ centreKind: 'woods', ambushPercent: WOODS_AMBUSH_PERCENT, ...opts })
}

// Drive the move that would trigger the ambush on the destination tile.
export function stepSouth(state: State): State {
  return processAction(state, { type: ACTION_MOVE, dx: 0, dy: 1 })!
}

// Hand-build a 3x3 world with a henge centre at (1,1). Henge has
// `ambushPercent: 100`, so the southward move always opens combat — no
// seed-finding required. `rngState` controls the henge's fresh-roll spawn
// (U[10..40] → first int draw).
export function stateOnHenge(opts: {
  hengeCell?: HengeCell
  playerArmy: number
  rngState?: number
  food?: number
  gold?: number
  stepCount?: number
}): State {
  const henge: HengeCell = opts.hengeCell ?? {
    kind: 'henge',
    id: 1 * 3 + 1,
    name: 'The Mending',
    nextReadyStep: 0,
    currentGroup: null,
  }
  const grass = (): Cell => ({ kind: 'grass' })
  const world: World = {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), henge, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: opts.rngState ?? 1,
  }
  return {
    world,
    player: { position: { x: 1, y: 0 } },
    run: {
      stepCount: opts.stepCount ?? 0,
      hasWon: false,
      isGameOver: false,
      knowsPosition: false,
      path: [],
      lostBufferStartIndex: null,
    },
    resources: makeResources({
      food: opts.food ?? INITIAL_FOOD,
      gold: opts.gold ?? INITIAL_GOLD,
      armySize: opts.playerArmy,
    }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

// Hand-build a 3x3 world with a single (un-bled) lair at (1,1) and the
// player at (1,0). A southward `processAction(MOVE)` opens the wyrm
// combat encounter — used by S10 to assert the recruit slot renders for
// every variant including wyrm. Mirrors the v0.5 wyrm acceptance fixture.
export function stateOnLair(opts: { playerArmy: number; food?: number; gold?: number }): State {
  const lair: LairCell = { kind: 'lair', id: 1 * 3 + 1, isBled: false }
  const grass = (): Cell => ({ kind: 'grass' })
  const world: World = {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), lair, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
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
    },
    resources: makeResources({
      food: opts.food ?? INITIAL_FOOD,
      gold: opts.gold ?? INITIAL_GOLD,
      armySize: opts.playerArmy,
    }),
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

// Read a henge cell back from the live state by id. Throws if the cell at
// the encounter's source position isn't a henge — tests should always know
// which kind they expect.
export function hengeCellAt(state: State, sourceCellId: number): HengeCell {
  const width = state.world.width
  const x = sourceCellId % width
  const y = Math.floor(sourceCellId / width)
  const cell = state.world.cells[y]?.[x]
  if (!cell || cell.kind !== 'henge') {
    throw new Error(`hengeCellAt: cell at ${sourceCellId} is not a henge`)
  }
  return cell
}

// Resolve the variant a combat encounter is wired to. Throws if the encounter
// is missing or the source cell has no variant — the test should always know
// which it expects.
export function variantOf(state: State): CombatVariantConfig {
  const enc = state.encounter
  if (!enc || enc.kind !== 'combat') throw new Error('variantOf: state has no combat encounter')
  const width = state.world.width
  const x = enc.sourceCellId % width
  const y = Math.floor(enc.sourceCellId / width)
  const cell = state.world.cells[y]?.[x]
  if (!cell) throw new Error(`variantOf: source cell out of bounds (${enc.sourceCellId})`)
  const variant = MECHANIC_INDEX.combatVariantByKind[cell.kind]
  if (!variant) throw new Error(`variantOf: no variant registered for kind '${cell.kind}'`)
  return variant
}
