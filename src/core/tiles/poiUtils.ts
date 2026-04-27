export function pickDeterministicLine(
  lines: readonly string[],
  seed: number,
  poiIndex: number,
  stepCount: number,
): string {
  const m = lines.length
  if (m <= 0) return ''
  const k = ((seed | 0) + (poiIndex | 0) * 7 + (stepCount | 0)) | 0
  const idx = ((k % m) + m) % m
  return lines[idx] || lines[0] || ''
}
