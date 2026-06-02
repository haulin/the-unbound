import { readFileSync } from 'node:fs'
import { ACTION_NEW_RUN, ACTION_TICK } from '../../core/constants'
import { processAction } from '../../core/processAction'
import { hasBlockingAnim } from '../../core/reducer'
import type { State } from '../../core/types'
import { parseBlind, parseMoves, parseMovesFile, parseSeed } from './args'
import { actionForKey } from './input'
import { renderState } from './render'

// Animations are advisory in this platform — the agent doesn't see them.
// We tick the clock until no blocking anim remains so the next prompt is
// always actionable.
function drainAnimations(state: State): State {
  let s = state
  let safety = 1024
  while (s && hasBlockingAnim(s.ui) && safety-- > 0) {
    const next = processAction(s, { type: ACTION_TICK })
    if (!next) return s
    s = next
  }
  return s
}

const args = process.argv.slice(2)
const blind = parseBlind(args)
const initial = processAction(null, { type: ACTION_NEW_RUN, seed: parseSeed(args) })
if (!initial) {
  console.error('Failed to initialize state')
  process.exit(1)
  throw new Error('unreachable')
}
let state: State = drainAnimations(initial)

function paintAndPrompt(): void {
  if (!state) return
  console.log(renderState(state, { blind }))
  process.stdout.write('> ')
}

// `--moves-file` wins over `--moves` when both are supplied — having two
// move sources at once is always a mistake, so we collapse to the file.
// Non-existent or unreadable files crash loudly: silently falling back to
// interactive mode would mask the agent's actual intent.
const movesFilePath = parseMovesFile(args)
const replayMoves: string | null =
  movesFilePath !== null ? readFileSync(movesFilePath, 'utf8') : parseMoves(args)
if (replayMoves !== null) {
  for (const ch of replayMoves) {
    if (ch === '\n' || ch === '\r' || ch === ' ' || ch === ',') continue
    const action = actionForKey(state, ch, { blind })
    if (!action) continue
    const next = processAction(state, action)
    if (next) state = drainAnimations(next)
  }
  console.log(renderState(state, { blind }))
  process.exit(0)
}

paintAndPrompt()

const stdin = process.stdin
if (stdin.setRawMode) stdin.setRawMode(true)
stdin.resume()

stdin.on('data', (chunk) => {
  if (!state) return
  const input = chunk.toString()

  // Ctrl+C and Ctrl+D quit cleanly.
  if (input === '\u0003' || input === '\u0004' || input === 'q' || input === 'Q') {
    console.log('\nbye.')
    process.exit(0)
    return
  }

  // Each chunk can hold one keystroke (raw mode) or a full line (cooked).
  // Either way, we walk one character at a time so a paste of `82` advances
  // through Move N then Move S, mirroring how a human plays.
  for (const ch of input) {
    if (ch === '\r' || ch === '\n') continue
    const action = actionForKey(state, ch, { blind })
    if (!action) continue
    const next = processAction(state, action)
    if (next) state = drainAnimations(next)
  }

  paintAndPrompt()
})
