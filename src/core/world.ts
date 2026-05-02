import {
  CAMP_COUNT,
  CAMP_NAME_POOL,
  FARM_COUNT,
  FARM_NAME_POOL,
  GATE_LOCKSMITH_MIN_DISTANCE,
  HENGE_COUNT,
  HENGE_NAME_POOL,
  MAP_GEN_ALGORITHM,
  NOISE_SMOOTH_PASSES,
  NOISE_VALUE_MAX,
  SIGNPOST_COUNT,
  TERRAIN_KINDS,
  TOWN_COUNT,
  TOWN_FOOD_BUNDLE,
  TOWN_NAME_POOL,
  TOWN_PRICE_FOOD_MAX,
  TOWN_PRICE_FOOD_MIN,
  TOWN_PRICE_RUMOR_MAX,
  TOWN_PRICE_RUMOR_MIN,
  TOWN_PRICE_SCOUT_MAX,
  TOWN_PRICE_SCOUT_MIN,
  TOWN_PRICE_TROOPS_MAX,
  TOWN_PRICE_TROOPS_MIN,
  TOWN_TROOPS_BUNDLE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  spriteIdForKind,
} from './constants'
import { manhattan, torusDelta, wrapIndex } from './math'
import { RNG } from './rng'
import type { Cell, CellGrid, GeneratedWorld, Vec2, World } from './types'

function cellId(x: number, y: number): number {
  return y * WORLD_WIDTH + x
}

const TERRAIN_KIND_SET = new Set<string>(TERRAIN_KINDS)

function isTerrainCell(cell: Cell): boolean {
  return TERRAIN_KIND_SET.has(cell.kind)
}

function torusManhattanDistance(a: Vec2, b: Vec2): number {
  const dx = torusDelta(a.x, b.x, WORLD_WIDTH)
  const dy = torusDelta(a.y, b.y, WORLD_HEIGHT)
  return manhattan(dx, dy)
}

type PlaceFeatureOpts = {
  count: number
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (x: number, y: number, rngState: number) => { cell: Cell; rngState: number }
}

function placeFeature(cells: CellGrid, rngState: number, opts: PlaceFeatureOpts): { placed: Vec2[]; rngState: number } {
  const placed: Vec2[] = []
  while (placed.length < opts.count) {
    const r = RNG._int(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)

    const here = cells[y]![x]!
    if (!opts.canPlaceAt(x, y, here)) continue

    const built = opts.buildCell(x, y, rngState)
    rngState = built.rngState
    cells[y]![x] = built.cell
    placed.push({ x, y })
  }
  return { placed, rngState }
}

function boxBlurIntGridWrap(grid: number[][], w: number, h: number) {
  const out: number[][] = []
  for (let y = 0; y < h; y++) {
    const row: number[] = []
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = wrapIndex(x + dx, w)
          const ny = wrapIndex(y + dy, h)
          sum += grid[ny]![nx]!
        }
      }
      row.push(Math.floor(sum / 9))
    }
    out.push(row)
  }
  return out
}

function generateBaseTerrainCells(rngState: number): { cells: CellGrid; rngState: number } {
  const vals: number[][] = []
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: number[] = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const r = RNG._int(rngState, NOISE_VALUE_MAX)
      rngState = r.rngState
      row.push(r.value)
    }
    vals.push(row)
  }

  let V = vals
  for (let p = 0; p < NOISE_SMOOTH_PASSES; p++) {
    V = boxBlurIntGridWrap(V, WORLD_WIDTH, WORLD_HEIGHT)
  }

  let minV = V[0]![0]!
  let maxV = V[0]![0]!
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const v = V[y]![x]!
      if (v < minV) minV = v
      if (v > maxV) maxV = v
    }
  }

  const span = maxV - minV || 1
  const kindByBucket = TERRAIN_KINDS
  const bucketCount = kindByBucket.length
  const cells: CellGrid = []

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: Cell[] = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      let bucket = Math.floor((bucketCount * (V[y]![x]! - minV)) / span)
      if (bucket < 0) bucket = 0
      if (bucket >= bucketCount) bucket = bucketCount - 1
      row.push({ kind: kindByBucket[bucket]! })
    }
    cells.push(row)
  }

  return { cells, rngState }
}

