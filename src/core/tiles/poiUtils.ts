import { hashSeedStepCell, pickFromPool } from '../prng'

export function pickDeterministicLine(
  lines: readonly string[],
  seed: number,
  poiIndex: number,
  stepCount: number,
): string {
  if (!lines.length) return ''
  const h = hashSeedStepCell({ seed, stepCount, cellId: poiIndex })
  return pickFromPool(lines, h) || lines[0] || ''
}
