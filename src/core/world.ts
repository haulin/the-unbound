import {
  CAMP_COUNT,
  CAMP_NAME_POOL,
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  FARM_BEAST_GOLD_MAX,
  FARM_BEAST_GOLD_MIN,
  FARM_COUNT,
  FARM_NAME_POOL,
  FISHING_LAKE_COUNT,
  GATE_LOCKSMITH_MIN_DISTANCE,
  HENGE_COUNT,
  HENGE_NAME_POOL,
  MAP_GEN_ALGORITHM,
  RAINBOW_END_MIN_DISTANCE,
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
import type { Cell, CellGrid, GeneratedWorld, TownOfferKind, Vec2, World } from './types'

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

function clampMinTorusDistance(minDistance: number): number {
  const maxPossible = Math.floor(WORLD_WIDTH / 2) + Math.floor(WORLD_HEIGHT / 2)
  return Math.max(0, Math.min(minDistance, maxPossible))
}

type PlaceFeatureOpts = {
  count: number
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (args: PlacementCtx) => Cell
}

type PlacementCtx = { x: number; y: number; rng: ReturnType<typeof RNG.createStreamRandom> }
type NamedPlacementCtx = PlacementCtx & { name: string }

function placeFeature(cells: CellGrid, rngState: number, opts: PlaceFeatureOpts): { placed: Vec2[]; rngState: number } {
  const placed: Vec2[] = []
  const rng = RNG.createStreamRandom(rngState)
  while (placed.length < opts.count) {
    const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT)
    const x = v % WORLD_WIDTH
    const y = Math.floor(v / WORLD_WIDTH)

    const here = cells[y]![x]!
    if (!opts.canPlaceAt(x, y, here)) continue

    cells[y]![x] = opts.buildCell({ x, y, rng })
    placed.push({ x, y })
  }
  return { placed, rngState: rng.rngState }
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
  const rng = RNG.createStreamRandom(rngState)
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: number[] = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      row.push(rng.intExclusive(NOISE_VALUE_MAX))
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

  return { cells, rngState: rng.rngState }
}

function placeGate(cells: CellGrid, rngState: number): { gatePos: Vec2; rngState: number } {
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: () => ({ kind: 'gate' }),
  })
  return { gatePos: res.placed[0]!, rngState: res.rngState }
}

function placeLocksmith(cells: CellGrid, rngState: number, gatePos: Vec2): { locksmithPos: Vec2; rngState: number } {
  const minD = clampMinTorusDistance(GATE_LOCKSMITH_MIN_DISTANCE)
  const res = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (x, y, here) => isTerrainCell(here) && torusManhattanDistance({ x, y }, gatePos) >= minD,
    buildCell: () => ({ kind: 'locksmith' }),
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
    buildCell: ({ x, y, rng }) => {
      let name = opts.fallbackName
      if (remainingNames.length > 0) {
        const idx = rng.intExclusive(remainingNames.length)
        name = remainingNames.splice(idx, 1)[0] || opts.fallbackName
      }
      return opts.buildCell(x, y, name)
    },
  })
  return res.rngState
}

type PlaceNamedFeatureRngOpts = {
  count: number
  namePool: readonly string[]
  fallbackName: string
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (args: NamedPlacementCtx) => Cell
}

function placeNamedFeatureRng(cells: CellGrid, rngState: number, opts: PlaceNamedFeatureRngOpts): number {
  const remainingNames: string[] = [...opts.namePool]
  const res = placeFeature(cells, rngState, {
    count: opts.count,
    canPlaceAt: opts.canPlaceAt,
    buildCell: ({ x, y, rng }) => {
      let name = opts.fallbackName
      if (remainingNames.length > 0) {
        const idx = rng.intExclusive(remainingNames.length)
        name = remainingNames.splice(idx, 1)[0] || opts.fallbackName
      }
      return opts.buildCell({ x, y, name, rng })
    },
  })
  return res.rngState
}

function placeNamedFarms(cells: CellGrid, rngState: number): number {
  return placeNamedFeatureRng(cells, rngState, {
    count: FARM_COUNT,
    namePool: FARM_NAME_POOL,
    fallbackName: 'A Farm',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      const lo = Math.min(FARM_BEAST_GOLD_MIN, FARM_BEAST_GOLD_MAX)
      const hi = Math.max(FARM_BEAST_GOLD_MIN, FARM_BEAST_GOLD_MAX)
      const beastGoldCost = lo + rng.intExclusive(hi - lo + 1)
      return {
        kind: 'farm',
        id: cellId(x, y),
        name,
        beastGoldCost,
      }
    },
  })
}

