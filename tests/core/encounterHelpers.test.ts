import { describe, expect, it } from 'vitest'
import {
  applyDeltas,
  applyEnterAnims,
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
import type { AnimSpec } from '../../src/core/mechanics/types'
import type { Resources, State, Ui } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

const baseUi: Ui = {
  message: 'before',
  leftPanel: { kind: 'auto' },
  clock: { frame: 100 },
  anim: { nextId: 1, active: [] },
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
      const next = setEncounterLoreBody(s, 'You paid them off.')
      expect(next.ui.message).toBe('Old Henge\nYou paid them off.')
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
      expect(opened.enterAnims).toEqual([{ kind: 'gridTransition', from: 'overworld', to: 'camp' }])
    })
  })

  describe('setEncounterMessage', () => {
    it('replaces message with "<prefix>\\n<line>"', () => {
      const s = makeMinimalState()
      const next = setEncounterMessage(s, 'A Town Town', 'a line')
      expect(next.ui.message).toBe('A Town Town\na line')
    })

    it('preserves other ui fields and rest of state', () => {
      const s = makeMinimalState()
      const next = setEncounterMessage(s, 'X', 'y')
      expect(next.ui.clock).toBe(s.ui.clock)
      expect(next.ui.anim).toBe(s.ui.anim)
      expect(next.ui.leftPanel).toBe(s.ui.leftPanel)
      expect(next.player).toBe(s.player)
      expect(next.world).toBe(s.world)
    })
  })

  describe('noGoldResponse', () => {
    it('sets a "<prefix>\\n<line>" message picked from TOWN_NO_GOLD_LINES', () => {
      const s = makeMinimalState()
      const next = noGoldResponse(s, 'A Town Town')
      const prefix = 'A Town Town\n'
      expect(next.ui.message.startsWith(prefix)).toBe(true)
      const line = next.ui.message.slice(prefix.length)
      expect(TOWN_NO_GOLD_LINES).toContain(line)
      expect(next.resources).toBe(s.resources)
    })
  })

  describe('leaveEncounter', () => {
    it('clears encounter, restores enc.restoreMessage, enqueues grid transition', () => {
      const s = makeMinimalState({
        encounter: { kind: 'camp', sourceCellId: 7, restoreMessage: 'restored' },
        ui: { ...baseUi, message: 'overridden by encounter' },
      })
      const next = leaveEncounter(s, 'camp')
      expect(next.encounter).toBeNull()
      expect(next.ui.message).toBe('restored')
      expect(next.ui.anim.active.length).toBe(1)
      expect(next.ui.anim.active[0]!.kind).toBe('gridTransition')
    })

    it('falls back to current ui message when encounter is null', () => {
      const s = makeMinimalState({ ui: { ...baseUi, message: 'fallback' } })
      const next = leaveEncounter(s, 'town')
      expect(next.ui.message).toBe('fallback')
      expect(next.encounter).toBeNull()
    })
  })

  describe('applyDeltas', () => {
    it('diffs resources when deltas omitted', () => {
      const s = makeMinimalState({ resources: makeResources({ food: 5, gold: 10, armySize: 3 }) })
      const next = applyDeltas(s, {
        message: 'ok',
        resources: makeResources({ food: 5, gold: 9, armySize: 5 }),
      })
      expect(next.resources.gold).toBe(9)
      expect(next.resources.armySize).toBe(5)
      const pops = next.ui.anim.active.filter((a) => a.kind === 'delta')
      expect(pops.some((a) => a.params.target === 'gold' && a.params.delta === -1)).toBe(true)
      expect(pops.some((a) => a.params.target === 'army' && a.params.delta === 2)).toBe(true)
    })

    it('applies new resources, run, and message', () => {
      const s = makeMinimalState()
      const newResources: Resources = { ...baseResources, gold: 5, food: 8 }
      const newRun = { ...s.run, stepCount: 99 }
      const next = applyDeltas(s, {
        resources: newResources,
        run: newRun,
        message: 'A Town Town\nbought stuff',
        deltas: [
          { target: 'gold', delta: -5 },
          { target: 'food', delta: 3 },
        ],
      })
      expect(next.resources).toBe(newResources)
      expect(next.run).toBe(newRun)
      expect(next.ui.message).toBe('A Town Town\nbought stuff')
    })

    it('enqueues one delta anim per non-zero delta', () => {
      const s = makeMinimalState()
      const next = applyDeltas(s, {
        resources: { ...baseResources, gold: 5 },
        message: 'm',
        deltas: [
          { target: 'gold', delta: -5 },
          { target: 'food', delta: 0 }, // skipped
          { target: 'army', delta: 2 },
        ],
      })
      const anims = next.ui.anim.active
      expect(anims.length).toBe(2)
      expect(anims.every((a) => a.kind === 'delta')).toBe(true)
      const targets = anims.map((a) => (a.kind === 'delta' ? a.params.target : null))
      expect(targets).toEqual(['gold', 'army'])
    })

    it('skips animations entirely when no deltas are non-zero', () => {
      const s = makeMinimalState()
      const next = applyDeltas(s, {
        message: 'm',
        deltas: [{ target: 'gold', delta: 0 }],
      })
      expect(next.ui.anim.active.length).toBe(0)
    })
  })

  describe('applyEnterAnims', () => {
    it('translates a gridTransition spec into an enqueued grid transition', () => {
      const specs: AnimSpec[] = [{ kind: 'gridTransition', from: 'overworld', to: 'combat', afterFrames: 8 }]
      const next = applyEnterAnims(baseUi, specs, 200)
      expect(next.anim.active.length).toBe(1)
      const anim = next.anim.active[0]!
      expect(anim.kind).toBe('gridTransition')
      expect(anim.startFrame).toBe(208) // 200 + 8 afterFrames
      if (anim.kind === 'gridTransition') {
        expect(anim.params).toEqual({ from: 'overworld', to: 'combat' })
      }
    })

    it('uses afterFrames=0 when omitted', () => {
      const specs: AnimSpec[] = [{ kind: 'gridTransition', from: 'blank', to: 'overworld' }]
      const next = applyEnterAnims(baseUi, specs, 50)
      expect(next.anim.active[0]!.startFrame).toBe(50)
    })

    it('preserves prior anims and enqueues in order', () => {
      const uiWithExisting: Ui = {
        ...baseUi,
        anim: {
          nextId: 5,
          active: [
            { id: 1, kind: 'delta', startFrame: 0, durationFrames: 10, blocksInput: false, params: { target: 'food', delta: 1 } },
          ],
        },
      }
      const specs: AnimSpec[] = [
        { kind: 'gridTransition', from: 'overworld', to: 'camp' },
        { kind: 'gridTransition', from: 'camp', to: 'overworld', afterFrames: 30 },
      ]
      const next = applyEnterAnims(uiWithExisting, specs, 100)
      expect(next.anim.active.length).toBe(3)
      expect(next.anim.active[0]!.id).toBe(1) // preserved
      expect(next.anim.active[1]!.startFrame).toBe(100)
      expect(next.anim.active[2]!.startFrame).toBe(130)
    })
  })
})
