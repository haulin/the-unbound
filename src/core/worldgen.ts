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

// Worst-case bound on RNG attempts before declaring the candidate set
// exhausted. With a 10×10 torus this gives ~50 attempts per cell on average,
// which is comfortably above any realistic worldgen rejection rate (the
// tightest current predicate is `here.kind === 'mountain'`, which on noise
// passes yields ~12-17 mountains out of 100 → ~7% acceptance rate). Hitting
// this ceiling means the predicate genuinely has zero candidates (e.g. a noise
// pass that produced no mountain tiles) — fail loudly rather than spin
// forever. Tunable; bumping it costs nothing because successful placements
// short-circuit the loop.
const PLACE_FEATURE_MAX_ATTEMPTS = WORLD_WIDTH * WORLD_HEIGHT * 50

export function placeFeature(
  cells: CellGrid,
  rngState: number,
  opts: PlaceFeatureOpts,
): { placed: Vec2[]; rngState: number } {
  const placed: Vec2[] = []
  const rng = RNG.createStreamRandom(rngState)
  const minD = opts.awayFrom ? clampMinTorusDistance(opts.awayFrom.minDistance) : 0
  let attempts = 0
  while (placed.length < opts.count) {
    if (attempts >= PLACE_FEATURE_MAX_ATTEMPTS) {
      throw new Error(
        `placeFeature: exhausted ${PLACE_FEATURE_MAX_ATTEMPTS} attempts after placing ${placed.length}/${opts.count} features — predicate may have no candidates on this seed`,
      )
    }
    attempts += 1
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

export function placeFeatureFromSeed(
  cells: CellGrid,
  seed: number,
  domain: string,
  opts: PlaceFeatureOpts,
): { placed: Vec2[] } {
  const stream = RNG.createStreamRandomFromSeed(seed, domain)
  return placeFeature(cells, stream.rngState, opts)
}

export function placeNamedFeatureFromSeed(
  cells: CellGrid,
  seed: number,
  domain: string,
  opts: PlaceNamedFeatureOpts,
): void {
  const stream = RNG.createStreamRandomFromSeed(seed, domain)
  placeNamedFeature(cells, stream.rngState, opts)
}

// ---- PoI offer assignment (worldgen) -------------------------------------------

// `economy` = any non-hire offer. The builder only distinguishes hires from the rest.
export type OfferCategory = 'economy' | 'companion_hire'

type OfferRng = { intExclusive: (max: number) => number; intInRange: (min: number, max: number) => number }

// Guarantees (when `poiCount * maxOffers >= mustCover.length` and the pool has
// at least one non-hire offer): every mustCover offer appears on some PoI; each
// PoI has minOffers..maxOffers distinct offers; each PoI has >=1 non-hire offer.
// `requiredOnEveryPoi` adds offers without exceeding maxOffers (may swap out a hire).
// `mustCover` defaults to the full `pool` (every offer type appears somewhere on the map).
export function buildOfferSets<T extends string>(args: {
  poiCount: number
  minOffers: number
  maxOffers: number
  pool: readonly T[]
  mustCover?: readonly T[]
  categoryOf: (offer: T) => OfferCategory
  requiredOnEveryPoi?: readonly T[]
  rng: OfferRng
}): T[][] {
  const mustCover = args.mustCover ?? args.pool
  const { poiCount, minOffers, maxOffers, pool, categoryOf, requiredOnEveryPoi, rng } = args
  if (minOffers < 1) throw new Error('minOffers must be >= 1')
  if (maxOffers < minOffers) throw new Error('maxOffers must be >= minOffers')

  const slots: T[][] = Array.from({ length: poiCount }, () => [])

  const place = (offer: T): void => {
    for (let t = 0; t < poiCount; t++) {
      const row = slots[t]!
      if (row.length < maxOffers && !row.includes(offer)) {
        row.push(offer)
        return
      }
    }
    for (let t = 0; t < poiCount; t++) {
      const row = slots[t]!
      if (row.length < maxOffers) {
        row.push(offer)
        return
      }
    }
  }

  for (const offer of mustCover) place(offer)

  for (let t = 0; t < poiCount; t++) {
    const row = slots[t]!
    for (const required of requiredOnEveryPoi ?? []) {
      if (row.includes(required)) continue
      if (row.length < maxOffers) row.push(required)
      else replaceLastHireWith(row, required, categoryOf)
    }
  }

  for (let t = 0; t < poiCount; t++) {
    ensureNonHireOffer(slots[t]!, pool, categoryOf, maxOffers)
    const target = rng.intInRange(minOffers, maxOffers)
    backfillPoi(slots[t]!, pool, target, maxOffers, rng)
    ensureNonHireOffer(slots[t]!, pool, categoryOf, maxOffers)
    if (slots[t]!.length < minOffers) {
      throw new Error(`buildOfferSets: poi ${t} has fewer than minOffers after backfill`)
    }
    if (slots[t]!.length > maxOffers) {
      throw new Error(`buildOfferSets: poi ${t} exceeds maxOffers`)
    }
  }

  return slots
}

function replaceLastHireWith<T extends string>(
  row: T[],
  offer: T,
  categoryOf: (offer: T) => OfferCategory,
): void {
  for (let i = row.length - 1; i >= 0; i--) {
    if (categoryOf(row[i]!) === 'companion_hire') {
      row[i] = offer
      return
    }
  }
  row[row.length - 1] = offer
}

function ensureNonHireOffer<T extends string>(
  row: T[],
  pool: readonly T[],
  categoryOf: (offer: T) => OfferCategory,
  maxOffers: number,
): void {
  if (row.some((o) => categoryOf(o) !== 'companion_hire')) return
  const economy = pool.find((o) => categoryOf(o) !== 'companion_hire' && !row.includes(o))
  if (!economy) return
  if (row.length < maxOffers) row.push(economy)
  else replaceLastHireWith(row, economy, categoryOf)
}

function backfillPoi<T extends string>(
  row: T[],
  pool: readonly T[],
  target: number,
  maxOffers: number,
  rng: OfferRng,
): void {
  const cap = Math.min(target, maxOffers)
  while (row.length < cap) {
    const available = pool.filter((o) => !row.includes(o))
    if (available.length === 0) break
    row.push(available[rng.intExclusive(available.length)]!)
  }
}
