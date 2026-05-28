import {
  MAP_GEN_ALGORITHM,
  NOISE_SMOOTH_PASSES,
  NOISE_VALUE_MAX,
  TERRAIN_KINDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants'
import { wrapIndex } from './math'
import { MECHANICS } from './mechanics'
import { RNG } from './rng'
import type { Cell, CellGrid, GeneratedWorld, World } from './types'

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

function pickStart({ rngState }: { rngState: number }) {
  const rng = RNG.createStreamRandom(rngState)
  const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT)
  const x = v % WORLD_WIDTH
  const y = Math.floor(v / WORLD_WIDTH)
  return { startPosition: { x, y }, rngState: rng.rngState }
}

export function generateWorld(seed: number): GeneratedWorld {
  let rngState = RNG.createStreamRandomFromSeed(seed).rngState

  const base = generateBaseTerrainCells(rngState)
  rngState = base.rngState
  const cells = base.cells

  // Mechanic-owned placement. `MECHANICS` array order is the worldgen order;
  // see `src/core/mechanics/index.ts` for why gate/locksmith come first.
  for (let i = 0; i < MECHANICS.length; i++) {
    const m = MECHANICS[i]!
    if (!m.placeWorld) continue
    rngState = m.placeWorld({ cells, rngState }).rngState
  }

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
