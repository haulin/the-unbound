import { describe, expect, it } from 'vitest'
import {
  CAMP_FOOD_GAIN,
  FARM_BUY_FOOD_GOLD_COST,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
} from '../../src/core/constants'
import { MECHANIC_INDEX } from '../../src/core/mechanics'
import { SPRITES } from '../../src/core/spriteIds'
import type { Cell, Encounter, EncounterKind, State, World } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

function makeWorld(centerCell: Cell): World {
  const grass = (): Cell => ({ kind: 'grass' })
  return {
    seed: 1,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), centerCell, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(centerCell: Cell, encounter: Encounter | null): State {
  return {
    world: makeWorld(centerCell),
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 1, hasWon: false, isGameOver: false, knowsPosition: true, path: [], lostBufferStartIndex: null },
    resources: makeResources({ food: 10, gold: 50, armySize: 5 }),
    encounter,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

function lookup(kind: EncounterKind) {
  const provider = MECHANIC_INDEX.previewPlateByEncounterKind[kind]
  if (!provider) throw new Error(`No previewPlate registered for ${kind}`)
  return provider
}

describe('previewPlate hooks', () => {
  describe('camp', () => {
    it('returns food + army lines when the camp is ready', () => {
      const camp: Cell = { kind: 'camp', id: 4, name: 'Ember Watch', nextReadyStep: 0 }
      const state = makeState(camp, { kind: 'camp', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('camp')(state)
      expect(lines).not.toBeNull()
      expect(lines!.length).toBeGreaterThanOrEqual(2)
      expect(lines![0]).toMatchObject({ spriteId: SPRITES.stats.food, text: `+${CAMP_FOOD_GAIN}` })
      expect(lines![1]!.spriteId).toBe(SPRITES.stats.troop)
      expect(lines![1]!.text.startsWith('+')).toBe(true)
    })

    it('returns null when the camp is on cooldown and no scout cost applies', () => {
      const camp: Cell = { kind: 'camp', id: 4, name: 'Ember Watch', nextReadyStep: 100 }
      const state = makeState(camp, { kind: 'camp', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('camp')(state)
      expect(lines).toBeNull()
    })
  })

  describe('town', () => {
    it('one line per offer, in offer order, with the offer price', () => {
      const town: Cell = {
        kind: 'town',
        id: 9,
        name: 'Stonebridge',
        offers: ['buyFood', 'buyTroops', 'hireScout'],
        prices: { foodGold: 3, troopsGold: 5, scoutGold: 12, rumorGold: 4 },
        bundles: { food: 3, troops: 2 },
      }
      const state = makeState(town, { kind: 'town', sourceCellId: 9, restoreMessage: '' })
      const lines = lookup('town')(state)
      expect(lines).not.toBeNull()
      expect(lines!.length).toBe(3)
      expect(lines![0]).toEqual({ spriteId: SPRITES.stats.food, text: '-3' })
      expect(lines![1]).toEqual({ spriteId: SPRITES.stats.troop, text: '-5' })
      expect(lines![2]).toEqual({ spriteId: SPRITES.stats.scout, text: '-12' })
    })

    it('renders a rumors offer using the rumor sprite and price', () => {
      const town: Cell = {
        kind: 'town',
        id: 9,
        name: 'Stonebridge',
        offers: ['buyRumors'],
        prices: { foodGold: 0, troopsGold: 0, scoutGold: 0, rumorGold: 7 },
        bundles: { food: 3, troops: 2 },
      }
      const state = makeState(town, { kind: 'town', sourceCellId: 9, restoreMessage: '' })
      const lines = lookup('town')(state)
      expect(lines).toEqual([{ spriteId: SPRITES.cosmetics.rumorIllustration, text: '-7' }])
    })
  })

  describe('farm', () => {
    it('returns the food buy cost line and the beast price line', () => {
      const farm: Cell = { kind: 'farm', id: 4, name: 'Greyfield', beastGoldCost: 17 }
      const state = makeState(farm, { kind: 'farm', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('farm')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.stats.food, text: `-${FARM_BUY_FOOD_GOLD_COST}` },
        { spriteId: SPRITES.cosmetics.beastIllustration, text: '-17' },
      ])
    })
  })

  describe('locksmith', () => {
    it('returns the gold cost line and the food cost line', () => {
      const lock: Cell = { kind: 'locksmith' }
      const state = makeState(lock, { kind: 'locksmith', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('locksmith')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.stats.gold, text: `-${LOCKSMITH_KEY_GOLD_COST}` },
        { spriteId: SPRITES.stats.food, text: `-${LOCKSMITH_KEY_FOOD_COST}` },
      ])
    })
  })

  describe('combat', () => {
    it('returns the enemy count line', () => {
      const state = makeState({ kind: 'grass' }, {
        kind: 'combat',
        enemyArmySize: 7,
        sourceCellId: 0,
        restoreMessage: '',
      })
      const lines = lookup('combat')(state)
      expect(lines).toEqual([{ spriteId: SPRITES.stats.enemy, text: '7' }])
    })

    it('returns null when no combat encounter is active', () => {
      const state = makeState({ kind: 'grass' }, null)
      const lines = lookup('combat')(state)
      expect(lines).toBeNull()
    })

    // Regression: pre-v0.5, combat right-grid + preview-plate ignored
    // `sourceCellId`, so the renderer's placeholder preview encounter
    // (`previewEncounter()` returns `sourceCellId: -1`) was always safe to
    // pass through. v0.5's variant lookup dereferences `sourceCellId` to find
    // the source mechanic, which crashed on the sentinel because
    // `cells[Math.floor(-1 / width)]` is undefined. The providers must remain
    // total functions on the synthesized preview — the renderer uses them to
    // build the right-grid for grid-slide transitions before any real source
    // cell exists.
    it('preview-plate is total on the synthesized preview encounter (sourceCellId: -1)', () => {
      const previewEncounter = MECHANIC_INDEX.previewEncounterByEncounterKind.combat?.()
      expect(previewEncounter).toBeDefined()
      const state = makeState({ kind: 'grass' }, previewEncounter ?? null)
      const lines = lookup('combat')(state)
      expect(lines).toEqual([{ spriteId: SPRITES.stats.enemy, text: '0' }])
    })

    it('right-grid is total on the synthesized preview encounter (sourceCellId: -1)', () => {
      const previewEncounter = MECHANIC_INDEX.previewEncounterByEncounterKind.combat?.()
      expect(previewEncounter).toBeDefined()
      const state = makeState({ kind: 'grass' }, previewEncounter ?? null)
      const provider = MECHANIC_INDEX.rightGridByEncounterKind.combat
      if (!provider) throw new Error('No combat right-grid registered')
      // Center cell falls through `combatVariantForEncounter`; sentinel must
      // resolve to STANDARD_COMBAT_VARIANT, not crash on the missing cell.
      const center = provider(state, 1, 1)
      expect(center.spriteId).toBe(SPRITES.stats.enemy)
      expect(center.action).toBeNull()
    })
  })
})
