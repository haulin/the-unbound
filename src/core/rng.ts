import { cellIdForPos } from './cells'
import type { Run, State, Vec2, World } from './types'

// ----------------------------
// Low-level PRNG (keep bitwise here)
// ----------------------------

function xorshift32(x: number) {
  x = x >>> 0
  x ^= (x << 13) >>> 0
  x ^= x >>> 17
  x ^= (x << 5) >>> 0
  return x >>> 0
}

function u32(x: number) {
  return x >>> 0
}

function seedToRngState(seed: number) {
  let s = (seed ^ 0xa5a5a5a5) >>> 0
  if (s === 0) s = 1
  return s
}

type PickState = { seed: number; stepCount: number; cellId: number; salt?: number }

function normalizeMaxExclusive(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive)) return 1
  const n = Math.trunc(maxExclusive)
  return n <= 0 ? 1 : n
}

function randInt(rngState: number, maxExclusive: number) {
  const next = xorshift32(u32(rngState))
  const m = normalizeMaxExclusive(maxExclusive)
  return { rngState: next, value: next % m }
}

function hashSeedStepCellInternal(opts: PickState): number {
  const base = seedToRngState(opts.seed | 0)
  const stepMix = u32(Math.imul(opts.stepCount | 0, 2654435761))
  const cellId = u32(opts.cellId | 0)
  const salt = u32(opts.salt == null ? 0 : opts.salt | 0)
  return xorshift32(u32(base ^ stepMix ^ cellId ^ salt))
}

function pickIndex(state: PickState, length: number): number {
  const m = length | 0
  if (m <= 0) return 0
  const h = hashSeedStepCellInternal(state)
  return u32(h) % m
}

function pickIntExclusive(state: PickState, maxExclusive: number): number {
  const m = normalizeMaxExclusive(maxExclusive)
  const h = hashSeedStepCellInternal(state)
  return u32(h) % m
}

function pickIntInRange(state: PickState, minInclusive: number, maxInclusive: number): number {
  const a = Number.isFinite(minInclusive) ? Math.trunc(minInclusive) : 0
  const b = Number.isFinite(maxInclusive) ? Math.trunc(maxInclusive) : 0
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const span = hi - lo + 1
  if (span <= 1) return lo
  return lo + pickIntExclusive(state, span)
}

function pickFromPool<T>(state: PickState, pool: readonly T[]): T | undefined {
  if (!pool.length) return undefined
  return pool[pickIndex(state, pool.length)]
}

function shuffledIndices(args: { seed: number; length: number; salt?: number }): number[] {
  const n = Number.isFinite(args.length) ? Math.trunc(args.length) : 0
  if (n <= 0) return []

  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(i)
  if (n <= 1) return out

  const baseSalt = args.salt == null ? 0 : args.salt | 0
  const cellId = n | 0

  for (let i = n - 1; i > 0; i--) {
    const j = pickIntExclusive({ seed: args.seed, stepCount: 0, cellId, salt: baseSalt ^ i }, i + 1)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }

  return out
}

// ----------------------------
// Copy policies (pure)
// ----------------------------

function stable(args: { seed: number; placeId: number; pool: readonly string[]; salt?: number }): string {
  const { seed, placeId, pool, salt } = args
  if (!pool.length) return ''
  const state = salt == null ? { seed, stepCount: 0, cellId: placeId } : { seed, stepCount: 0, cellId: placeId, salt }
  return pickFromPool(state, pool) || pool[0] || ''
}

function perMove(args: { seed: number; stepCount: number; cellId: number; pool: readonly string[]; salt?: number }): string {
  const { seed, stepCount, cellId, pool, salt } = args
  if (!pool.length) return ''
  const state = salt == null ? { seed, stepCount, cellId } : { seed, stepCount, cellId, salt }
  return pickFromPool(state, pool) || pool[0] || ''
}