function placeFishingLakes(cells: CellGrid, rngState: number): number {
  const res = placeFeature(cells, rngState, {
    count: FISHING_LAKE_COUNT,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y }) => ({ kind: 'fishingLake', id: cellId(x, y), nextReadyStep: 0 }),
  })
  return res.rngState
}

function placeRainbowEnds(cells: CellGrid, rngState: number): number {
  const first = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y }) => ({ kind: 'rainbowEnd', id: cellId(x, y), hasPaidOut: false }),
  })
  rngState = first.rngState
  const firstPos = first.placed[0]!

  const minD = clampMinTorusDistance(RAINBOW_END_MIN_DISTANCE)

  const second = placeFeature(cells, rngState, {
    count: 1,
    canPlaceAt: (x, y, here) =>
      isTerrainCell(here) && torusManhattanDistance({ x, y }, firstPos) >= minD,
    buildCell: ({ x, y }) => ({ kind: 'rainbowEnd', id: cellId(x, y), hasPaidOut: false }),
  })
  return second.rngState
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
  const baseOffers: TownOfferKind[] = [
    ACTION_TOWN_BUY_FOOD,
    ACTION_TOWN_BUY_TROOPS,
    ACTION_TOWN_HIRE_SCOUT,
    ACTION_TOWN_BUY_RUMOR,
  ]
  const omitNoScoutIndices = [0, 1, 3] as const // baseOffers indices excluding hireScout

  let townIndex = 0

  return placeNamedFeatureRng(cells, rngState, {
    count: TOWN_COUNT,
    namePool: TOWN_NAME_POOL,
    fallbackName: 'A Town',
    canPlaceAt: (_x, _y, here) => isTerrainCell(here),
    buildCell: ({ x, y, name, rng }) => {
      // Offer set: omit exactly 1 kind, keep the remaining 3 in base order.
      let omitIdx: number
      if (townIndex === 0) {
        const idx = rng.intExclusive(omitNoScoutIndices.length)
        omitIdx = omitNoScoutIndices[idx]!
      } else {
        omitIdx = rng.intExclusive(baseOffers.length)
      }

      const offers = baseOffers.filter((_k, idx) => idx !== omitIdx)

      // Prices: fixed per town, derived from RNG in a fixed order.
      const loFood = Math.min(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX)
      const hiFood = Math.max(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX)
      const foodGold = loFood + rng.intExclusive(hiFood - loFood + 1)

      const loTroops = Math.min(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX)
      const hiTroops = Math.max(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX)
      const troopsGold = loTroops + rng.intExclusive(hiTroops - loTroops + 1)

      const loScout = Math.min(TOWN_PRICE_SCOUT_MIN, TOWN_PRICE_SCOUT_MAX)
      const hiScout = Math.max(TOWN_PRICE_SCOUT_MIN, TOWN_PRICE_SCOUT_MAX)
      const scoutGold = loScout + rng.intExclusive(hiScout - loScout + 1)

      const loRumor = Math.min(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX)
      const hiRumor = Math.max(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX)
      const rumorGold = loRumor + rng.intExclusive(hiRumor - loRumor + 1)

      const cell: Cell = {
        kind: 'town',
        id: cellId(x, y),
        name,
        offers,
        prices: { foodGold, troopsGold, scoutGold, rumorGold },
        bundles: { food: TOWN_FOOD_BUNDLE, troops: TOWN_TROOPS_BUNDLE },
      }

      townIndex++
      return cell
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
    buildCell: () => ({ kind: 'signpost' }),
  })
  return res.rngState
}

function pickStart({ rngState }: { rngState: number }) {
  const rng = RNG.createStreamRandom(rngState)
  const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT)
  const x = v % WORLD_WIDTH
  const y = Math.floor(v / WORLD_WIDTH)
  return { startPosition: { x, y }, rngState: rng.rngState }
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
  rngState = placeFishingLakes(cells, rngState)
  rngState = placeRainbowEnds(cells, rngState)

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

