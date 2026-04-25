export function wrapIndex(i: number, size: number) {
  const r = i % size
  return r < 0 ? r + size : r
}

export function torusDelta(from: number, to: number, size: number) {
  const raw = to - from
  const a = raw
  const b = raw - size
  const c = raw + size

  let best = a
  for (const cand of [b, c]) {
    if (Math.abs(cand) < Math.abs(best)) best = cand
    else if (Math.abs(cand) === Math.abs(best) && cand > best) best = cand
  }
  return best
}

export function manhattan(dx: number, dy: number) {
  return Math.abs(dx) + Math.abs(dy)
}

export function dirLabel(dx: number, dy: number) {
  let s = ''
  if (dy < 0) s += 'N'
  else if (dy > 0) s += 'S'

  if (dx < 0) s += 'W'
  else if (dx > 0) s += 'E'

  return s
}