function cursorAdvance(args: {
  seed: number
  cursor: number
  pool: readonly string[]
  salt?: number
}): { line: string; nextCursor: number } {
  const { seed, pool } = args
  const n = pool.length
  if (n <= 0) return { line: '', nextCursor: args.cursor }

  const indices = args.salt == null ? shuffledIndices({ seed, length: n }) : shuffledIndices({ seed, length: n, salt: args.salt })
  const idx = indices[args.cursor % n] ?? 0
  const line = pool[idx] || pool[0] || ''
  return { line, nextCursor: args.cursor + 1 }
}

// ----------------------------
// State-aware facade (ergonomics)
// ----------------------------

function getCopyCursors(run: Run): Record<string, number> {
  return run.copyCursors ?? {}
}

function advanceRunCursor(args: { run: Run; seed: number; tag: string; pool: readonly string[]; salt?: number }): { line: string; run: Run } {
  const cursors = getCopyCursors(args.run)
  const cursor = cursors[args.tag] ?? 0
  const pick =
    args.salt == null
      ? cursorAdvance({ seed: args.seed, cursor, pool: args.pool })
      : cursorAdvance({ seed: args.seed, cursor, pool: args.pool, salt: args.salt })
  const nextCursors = { ...cursors, [args.tag]: pick.nextCursor }
  return { line: pick.line, run: { ...args.run, copyCursors: nextCursors } }
}

function createTileRandom(args: { world: World; stepCount: number; pos: Vec2 }) {
  const seed = args.world.seed
  const cellId = cellIdForPos(args.world, args.pos)
  const stepCount = args.stepCount

  return {
    stableLine: (pool: readonly string[], opts?: { placeId?: number; salt?: number }) =>
      opts?.salt == null
        ? stable({ seed, placeId: opts?.placeId ?? cellId, pool })
        : stable({ seed, placeId: opts?.placeId ?? cellId, pool, salt: opts.salt }),
    perMoveLine: (pool: readonly string[], opts?: { cellId?: number; salt?: number }) =>
      opts?.salt == null
        ? perMove({ seed, stepCount, cellId: opts?.cellId ?? cellId, pool })
        : perMove({ seed, stepCount, cellId: opts?.cellId ?? cellId, pool, salt: opts.salt }),
  }
}

function createRunCopyRandom(state: State) {
  const seed = state.world.seed
  const stepCount = state.run.stepCount
  const cellId = cellIdForPos(state.world, state.player.position)

  return {
    stableLine: (pool: readonly string[], opts?: { placeId?: number; salt?: number }) =>
      opts?.salt == null
        ? stable({ seed, placeId: opts?.placeId ?? cellId, pool })
        : stable({ seed, placeId: opts?.placeId ?? cellId, pool, salt: opts.salt }),
    perMoveLine: (pool: readonly string[], opts?: { cellId?: number; stepCount?: number; salt?: number }) =>
      opts?.salt == null
        ? perMove({ seed, stepCount: opts?.stepCount ?? stepCount, cellId: opts?.cellId ?? cellId, pool })
        : perMove({ seed, stepCount: opts?.stepCount ?? stepCount, cellId: opts?.cellId ?? cellId, pool, salt: opts.salt }),
    advanceCursor: (tag: string, pool: readonly string[], opts?: { salt?: number }): { line: string; nextState: State } => {
      const next =
        opts?.salt == null ? advanceRunCursor({ run: state.run, seed, tag, pool }) : advanceRunCursor({ run: state.run, seed, tag, pool, salt: opts.salt })
      return { line: next.line, nextState: { ...state, run: next.run } }
    },
  }
}

function createStreamRandom(rngState: number) {
  let rng = rngState

  return {
    intExclusive: (maxExclusive: number) => {
      const r = randInt(rng, maxExclusive)
      rng = r.rngState
      return r.value
    },
    get rngState() {
      return rng
    },
  }
}

function createStreamRandomFromSeed(seed: number) {
  return createStreamRandom(seedToRngState(seed))
}

export const RNG = {
  // Facades (preferred)
  createTileRandom,
  createRunCopyRandom,
  createStreamRandom,
  createStreamRandomFromSeed,

  // Keyed deterministic helpers (stable, no global rngState consumption).
  keyedIntExclusive: pickIntExclusive,
  keyedIntInRange: pickIntInRange,
} as const

