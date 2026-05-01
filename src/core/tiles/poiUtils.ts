import { pickFromPool } from '../prng'

export function pickDeterministicLine(
  lines: readonly string[],
  seed: number,
  poiIndex: number,
  stepCount: number,
): string {
  if (!lines.length) return ''
  return pickFromPool({ seed, stepCount, cellId: poiIndex }, lines) || lines[0] || ''
}
