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

// `--moves-file=<path>` reads the moves string from a file instead of argv.
// Designed for the agent loop: the agent appends one digit at a time
// (`echo -n 8 >> /tmp/run.txt`) and re-runs the command. Three things this
// fixes vs `--moves=...`:
//   1. No long string round-tripping through tokens every turn.
//   2. Truncating the file to rewind is now a deliberate write, not a free
//      retry from any prior turn.
//   3. Quoting bugs and bash word-splits go away — the file is the source.
// File contents are treated identically to a `--moves` string: digits 1..9
// drive the keypad, anything else is skipped by the replay loop.
export function parseMovesFile(args: readonly string[]): string | null {
  for (const arg of args) {
    if (arg.startsWith('--moves-file=')) return arg.slice('--moves-file='.length)
  }
  return null
}
