import { describe, expect, it } from 'vitest'
import {
  CAMP_FOOD_GAIN,
  FARM_BUY_FOOD_GOLD_COST,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
} from '../../src/core/constants'
import { MECHANIC_INDEX } from '../../src/core/mechanics'
import { SPRITES } from '../../src/core/spriteIds'
import type { Cell, Encounter, EncounterKind, HengeCell, State, World } from '../../src/core/types'
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

function makeState(
  centerCell: Cell,
  encounter: Encounter | null,
  resourceOverrides: Partial<{ food: number; gold: number; armySize: number }> = {},
): State {
  return {
    world: makeWorld(centerCell),
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 1, hasWon: false, isGameOver: false, knowsPosition: true, path: [], lostBufferStartIndex: null },
    resources: makeResources({ food: 10, gold: 50, armySize: 5, ...resourceOverrides }),
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
      const camp: Cell = {
        kind: 'camp',
        id: 4,
        name: 'Ember Watch',
        nextReadyStep: 0,
        offers: ['CAMP_SEARCH'],
        companionHireGold: 15,
      }
      const state = makeState(camp, { kind: 'camp', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('camp')(state)
      expect(lines).not.toBeNull()
      expect(lines!.length).toBeGreaterThanOrEqual(2)
      expect(lines![0]).toMatchObject({ spriteId: SPRITES.inventory.food, text: `+${CAMP_FOOD_GAIN}` })
      expect(lines![1]!.spriteId).toBe(SPRITES.inventory.army)
      expect(lines![1]!.text.startsWith('+')).toBe(true)
    })

    it('returns null when the camp is on cooldown and no scout cost applies', () => {
      const camp: Cell = {
        kind: 'camp',
        id: 4,
        name: 'Ember Watch',
        nextReadyStep: 100,
        offers: ['CAMP_SEARCH'],
        companionHireGold: 15,
      }
      const state = makeState(camp, { kind: 'camp', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('camp')(state)
      expect(lines).toBeNull()
    })
  })

  describe('town', () => {
    it('one line per offer, in left/top/bottom slot order, with the offer price', () => {
      const town: Cell = {
        kind: 'town',
        id: 9,
        name: 'Stonebridge',
        offers: ['buyFood', 'buyTroops', 'hireScout'],
        prices: { foodGold: 3, troopsGold: 5, companionHireGold: 12, rumorGold: 4 },
        bundles: { food: 3, troops: 2 },
      }
      const state = makeState(town, { kind: 'town', sourceCellId: 9, restoreMessage: '', rumorsBought: 0 })
      const lines = lookup('town')(state)
      expect(lines).not.toBeNull()
      expect(lines!.length).toBe(3)
      expect(lines![0]).toEqual({ spriteId: SPRITES.inventory.food, text: '-3' })
      expect(lines![1]).toEqual({ spriteId: SPRITES.inventory.army, text: '-5' })
      expect(lines![2]).toEqual({ spriteId: SPRITES.inventory.scout, text: '-12' })
    })

    it('renders a rumors offer using the rumor sprite and price', () => {
      const town: Cell = {
        kind: 'town',
        id: 9,
        name: 'Stonebridge',
        offers: ['buyRumors'],
        prices: { foodGold: 0, troopsGold: 0, companionHireGold: 0, rumorGold: 7 },
        bundles: { food: 3, troops: 2 },
      }
      const state = makeState(town, { kind: 'town', sourceCellId: 9, restoreMessage: '', rumorsBought: 0 })
      const lines = lookup('town')(state)
      expect(lines).toEqual([{ spriteId: SPRITES.actions.rumor, text: '-7' }])
    })
  })

  describe('farm', () => {
    it('returns the food buy cost line and the beast price line', () => {
      const farm: Cell = {
        kind: 'farm',
        id: 4,
        name: 'Greyfield',
        offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'],
        companionHireGold: 17,
      }
      const state = makeState(farm, { kind: 'farm', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('farm')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.inventory.food, text: `-${FARM_BUY_FOOD_GOLD_COST}` },
        { spriteId: SPRITES.inventory.beast, text: '-17' },
      ])
    })
  })

  describe('locksmith', () => {
    it('returns the gold cost line and the food cost line', () => {
      const lock: Cell = { kind: 'locksmith' }
      const state = makeState(lock, { kind: 'locksmith', sourceCellId: 4, restoreMessage: '' })
      const lines = lookup('locksmith')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.inventory.gold, text: `-${LOCKSMITH_KEY_GOLD_COST}` },
        { spriteId: SPRITES.inventory.food, text: `-${LOCKSMITH_KEY_FOOD_COST}` },
      ])
    })
  })

  describe('combat', () => {
    // Plates are minimal — enemy count + variant sprite always; a recruit
    // cost row only when `payment.isEligible` returns 'ok'. Variant lookup
    // keys on `cell.kind` at `encounter.sourceCellId`, so each case sets
    // the centre cell to the corresponding kind.

    it('brigand plate: enemy count only when band too large to recruit', () => {
      const initialSpawn = 10
      const enemyArmySize = 6 // > BRIGAND_RECRUIT_MAX_REMAINING (5) → tooMany
      const state = makeState({ kind: 'mountain' }, {
        kind: 'combat',
        enemyArmySize,
        initialSpawn,
        armyAtCombatStart: 10,
        sourceCellId: 4,
        restoreMessage: '',
      })
      const lines = lookup('combat')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.enemies.enemy, text: `${enemyArmySize}` },
      ])
    })

    it('brigand plate: enemy count + recruit cost when wounded, small, paid', () => {
      const initialSpawn = 12
      const enemyArmySize = 3 // wounded + small (≤5)
      const state = makeState(
        { kind: 'mountain' },
        {
          kind: 'combat',
          enemyArmySize,
          initialSpawn,
          armyAtCombatStart: 10,
          sourceCellId: 4,
          restoreMessage: '',
        },
        { gold: 100 }, // affordable: cost=9
      )
      const lines = lookup('combat')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.enemies.enemy, text: `${enemyArmySize}` },
        { spriteId: SPRITES.inventory.gold, text: `-${enemyArmySize * enemyArmySize}` },
      ])
    })

    it('goblin plate: enemy count only with goblin sprite (#130)', () => {
      const initialSpawn = 10
      const enemyArmySize = 6
      const state = makeState({ kind: 'woods' }, {
        kind: 'combat',
        enemyArmySize,
        initialSpawn,
        armyAtCombatStart: 10,
        sourceCellId: 4,
        restoreMessage: '',
      })
      const lines = lookup('combat')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.enemies.goblin, text: `${enemyArmySize}` },
      ])
    })

    it('henge plate: enemy count only when fresh band (not wounded)', () => {
      const initialSpawn = 20
      const henge: HengeCell = {
        kind: 'henge',
        id: 4,
        name: 'The Mending',
        nextReadyStep: 0,
        currentGroup: initialSpawn,
      }
      const state = makeState(henge, {
        kind: 'combat',
        enemyArmySize: initialSpawn,
        initialSpawn,
        armyAtCombatStart: 10,
        sourceCellId: 4,
        restoreMessage: '',
      })
      const lines = lookup('combat')(state)
      expect(lines).toEqual([
        { spriteId: SPRITES.enemies.enemy, text: `${initialSpawn}` },
      ])
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
      expect(lines).toEqual([{ spriteId: SPRITES.enemies.enemy, text: '0' }])
    })

    it('right-grid is total on the synthesized preview encounter (sourceCellId: -1)', () => {
      const previewEncounter = MECHANIC_INDEX.previewEncounterByEncounterKind.combat?.()
      expect(previewEncounter).toBeDefined()
      const state = makeState({ kind: 'grass' }, previewEncounter ?? null)
      const provider = MECHANIC_INDEX.rightGridByEncounterKind.combat
      if (!provider) throw new Error('No combat right-grid registered')
      // Center cell falls through `combatVariantForEncounter`; the
      // sentinel encounter (sourceCellId: -1) resolves to a placeholder
      // variant that renders the generic enemy sprite without crashing.
      const center = provider(state, 1, 1)
      expect(center.spriteId).toBe(SPRITES.enemies.enemy)
      expect(center.action).toBeNull()
    })
  })
})
