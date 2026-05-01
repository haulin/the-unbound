export function xorshift32(x: number) {
  x = x >>> 0
  x ^= (x << 13) >>> 0
  x ^= x >>> 17
  x ^= (x << 5) >>> 0
  return x >>> 0
}

export function u32(x: number) {
  return x >>> 0
}

export function seedToRngState(seed: number) {
  let s = (seed ^ 0xa5a5a5a5) >>> 0
  if (s === 0) s = 1
  return s
}

export type PickState = { seed: number; stepCount: number; cellId: number; salt?: number }

function normalizeMaxExclusive(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive)) return 1
  const n = Math.trunc(maxExclusive)
  return n <= 0 ? 1 : n
}

export function randInt(rngState: number, maxExclusive: number) {
  const next = xorshift32(u32(rngState))
  const m = normalizeMaxExclusive(maxExclusive)
  return { rngState: next, value: next % m }
}

function hashSeedStepCell(opts: PickState): number {
  const base = seedToRngState(opts.seed | 0)
  const stepMix = u32(Math.imul(opts.stepCount | 0, 2654435761))
  const cellId = u32(opts.cellId | 0)
  const salt = u32(opts.salt == null ? 0 : opts.salt | 0)
  return xorshift32(u32(base ^ stepMix ^ cellId ^ salt))
}

export function pickIndex(state: PickState, length: number): number {
  const m = length | 0
  if (m <= 0) return 0
  const h = hashSeedStepCell(state)
  return u32(h) % m
}

export function pickIntExclusive(state: PickState, maxExclusive: number): number {
  const m = normalizeMaxExclusive(maxExclusive)
  const h = hashSeedStepCell(state)
  return u32(h) % m
}

export function pickIntInRange(state: PickState, minInclusive: number, maxInclusive: number): number {
  const a = Number.isFinite(minInclusive) ? Math.trunc(minInclusive) : 0
  const b = Number.isFinite(maxInclusive) ? Math.trunc(maxInclusive) : 0
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const span = hi - lo + 1
  if (span <= 1) return lo
  return lo + pickIntExclusive(state, span)
}

export function pickFromPool<T>(state: PickState, pool: readonly T[]): T | undefined {
  if (!pool.length) return undefined
  return pool[pickIndex(state, pool.length)]
}
