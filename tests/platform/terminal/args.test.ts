import { describe, expect, it } from 'vitest'
import { INITIAL_SEED } from '../../../src/core/constants'
import {
  parseBlind,
  parseMoves,
  parseMovesFile,
  parseSeed,
} from '../../../src/platform/terminal/args'

// Argv parsers are pure: they read process.argv.slice(2) shape (i.e. user args
// only, no node/script prefix). Tests pass arrays directly.

describe('parseSeed', () => {
  it('returns the parsed integer when --seed is supplied', () => {
    expect(parseSeed(['--seed=42'])).toBe(42)
  })

  it('falls back to INITIAL_SEED when the flag is absent', () => {
    expect(parseSeed([])).toBe(INITIAL_SEED)
    expect(parseSeed(['--blind', '--moves=8'])).toBe(INITIAL_SEED)
  })

  it('falls back to INITIAL_SEED when the value is not a finite number', () => {
    expect(parseSeed(['--seed=abc'])).toBe(INITIAL_SEED)
  })

  it('truncates fractional values', () => {
    expect(parseSeed(['--seed=12.9'])).toBe(12)
  })
})

describe('parseBlind', () => {
  it('detects the --blind flag', () => {
    expect(parseBlind(['--blind'])).toBe(true)
    expect(parseBlind(['--seed=1', '--blind'])).toBe(true)
  })

  it('returns false when the flag is missing', () => {
    expect(parseBlind([])).toBe(false)
    expect(parseBlind(['--seed=1', '--moves=82'])).toBe(false)
  })

  it('does not match a flag that merely contains "blind"', () => {
    expect(parseBlind(['--blindfold'])).toBe(false)
  })
})

describe('parseMoves', () => {
  it('returns null when --moves is absent (interactive mode signal)', () => {
    expect(parseMoves([])).toBeNull()
    expect(parseMoves(['--seed=1', '--blind'])).toBeNull()
  })

  it('returns the supplied moves string verbatim', () => {
    expect(parseMoves(['--moves=8826'])).toBe('8826')
  })

  it('returns an empty string when the flag has no value (replay-but-no-moves)', () => {
    // null vs '' is the contract: null means "stay interactive", '' means
    // "replay zero moves and exit" (used when an agent wants a fresh state
    // print without dispatching anything).
    expect(parseMoves(['--moves='])).toBe('')
  })

  // Regression: bash word-splits an unquoted `--moves=ABCD EFGH` into two argv
  // entries (`--moves=ABCD` and `EFGH`). Earlier versions silently dropped
  // `EFGH`, so an agent's accumulated move string desynced from the world it
  // was reasoning about. Concatenate every following non-flag positional.
  it('concatenates trailing non-flag positionals into the moves string', () => {
    expect(parseMoves(['--moves=8826', '7777'])).toBe('88267777')
    expect(parseMoves(['--moves=8826', '7777', '4444'])).toBe('882677774444')
  })

  it('skips intervening flags but keeps absorbing later positionals', () => {
    // Permissive contract: once --moves opens, every subsequent non-flag argv
    // entry feeds into the moves string regardless of intervening flags. In
    // practice the agent never interleaves --blind between move chunks, but
    // documenting the behaviour stops a future tightening from being silent.
    expect(parseMoves(['--moves=8826', '7777', '--blind', '4444'])).toBe('882677774444')
  })

  it('does not concatenate positionals that appear before --moves', () => {
    expect(parseMoves(['8826', '--moves=7777'])).toBe('7777')
  })
})

describe('parseMovesFile', () => {
  it('returns null when the flag is absent', () => {
    expect(parseMovesFile([])).toBeNull()
    expect(parseMovesFile(['--seed=1', '--moves=82'])).toBeNull()
  })

  it('returns the supplied file path verbatim', () => {
    expect(parseMovesFile(['--moves-file=/tmp/run.txt'])).toBe('/tmp/run.txt')
  })

  it('preserves spaces inside the path', () => {
    // Argv parsing happens before us; if the shell already split the path,
    // that's the user's problem. We only strip the literal `--moves-file=`
    // prefix and trust the rest.
    expect(parseMovesFile(['--moves-file=/tmp/run with spaces.txt'])).toBe('/tmp/run with spaces.txt')
  })

  it('returns the empty string when the flag has no value', () => {
    // Empty path is invalid for fs.readFileSync; entry.ts will surface the
    // error rather than silently fall back to interactive mode. We just
    // round-trip whatever was after `=`.
    expect(parseMovesFile(['--moves-file='])).toBe('')
  })
})
