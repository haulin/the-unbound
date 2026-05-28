// Worldgen placement primitives. Shared by `world.ts` (the orchestrator) and
// mechanic defs (the per-feature placers).
//
// Must NOT import from `./mechanics/*` or `./world.ts` — `world.ts` imports
// `MECHANICS`, which imports each def, which imports this file; pulling either
// back into here closes the cycle.

import { TERRAIN_KINDS, WORLD_HEIGHT, WORLD_WIDTH } from './constants'
import { cellIdForPos } from './cells'
import { manhattan, torusDelta } from './math'
import { RNG } from './rng'
import type { Cell, CellGrid, Vec2 } from './types'

const TERRAIN_KIND_SET = new Set<string>(TERRAIN_KINDS)

export function isTerrainCell(cell: Cell): boolean {
  return TERRAIN_KIND_SET.has(cell.kind)
}

// Stable per-cell serial used as `cell.id` for placed PoIs. Single source of
// truth lives in `cellIdForPos`; this is the (x, y) shorthand placers use.
export function cellId(x: number, y: number): number {
  return cellIdForPos({ width: WORLD_WIDTH }, { x, y })
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

type PlacementCtx = { x: number; y: number; rng: ReturnType<typeof RNG.createStreamRandom> }

type PlaceFeatureOpts = {
  count: number
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (args: PlacementCtx) => Cell
  // Optional torus-Manhattan min-distance constraint relative to an already-
  // known position. Used by locksmith (away from gate) and rainbowEnd (second
  // end away from first). Centralizing here keeps the constraint in one spot.
  awayFrom?: { pos: Vec2; minDistance: number }
}

export function placeFeature(
  cells: CellGrid,
  rngState: number,
  opts: PlaceFeatureOpts,
): { placed: Vec2[]; rngState: number } {
  const placed: Vec2[] = []
  const rng = RNG.createStreamRandom(rngState)
  const minD = opts.awayFrom ? clampMinTorusDistance(opts.awayFrom.minDistance) : 0
  while (placed.length < opts.count) {
    const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT)
    const x = v % WORLD_WIDTH
    const y = Math.floor(v / WORLD_WIDTH)

    const here = cells[y]![x]!
    if (!opts.canPlaceAt(x, y, here)) continue
    if (opts.awayFrom && torusManhattanDistance({ x, y }, opts.awayFrom.pos) < minD) continue

    cells[y]![x] = opts.buildCell({ x, y, rng })
    placed.push({ x, y })
  }
  return { placed, rngState: rng.rngState }
}

type PlaceNamedFeatureOpts = {
  count: number
  namePool: readonly string[]
  fallbackName: string
  canPlaceAt: (x: number, y: number, here: Cell) => boolean
  buildCell: (args: PlacementCtx & { name: string }) => Cell
}

// `buildCell` receives `rng` so callers that need it (farm beast price, town
// offers/prices) don't have to call `placeFeature` directly. Callers that don't
// need `rng` (camp, henge) just ignore the field.
export function placeNamedFeature(cells: CellGrid, rngState: number, opts: PlaceNamedFeatureOpts): number {
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
