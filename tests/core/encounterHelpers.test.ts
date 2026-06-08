import { describe, expect, it } from 'vitest'
import {
  combatLoreMessage,
  leaveEncounter,
  loreMessage,
  loreTitleFromRestore,
  noGoldResponse,
  openNamedPoiEncounter,
  poiTitleFor,
  setEncounterLoreBody,
  setEncounterMessage,
} from '../../src/core/mechanics/encounterHelpers'
import { TOWN_NO_GOLD_LINES } from '../../src/core/constants'
import type { Resources, State, Ui } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

const baseUi: Ui = {
  message: 'before',
  leftPanel: { kind: 'auto' },
}

const baseResources: Resources = makeResources({ food: 5, gold: 10, armySize: 3 })

function makeMinimalState(overrides: Partial<State> = {}): State {
  return {
    world: { seed: 1, width: 1, height: 1, mapGenAlgorithm: 'test', cells: [[{ kind: 'grass' }]], rngState: 0 },
    player: { position: { x: 0, y: 0 } },
    run: {
      stepCount: 0,
      hasWon: false,
      isGameOver: false,
      knowsPosition: false,
      path: [],
      lostBufferStartIndex: null,
    },
    resources: baseResources,
    encounter: null,
    ui: baseUi,
    pendingEvents: [],
    ...overrides,
  }
}

describe('encounterHelpers', () => {
  describe('loreMessage', () => {
    it('joins title and body with newline when title is set', () => {
      expect(loreMessage('Stonebridge Town', 'Smoke on the wind.')).toBe('Stonebridge Town\nSmoke on the wind.')
    })

    it('returns body only when title is omitted', () => {
      expect(loreMessage(undefined, 'Something stirs.')).toBe('Something stirs.')
    })
  })

  describe('poiTitleFor', () => {
    it('uses worldgen name + suffix', () => {
      expect(poiTitleFor('Stonebridge', 'Town')).toBe('Stonebridge Town')
    })

    it('falls back when name is missing', () => {
      expect(poiTitleFor(undefined, 'Camp')).toBe('A Camp')
    })
  })

  describe('loreTitleFromRestore', () => {
    it('extracts first line when restoreMessage has a newline', () => {
      expect(loreTitleFromRestore('Wyrm Henge\nThe stones hum.')).toBe('Wyrm Henge')
    })

    it('returns undefined for body-only restoreMessage', () => {
      expect(loreTitleFromRestore('Something stirs in the brush.')).toBeUndefined()
    })
  })

  describe('setEncounterLoreBody', () => {
    it('preserves title from encounter.restoreMessage', () => {
      const s = makeMinimalState({
        encounter: { kind: 'combat', sourceCellId: 1, restoreMessage: 'Old Henge\nArrival line', enemyArmySize: 3, armyAtCombatStart: 5, initialSpawn: 3 },
        ui: { ...baseUi, message: 'Old Henge\nArrival line' },
      })
      const change = setEncounterLoreBody(s, 'You paid them off.')
      expect(change.message).toBe('Old Henge\nYou paid them off.')
    })
  })

  describe('combatLoreMessage', () => {
    it('preserves titled restoreMessage for combat outcomes', () => {
      const s = makeMinimalState({
        encounter: { kind: 'combat', sourceCellId: 1, restoreMessage: 'Old Henge\nArrival line', enemyArmySize: 3, armyAtCombatStart: 5, initialSpawn: 3 },
      })
      expect(combatLoreMessage(s, 'Victory.')).toBe('Old Henge\nVictory.')
    })

    it('returns body only when restoreMessage has no title', () => {
      const s = makeMinimalState({
        encounter: { kind: 'combat', sourceCellId: 1, restoreMessage: 'Something stirs.', enemyArmySize: 3, armyAtCombatStart: 5, initialSpawn: 3 },
      })
      expect(combatLoreMessage(s, 'Victory.')).toBe('Victory.')
    })
  })

  describe('openNamedPoiEncounter', () => {
    it('opens a titled modal PoI with matching message and restoreMessage', () => {
      const opened = openNamedPoiEncounter({
        kind: 'camp',
        sourceCellId: 42,
        title: 'Ash Camp',
        enterBody: 'Smoke on the horizon.',
      })
      expect(opened.message).toBe('Ash Camp\nSmoke on the horizon.')
      expect(opened.encounter.restoreMessage).toBe(opened.message)
      expect(opened.encounter.kind).toBe('camp')
    })
  })

  describe('setEncounterMessage', () => {
    it('returns a Change with message = "<prefix>\\n<line>"', () => {
      const change = setEncounterMessage('A Town Town', 'a line')
      expect(change.message).toBe('A Town Town\na line')
    })

    it('does not mutate other state slices', () => {
      const change = setEncounterMessage('X', 'y')
      expect(change.resources).toBeUndefined()
      expect(change.encounter).toBeUndefined()
      expect(change.events).toBeUndefined()
    })
  })

  describe('noGoldResponse', () => {
    it('returns a Change with message picked from TOWN_NO_GOLD_LINES', () => {
      const s = makeMinimalState()
      const change = noGoldResponse(s, 'A Town Town')
      const prefix = 'A Town Town\n'
      expect(change.message?.startsWith(prefix)).toBe(true)
      const line = change.message!.slice(prefix.length)
      expect(TOWN_NO_GOLD_LINES).toContain(line)
      expect(change.resources).toBeUndefined()
    })
  })

  describe('leaveEncounter', () => {
    it('returns a Change clearing encounter, restoring enc.restoreMessage, with encounterClosed event', () => {
      const s = makeMinimalState({
        encounter: { kind: 'camp', sourceCellId: 7, restoreMessage: 'restored' },
        ui: { ...baseUi, message: 'overridden by encounter' },
      })
      const change = leaveEncounter(s, 'camp')
      expect(change.encounter).toBeNull()
      expect(change.message).toBe('restored')
      expect(change.events).toEqual([
        { kind: 'encounterClosed', encounterKind: 'camp', outcome: 'leave' },
      ])
    })

    it('falls back to current ui message when encounter is null', () => {
      const s = makeMinimalState({ ui: { ...baseUi, message: 'fallback' } })
      const change = leaveEncounter(s, 'town')
      expect(change.message).toBe('fallback')
      expect(change.encounter).toBeNull()
    })
  })

})
