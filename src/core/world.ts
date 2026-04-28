import {
  CAMP_COUNT,
  CAMP_NAME_POOL,
  FARM_COUNT,
  FARM_NAME_POOL,
  HENGE_COUNT,
  HENGE_NAME_POOL,
  MAP_GEN_ALGORITHM,
  NOISE_SMOOTH_PASSES,
  NOISE_VALUE_MAX,
  SIGNPOST_COUNT,
  TERRAIN_KINDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  spriteIdForKind,
} from './constants'
import { wrapIndex } from './math'
import { randInt, seedToRngState } from './prng'
import type { Cell, CellGrid, GeneratedWorld, Vec2, World } from './types'

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

function placeCastle(cells: CellGrid, rngState: number): { castlePos: Vec2; rngState: number } {
  const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
  rngState = r.rngState
  const x = r.value % WORLD_WIDTH
  const y = Math.floor(r.value / WORLD_WIDTH)
  cells[y]![x] = { kind: 'castle' }
  return { castlePos: { x, y }, rngState }
}

type PlaceNamedFeatureOpts = {
  count: number
  namePool: readonly string[]
  fallbackName: string
  canPlaceAt: (here: Cell) => boolean
  buildCell: (x: number, y: number, name: string) => Cell
}

function placeNamedFeature(cells: CellGrid, rngState: number, castlePos: Vec2, opts: PlaceNamedFeatureOpts): number {
  const remainingNames: string[] = [...opts.namePool]
  let placed = 0
  while (placed < opts.count) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)

    if (x === castlePos.x && y === castlePos.y) continue
    const here = cells[y]![x]!
    if (!opts.canPlaceAt(here)) continue

    let name = opts.fallbackName
    if (remainingNames.length > 0) {
      const pick = randInt(rngState, remainingNames.length)
      rngState = pick.rngState
      name = remainingNames.splice(pick.value, 1)[0]!
    }

    cells[y]![x] = opts.buildCell(x, y, name)
    placed++
  }
  return rngState
}

function placeNamedFarms(cells: CellGrid, rngState: number, castlePos: Vec2): number {
  return placeNamedFeature(cells, rngState, castlePos, {
    count: FARM_COUNT,
    namePool: FARM_NAME_POOL,
    fallbackName: 'A Farm',
    canPlaceAt: (here) => !(here.kind === 'farm' || here.kind === 'camp' || here.kind === 'signpost'),
    buildCell: (x, y, name) => ({ kind: 'farm', id: y * WORLD_WIDTH + x, name, nextReadyStep: 0 }),
  })
}

function placeNamedCamps(cells: CellGrid, rngState: number, castlePos: Vec2): number {
  return placeNamedFeature(cells, rngState, castlePos, {
    count: CAMP_COUNT,
    namePool: CAMP_NAME_POOL,
    fallbackName: 'A Camp',
    canPlaceAt: (here) => !(here.kind === 'farm' || here.kind === 'camp' || here.kind === 'signpost'),
    buildCell: (x, y, name) => ({ kind: 'camp', id: y * WORLD_WIDTH + x, name, nextReadyStep: 0 }),
  })
}

function placeHenges(cells: CellGrid, rngState: number, castlePos: Vec2): number {
  return placeNamedFeature(cells, rngState, castlePos, {
    count: HENGE_COUNT,
    namePool: HENGE_NAME_POOL,
    fallbackName: 'A Henge',
    canPlaceAt: (here) =>
      !(
        here.kind === 'castle' ||
        here.kind === 'farm' ||
        here.kind === 'camp' ||
        here.kind === 'henge' ||
        here.kind === 'signpost'
      ),
    buildCell: (x, y, name) => ({ kind: 'henge', id: y * WORLD_WIDTH + x, name, nextReadyStep: 0 }),
  })
}

function placeSignposts(cells: CellGrid, rngState: number, castlePos: Vec2): number {
  let placed = 0
  while (placed < SIGNPOST_COUNT) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)

    if (x === castlePos.x && y === castlePos.y) continue
    const here = cells[y]![x]!
    if (here.kind === 'farm' || here.kind === 'camp' || here.kind === 'henge' || here.kind === 'signpost') continue

    cells[y]![x] = { kind: 'signpost' }
    placed++
  }
  return rngState
}

function pickStart({ rngState }: { rngState: number }) {
  const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
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
  let rngState = seedToRngState(seed)
  const base = generateBaseTerrainCells(rngState)
  rngState = base.rngState

  const cells = base.cells
  const castle = placeCastle(cells, rngState)
  rngState = castle.rngState
  rngState = placeNamedFarms(cells, rngState, castle.castlePos)
  rngState = placeNamedCamps(cells, rngState, castle.castlePos)
  rngState = placeHenges(cells, rngState, castle.castlePos)
  rngState = placeSignposts(cells, rngState, castle.castlePos)

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