function placeGate(cells: CellGrid, rngState: number): { gatePos: Vec2; rngState: number } {
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: (_x, _y, nextRng) => ({ cell: { kind: 'gate' }, rngState: nextRng }),
  })
  return { gatePos: res.placed[0]!, rngState: res.rngState }
}

function placeLocksmith(cells: CellGrid, rngState: number, gatePos: Vec2): { locksmithPos: Vec2; rngState: number } {
  const maxPossible = Math.floor(WORLD_WIDTH / 2) + Math.floor(WORLD_HEIGHT / 2)
  const minD = Math.max(0, Math.min(GATE_LOCKSMITH_MIN_DISTANCE | 0, maxPossible))
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (x, y, here) => isTerrainCell(here) && torusManhattanDistance({ x, y }, gatePos) >= minD,
    buildCell: (_x, _y, nextRng) => ({ cell: { kind: 'locksmith' }, rngState: nextRng }),
  })
  return { locksmithPos: res.placed[0]!, rngState: res.rngState }
}

type PlaceNamedFeatureOpts = {
  count: number
  namePool: readonly string[]
  fallbackName: string
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (x: number, y: number, name: string) => Cell
}

function placeNamedFeature(cells: CellGrid, rngState: number, opts: PlaceNamedFeatureOpts): number {
  const remainingNames: string[] = [...opts.namePool]
  const res = placeFeature(cells, rngState, {
    count: opts.count,
    canPlaceAt: opts.canPlaceAt,
    buildCell: (x, y, nextRng) => {
      let name = opts.fallbackName
      if (remainingNames.length > 0) {
        const pick = RNG._int(nextRng, remainingNames.length)
        nextRng = pick.rngState
        name = remainingNames.splice(pick.value, 1)[0] || opts.fallbackName
      }
      return { cell: opts.buildCell(x, y, name), rngState: nextRng }
    },
  })
  return res.rngState
}

type PlaceNamedFeatureRngOpts = {
  count: number
  namePool: readonly string[]
  fallbackName: string
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (x: number, y: number, name: string, rngState: number) => { cell: Cell; rngState: number }
}

function placeNamedFeatureRng(cells: CellGrid, rngState: number, opts: PlaceNamedFeatureRngOpts): number {
  const remainingNames: string[] = [...opts.namePool]
  const res = placeFeature(cells, rngState, {
    count: opts.count,
    canPlaceAt: opts.canPlaceAt,
    buildCell: (x, y, nextRng) => {
      let name = opts.fallbackName
      if (remainingNames.length > 0) {
        const pick = RNG._int(nextRng, remainingNames.length)
        nextRng = pick.rngState
        name = remainingNames.splice(pick.value, 1)[0] || opts.fallbackName
      }
      const built = opts.buildCell(x, y, name, nextRng)
      return { cell: built.cell, rngState: built.rngState }
    },
  })
  return res.rngState
}

function placeNamedFarms(cells: CellGrid, rngState: number): number {
  return placeNamedFeature(cells, rngState, {
    count: FARM_COUNT,
    namePool: FARM_NAME_POOL,
    fallbackName: 'A Farm',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: (x, y, name) => ({ kind: 'farm', id: cellId(x, y), name, nextReadyStep: 0 }),
  })
}

function placeNamedCamps(cells: CellGrid, rngState: number): number {
  return placeNamedFeature(cells, rngState, {
    count: CAMP_COUNT,
    namePool: CAMP_NAME_POOL,
    fallbackName: 'A Camp',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: (x, y, name) => ({ kind: 'camp', id: cellId(x, y), name, nextReadyStep: 0 }),
  })
}

