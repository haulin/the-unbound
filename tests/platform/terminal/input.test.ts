import { describe, expect, it } from 'vitest'
import {
  ACTION_MOVE,
  ACTION_NEW_RUN,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
} from '../../../src/core/constants'
import { processAction } from '../../../src/core/processAction'
import type { State } from '../../../src/core/types'
import { actionForKey } from '../../../src/platform/terminal/input'

// A fresh overworld state: no encounter, no game-over, full right-grid
// available. Using the real reducer keeps this contract aligned with whatever
// the right-grid says — not a hand-rolled fake that could drift.
function freshState(): State {
  const s = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
  if (!s) throw new Error('NEW_RUN failed in test setup')
  return s
}

describe('actionForKey — numpad layout', () => {
  // Keypad-to-cell mapping (TIC right-grid, top-left origin):
  //   7 8 9      (0,0) (0,1) (0,2)
  //   4 5 6  =   (1,0) (1,1) (1,2)
  //   1 2 3      (2,0) (2,1) (2,2)
  it('maps the four cardinal keys to MOVE actions with matching deltas', () => {
    const s = freshState()
    expect(actionForKey(s, '8')).toEqual({ type: ACTION_MOVE, dx: 0, dy: -1 })
    expect(actionForKey(s, '2')).toEqual({ type: ACTION_MOVE, dx: 0, dy: 1 })
    expect(actionForKey(s, '4')).toEqual({ type: ACTION_MOVE, dx: -1, dy: 0 })
    expect(actionForKey(s, '6')).toEqual({ type: ACTION_MOVE, dx: 1, dy: 0 })
  })

  it('maps the four corners to their dedicated UI actions', () => {
    const s = freshState()
    expect(actionForKey(s, '7')).toEqual({ type: ACTION_SHOW_GOAL })
    expect(actionForKey(s, '9')).toEqual({ type: ACTION_TOGGLE_MAP })
    expect(actionForKey(s, '1')).toEqual({ type: ACTION_TOGGLE_MINIMAP })
    expect(actionForKey(s, '3')).toEqual({ type: ACTION_RESTART })
  })

  it('returns null for the centre cell (no-op tile preview)', () => {
    expect(actionForKey(freshState(), '5')).toBeNull()
  })

  it('returns null for any key outside the 1..9 numpad range', () => {
    const s = freshState()
    expect(actionForKey(s, '0')).toBeNull()
    expect(actionForKey(s, 'x')).toBeNull()
    expect(actionForKey(s, '')).toBeNull()
    expect(actionForKey(s, ' ')).toBeNull()
  })
})

describe('actionForKey — blind mode', () => {
  // Blind mode hides developer affordances that would let an agent skip the
  // discovery loop the game is built around. Today that's the minimap toggle
  // (full-world reveal); the rest of the grid is unaffected.
  it('hides the minimap toggle when blind=true', () => {
    expect(actionForKey(freshState(), '1', { blind: true })).toBeNull()
  })

  it('still exposes the minimap toggle when blind=false (default)', () => {
    expect(actionForKey(freshState(), '1')).toEqual({ type: ACTION_TOGGLE_MINIMAP })
    expect(actionForKey(freshState(), '1', { blind: false })).toEqual({ type: ACTION_TOGGLE_MINIMAP })
  })

  it('does not suppress non-minimap actions when blind=true', () => {
    const s = freshState()
    expect(actionForKey(s, '8', { blind: true })).toEqual({ type: ACTION_MOVE, dx: 0, dy: -1 })
    expect(actionForKey(s, '7', { blind: true })).toEqual({ type: ACTION_SHOW_GOAL })
    expect(actionForKey(s, '9', { blind: true })).toEqual({ type: ACTION_TOGGLE_MAP })
    expect(actionForKey(s, '3', { blind: true })).toEqual({ type: ACTION_RESTART })
  })
})
