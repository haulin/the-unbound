import { INITIAL_SEED } from '../../core/constants'

// All three parsers take the user-args slice (i.e. `process.argv.slice(2)`).
// Tests pass arrays directly; production callers pass the slice.

export function parseSeed(args: readonly string[]): number {
  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      const n = Number(arg.slice('--seed='.length))
      if (Number.isFinite(n)) return Math.trunc(n)
    }
  }
  return INITIAL_SEED
}

// Robust to unquoted args: bash word-splits `--moves=ABCD EFGH` into two argv
// entries (`--moves=ABCD`, `EFGH`), which would otherwise drop the second
// chunk silently. We absorb every following non-flag positional into the moves
// string so an agent that emits raw concatenated digit batches still works.
export function parseMoves(args: readonly string[]): string | null {
  let moves: string | null = null
  for (const arg of args) {
    if (arg.startsWith('--moves=')) {
      moves = arg.slice('--moves='.length)
      continue
    }
    if (moves !== null && !arg.startsWith('--')) moves += arg
  }
  return moves
}

export function parseBlind(args: readonly string[]): boolean {
  for (const arg of args) {
    if (arg === '--blind') return true
  }
  return false
}
