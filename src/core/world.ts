import {
  MAP_GEN_ALGORITHM,
  NOISE_SMOOTH_PASSES,
  NOISE_VALUE_MAX,
  SIGNPOST_COUNT,
  TILE_CASTLE,
  TILE_SIGNPOST,
  WALKABLE_COSMETIC_TILE_IDS,
  WALKABLE_TILE_COUNT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants'
import { wrapIndex } from './math'
import { randInt, seedToRngState } from './prng'
import type { GeneratedWorld, TileGrid, Vec2, World } from './types'

export function countTiles(tiles: TileGrid, tileId: number) {
  let n = 0
  for (let y = 0; y < tiles.length; y++) {
    const row = tiles[y]!
    for (let x = 0; x < row.length; x++) {
      if (row[x]! === tileId) n++
    }
  }
  return n
}

function clone2dTiles(tiles: TileGrid) {
  const out: TileGrid = []
  for (let y = 0; y < tiles.length; y++) out.push(tiles[y]!.slice())
  return out
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
      row.push((sum / 9) | 0)
    }
    out.push(row)
  }
  return out
}

function generateBaseTerrain(rngState: number) {
  const vals: number[][] = []
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: number[] = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const r = randInt(rngState, NOISE_VALUE_MAX)
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
  const qtile = WALKABLE_COSMETIC_TILE_IDS
  const bucketCount = WALKABLE_TILE_COUNT
  const tiles: TileGrid = []

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row: number[] = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      let bucket = ((bucketCount * (V[y]![x]! - minV)) / span) | 0
      if (bucket < 0) bucket = 0
      if (bucket >= bucketCount) bucket = bucketCount - 1
      row.push(qtile[bucket]!)
    }
    tiles.push(row)
  }

  return { tiles, rngState }
}

function placeSpecials({ tiles, rngState }: { tiles: TileGrid; rngState: number }) {
  const t = clone2dTiles(tiles)
  let castlePosition: Vec2 = { x: 0, y: 0 }

  {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)
    t[y]![x] = TILE_CASTLE
    castlePosition = { x, y }
  }

  let placed = 0
  while (placed < SIGNPOST_COUNT) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)

    if (x === castlePosition.x && y === castlePosition.y) continue
    if (t[y]![x] === TILE_SIGNPOST) continue

    t[y]![x] = TILE_SIGNPOST
    placed++
  }

  return { tiles: t, castlePosition, rngState }
}

function pickStart({ rngState }: { rngState: number }) {
  const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
  rngState = r.rngState
  const x = r.value % WORLD_WIDTH
  const y = Math.floor(r.value / WORLD_WIDTH)
  return { startPosition: { x, y }, rngState }
}

export function getTileIdAt(world: World, x: number, y: number) {
  const tx = wrapIndex(x, world.width)
  const ty = wrapIndex(y, world.height)
  return world.tiles[ty]![tx]!
}

export function generateWorld(seed: number): GeneratedWorld {
  let rngState = seedToRngState(seed)
  const base = generateBaseTerrain(rngState)
  rngState = base.rngState

  const withSpecials = placeSpecials({ tiles: base.tiles, rngState })
  rngState = withSpecials.rngState

  const startPick = pickStart({ rngState })
  rngState = startPick.rngState

  const world: World = {
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    mapGenAlgorithm: MAP_GEN_ALGORITHM,
    tiles: withSpecials.tiles,
    castlePosition: withSpecials.castlePosition,
    rngState,
  }

  return { world, startPosition: startPick.startPosition }
}

