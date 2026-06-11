import { describe, expect, it } from 'vitest'
import { LOCKSMITH_KEY_FOOD_COST, LOCKSMITH_KEY_GOLD_COST, NO_GOLD_LINES } from '../../../src/core/constants'
import { LOCKSMITH_NAME, LOCKSMITH_NO_FOOD_LINES } from '../../../src/core/lore'
import {
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
} from '../../../src/core/mechanics/defs/locksmith'
import { processAction } from '../../../src/core/processAction'
import type { LocksmithEncounter, State } from '../../../src/core/types'
import { makeResources } from '../_helpers/makeResources'

function locksmithState(overrides: Partial<State['resources']> = {}): State {
  const enc: LocksmithEncounter = {
    kind: 'locksmith',
    sourceCellId: 3,
    restoreMessage: `${LOCKSMITH_NAME}\nEnter.`,
  }
  return {
    world: { seed: 1, width: 3, height: 3, mapGenAlgorithm: 'TEST', cells: [], rngState: 0 },
    player: { position: { x: 0, y: 0 } },
    run: {
      stepCount: 0,
      hasWon: false,
      isGameOver: false,
      knowsPosition: false,
      path: [],
      lostBufferStartIndex: null,
    },
    resources: makeResources({ food: 10, gold: 10, armySize: 5, ...overrides }),
    encounter: enc,
    ui: { message: '', leftPanel: { kind: 'auto' } },
    pendingEvents: [],
  }
}

describe('locksmith pay shortfall', () => {
  it('pay gold highlights gold when short', () => {
    const after = processAction(locksmithState({ gold: LOCKSMITH_KEY_GOLD_COST - 1 }), {
      type: ACTION_LOCKSMITH_PAY_GOLD,
    })!
    expect(after.ui.message.startsWith(`${LOCKSMITH_NAME}\n`)).toBe(true)
    expect(NO_GOLD_LINES).toContain(after.ui.message.slice(`${LOCKSMITH_NAME}\n`.length))
    expect(after.pendingEvents).toContainEqual({
      kind: 'iconHighlighted',
      target: { band: 'stats', id: 'gold' },
    })
  })

  it('pay food highlights food when short', () => {
    const after = processAction(locksmithState({ food: LOCKSMITH_KEY_FOOD_COST - 1 }), {
      type: ACTION_LOCKSMITH_PAY_FOOD,
    })!
    expect(after.ui.message.startsWith(`${LOCKSMITH_NAME}\n`)).toBe(true)
    expect(LOCKSMITH_NO_FOOD_LINES).toContain(after.ui.message.slice(`${LOCKSMITH_NAME}\n`.length))
    expect(after.pendingEvents).toContainEqual({
      kind: 'iconHighlighted',
      target: { band: 'stats', id: 'food' },
    })
  })
})
