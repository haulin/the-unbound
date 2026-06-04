import { describe, expect, it } from 'vitest'
import { ACTION_NEW_RUN } from '../../../src/core/constants'
import { processAction } from '../../../src/core/processAction'
import {
  LEFT_PANEL_KIND_MAP,
  LEFT_PANEL_KIND_MINIMAP,
  type State,
} from '../../../src/core/types'
import { renderState } from '../../../src/platform/terminal/render'

// renderState is pure: State + RenderOptions -> string. Use the real reducer
// to seed a fresh world so the test contract stays aligned with whatever the
// actual game ships, then assert structural invariants (lines, labels, blocks)
// rather than full literal output. That keeps tests stable across lore edits
// while still catching regressions in shape.
function freshState(): State {
  const s = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
  if (!s) throw new Error('NEW_RUN failed in test setup')
  return s
}

describe('renderState — header and resources', () => {
  it('renders a header line with step, seed, position, and tile', () => {
    // Pos can be either A1-style coords or LOST_COORD_LABEL (??) depending on
    // whether the player knows where they are; freshly-spawned runs start
    // lost. Accept both shapes.
    const out = renderState(freshState())
    expect(out).toMatch(/step \d+ \| seed \d+ \| pos (?:[A-Z]\d+|\?\?) \| tile \w+/)
  })

  it('formats pos in A1 style once knowsPosition flips on', () => {
    const s = freshState()
    s.run.knowsPosition = true
    expect(renderState(s)).toMatch(/pos [A-Z]\d+/)
  })

  it('renders a resources line with army / food (current/cap) / gold', () => {
    // Terminal-only affordance: surface the food carry cap that the TIC build
    // hides for pixel reasons. Default cap is army×2 (no mule), so a fresh
    // run with army 10 reads `food 15/20`.
    const out = renderState(freshState())
    expect(out).toMatch(/army \d+ \| food \d+\/\d+ \| gold \d+/)
  })

  it('renders the food cap as army×2 by default and bumps it when beast is in the party', () => {
    const noBeast = freshState()
    noBeast.resources = { ...noBeast.resources, armySize: 10, food: 5, party: [] }
    expect(renderState(noBeast)).toMatch(/food 5\/20 /)

    const withBeast = freshState()
    withBeast.resources = { ...withBeast.resources, armySize: 10, food: 5, party: ['beast'] }
    // BEAST_CARRY_CAP_BONUS = 50 → cap becomes 70 with army 10 + beast.
    expect(renderState(withBeast)).toMatch(/food 5\/70 /)
  })

  it('appends [GAME OVER] to the header when the run is over', () => {
    const s = freshState()
    s.run.isGameOver = true
    expect(renderState(s)).toContain('[GAME OVER]')
  })

  it('appends [YOU WIN] when the run has been won', () => {
    const s = freshState()
    s.run.hasWon = true
    expect(renderState(s)).toContain('[YOU WIN]')
  })
})

describe('renderState — actions block', () => {
  it('lists every numpad key 1..9 plus a quit hint', () => {
    const out = renderState(freshState())
    expect(out).toContain('actions:')
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(out).toMatch(new RegExp(`(?:^|\\s)${key}: `))
    }
    expect(out).toContain('q: Quit')
  })

  it('labels move keys with their compass direction', () => {
    const out = renderState(freshState())
    expect(out).toMatch(/8: move_n/)
    expect(out).toMatch(/2: move_s/)
    expect(out).toMatch(/4: move_w/)
    expect(out).toMatch(/6: move_e/)
  })

  it('labels the centre cell as a no-op (-)', () => {
    expect(renderState(freshState())).toMatch(/5: -/)
  })

  it('labels the corner UI buttons by their action type', () => {
    const out = renderState(freshState())
    expect(out).toMatch(/7: show_goal/)
    expect(out).toMatch(/9: toggle_map/)
    expect(out).toMatch(/3: restart/)
  })
})

describe('renderState — blind mode', () => {
  it('hides the minimap toggle button (renders "-" in its slot)', () => {
    const out = renderState(freshState(), { blind: true })
    expect(out).not.toMatch(/1: toggle_minimap/)
    expect(out).toMatch(/1: -/)
  })

  it('keeps the minimap toggle visible by default', () => {
    expect(renderState(freshState())).toMatch(/1: toggle_minimap/)
  })

  it('does not render the full-world minimap even when the panel is open', () => {
    // Dev affordance: even if minimap is somehow active, blind mode must not
    // leak the full reveal. Player-knowledge map block stays gated separately.
    const s = freshState()
    s.ui.leftPanel = { kind: LEFT_PANEL_KIND_MINIMAP }
    const out = renderState(s, { blind: true })
    expect(out).not.toContain('minimap:')
  })
})

describe('renderState — left panels', () => {
  it('renders the player-knowledge map block when the map panel is open', () => {
    const s = freshState()
    s.ui.leftPanel = {
      kind: LEFT_PANEL_KIND_MAP,
      restoreLeftPanel: { kind: 'auto' },
      restoreMessage: '',
    }
    const out = renderState(s)
    expect(out).toContain('map:')
    // 9x9 viewport with the player always pinned at the centre cell.
    expect(out).toContain('@')
  })

  it('renders the full minimap when the minimap panel is open and not blind', () => {
    const s = freshState()
    s.ui.leftPanel = { kind: LEFT_PANEL_KIND_MINIMAP }
    expect(renderState(s)).toContain('minimap:')
  })
})

describe('renderState — encounter plate', () => {
  it('renders the encounter kind and the preview plate stats inline', () => {
    const s = freshState()
    s.encounter = {
      kind: 'combat',
      enemyArmySize: 8,
      initialSpawn: 8,
      armyAtCombatStart: 10,
      sourceCellId: 0,
      restoreMessage: '',
    }
    const out = renderState(s)
    expect(out).toContain('encounter: combat')
    // Plate provider emits enemy stat → renderer translates the sprite id into
    // a short label. Brackets bound the plate stats.
    expect(out).toMatch(/encounter: combat\s+\[enemy 8\]/)
  })

  it('omits the encounter line when there is no encounter', () => {
    expect(renderState(freshState())).not.toContain('encounter:')
  })
})

describe('renderState — message channel', () => {
  it('echoes the ui.message string into its own block', () => {
    const s = freshState()
    s.ui.message = 'A wyrm stirs in the deep.'
    expect(renderState(s)).toContain('A wyrm stirs in the deep.')
  })

  it('skips the message block when ui.message is empty', () => {
    const s = freshState()
    s.ui.message = ''
    // Sanity: header is still present.
    const out = renderState(s)
    expect(out).toMatch(/step \d+/)
  })
})