function placeNamedTowns(cells: CellGrid, rngState: number): number {
  const baseOffers: Array<'buyFood' | 'buyTroops' | 'hireScout' | 'buyRumors'> = ['buyFood', 'buyTroops', 'hireScout', 'buyRumors']
  const omitNoScoutIndices = [0, 1, 3] as const // baseOffers indices excluding hireScout

  let townIndex = 0

  return placeNamedFeatureRng(cells, rngState, {
    count: TOWN_COUNT,
    namePool: TOWN_NAME_POOL,
    fallbackName: 'A Town',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: (x, y, name, nextRng) => {
      // Offer set: omit exactly 1 kind, keep the remaining 3 in base order.
      let omitIdx: number
      if (townIndex === 0) {
        const pick = RNG._int(nextRng, omitNoScoutIndices.length)
        nextRng = pick.rngState
        omitIdx = omitNoScoutIndices[pick.value]!
      } else {
        const pick = RNG._int(nextRng, baseOffers.length)
        nextRng = pick.rngState
        omitIdx = pick.value
      }

      const offers = baseOffers.filter((_k, idx) => idx !== omitIdx)

      // Prices: fixed per town, derived from RNG in a fixed order.
      const loFood = Math.min(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX)
      const hiFood = Math.max(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX)
      const rf = RNG._int(nextRng, hiFood - loFood + 1)
      nextRng = rf.rngState
      const foodGold = loFood + rf.value

      const loTroops = Math.min(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX)
      const hiTroops = Math.max(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX)
      const rt = RNG._int(nextRng, hiTroops - loTroops + 1)
      nextRng = rt.rngState
      const troopsGold = loTroops + rt.value

      const loScout = Math.min(TOWN_PRICE_SCOUT_MIN, TOWN_PRICE_SCOUT_MAX)
      const hiScout = Math.max(TOWN_PRICE_SCOUT_MIN, TOWN_PRICE_SCOUT_MAX)
      const rs = RNG._int(nextRng, hiScout - loScout + 1)
      nextRng = rs.rngState
      const scoutGold = loScout + rs.value

      const loRumor = Math.min(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX)
      const hiRumor = Math.max(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX)
      const rr = RNG._int(nextRng, hiRumor - loRumor + 1)
      nextRng = rr.rngState
      const rumorGold = loRumor + rr.value

      const cell: Cell = {
        kind: 'town',
        id: cellId(x, y),
        name,
        offers,
        prices: { foodGold, troopsGold, scoutGold, rumorGold },
        bundles: { food: TOWN_FOOD_BUNDLE, troops: TOWN_TROOPS_BUNDLE },
      }

      townIndex++
      return { cell, rngState: nextRng }
    },
  })
}

function placeHenges(cells: CellGrid, rngState: number): number {
  return placeNamedFeature(cells, rngState, {
    count: HENGE_COUNT,
    namePool: HENGE_NAME_POOL,
    fallbackName: 'A Henge',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: (x, y, name) => ({ kind: 'henge', id: cellId(x, y), name, nextReadyStep: 0 }),
  })
}

function placeSignposts(cells: CellGrid, rngState: number): number {
  const res = placeFeature(cells, rngState, {
    count: SIGNPOST_COUNT,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: (_x, _y, nextRng) => ({ cell: { kind: 'signpost' }, rngState: nextRng }),
  })
  return res.rngState
}

function pickStart({ rngState }: { rngState: number }) {
  const r = RNG._int(rngState, WORLD_WIDTH * WORLD_HEIGHT)
  rngState = r.rngState
  const x = r.value % WORLD_WIDTH
  const y = Math.floor(r.value / WORLD_WIDTH)
  return { startPosition: { x, y }, rngState }
}

export function getSpriteIdAt(world: World, x: number, y: number) {
  const tx = wrapIndex(x, world.width)
  const ty = wrapIndex(y, world.height)
  const cell = world.cells[ty]![tx]!
  return spriteIdForKind(cell.kind)
}

export function generateWorld(seed: number): GeneratedWorld {
  let rngState = RNG.createStreamRandomFromSeed(seed).rngState
  const base = generateBaseTerrainCells(rngState)
  rngState = base.rngState

  const cells = base.cells
  const gate = placeGate(cells, rngState)
  rngState = gate.rngState

  const locksmith = placeLocksmith(cells, rngState, gate.gatePos)
  rngState = locksmith.rngState

  rngState = placeNamedFarms(cells, rngState)
  rngState = placeNamedCamps(cells, rngState)
  rngState = placeNamedTowns(cells, rngState)
  rngState = placeHenges(cells, rngState)
  rngState = placeSignposts(cells, rngState)

  const startPick = pickStart({ rngState })
  rngState = startPick.rngState

  const world: World = {
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    mapGenAlgorithm: MAP_GEN_ALGORITHM,
    cells,
    rngState,
  }

  return { world, startPosition: startPick.startPosition }
}

