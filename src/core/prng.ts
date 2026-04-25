export function xorshift32(x: number) {
  x = x >>> 0
  x ^= (x << 13) >>> 0
  x ^= x >>> 17
  x ^= (x << 5) >>> 0
  return x >>> 0
}

export function seedToRngState(seed: number) {
  let s = (seed ^ 0xa5a5a5a5) >>> 0
  if (s === 0) s = 1
  return s
}

export function randInt(rngState: number, maxExclusive: number) {
  const next = xorshift32(rngState)
  return { rngState: next, value: next % maxExclusive }
}

