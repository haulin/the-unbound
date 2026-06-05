import { describe, expect, it } from 'vitest'
import {
  FARM_BUY_FOOD_GOLD_COST,
  LOCKSMITH_KEY_FOOD_COST,
  LOCKSMITH_KEY_GOLD_COST,
  WYRM_INITIAL_HEALTH,
  WYRM_PAY_GOLD_COST,
} from '../../src/core/constants'
import { MECHANIC_INDEX } from '../../src/core/mechanics'
import { ACTION_COMBAT_PAY, ACTION_FIGHT, ACTION_RETURN } from '../../src/core/mechanics/defs/combat'
import { encounterIllustrationSpriteId, getRightGridCellDef } from '../../src/core/rightGrid'
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

function makeState(centerCell: Cell, encounter: Encounter | null, resourceOverrides: Partial<{ food: number; gold: number; armySize: number }> = {}): State {
  return {
    world: makeWorld(centerCell),
    player: { position: { x: 1, y: 1 } },
    run: { stepCount: 1, hasWon: false, isGameOver: false, knowsPosition: true, path: [], lostBufferStartIndex: null },
    resources: makeResources({ food: 10, gold: 50, armySize: 5, ...resourceOverrides }),
    encounter,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

function rightGrid(kind: EncounterKind) {
  const provider = MECHANIC_INDEX.rightGridByEncounterKind[kind]
  if (!provider) throw new Error(`No rightGrid registered for ${kind}`)
  return provider
}

describe('rightGrid badges', () => {
  it('town offer buttons carry price badges in slot order', () => {
    const town: Cell = {
      kind: 'town',
      id: 9,
      name: 'Stonebridge',
      offers: ['buyFood', 'buyTroops', 'hireScout'],
      prices: { foodGold: 3, troopsGold: 5, companionHireGold: 12, rumorGold: 4 },
      bundles: { food: 3, troops: 2 },
    }
    const s = makeState(town, { kind: 'town', sourceCellId: 9, restoreMessage: '', rumorsBought: 0 })
    const grid = rightGrid('town')
    expect(grid(s, 1, 0)).toMatchObject({ badge: { variant: 'price', text: '-3' } })
    expect(grid(s, 0, 1)).toMatchObject({ badge: { variant: 'price', text: '-5' } })
    expect(grid(s, 2, 1)).toMatchObject({ badge: { variant: 'price', text: '-12' } })
    expect(encounterIllustrationSpriteId(s)).toBe(SPRITES.centers.marketStall)
  })

  it('camp search has no badge; scout hire shows price', () => {
    const camp: Cell = {
      kind: 'camp',
      id: 4,
      name: 'Ember Watch',
      nextReadyStep: 0,
      offers: ['CAMP_SEARCH', 'hireScout'],
      companionHireGold: 15,
    }
    const s = makeState(camp, { kind: 'camp', sourceCellId: 4, restoreMessage: '' })
    const grid = rightGrid('camp')
    const searchCell = grid(s, 1, 0)
    expect(searchCell.badge).toBeUndefined()
    expect(grid(s, 0, 1)).toMatchObject({ badge: { variant: 'price', text: '-15' } })
  })

  it('locksmith pay buttons show gold and food prices', () => {
    const s = makeState({ kind: 'locksmith' }, { kind: 'locksmith', sourceCellId: 4, restoreMessage: '' })
    const grid = rightGrid('locksmith')
    expect(grid(s, 0, 1)).toMatchObject({ badge: { variant: 'price', text: `-${LOCKSMITH_KEY_GOLD_COST}` } })
    expect(grid(s, 1, 0)).toMatchObject({ badge: { variant: 'price', text: `-${LOCKSMITH_KEY_FOOD_COST}` } })
  })

  it('combat fight/pay/return badges and center tile preview', () => {
    const enemyArmySize = 3
    const s = makeState(
      { kind: 'mountain' },
      {
        kind: 'combat',
        enemyArmySize,
        initialSpawn: 10,
        armyAtCombatStart: 5,
        sourceCellId: 4,
        restoreMessage: '',
      },
      { gold: 100 },
    )
    const grid = rightGrid('combat')
    expect(grid(s, 1, 0)).toMatchObject({
      spriteId: SPRITES.actions.fight,
      action: { type: ACTION_FIGHT },
      badge: { variant: 'left', text: `${enemyArmySize}` },
    })
    expect(grid(s, 0, 1)).toMatchObject({
      spriteId: SPRITES.inventory.gold,
      action: { type: ACTION_COMBAT_PAY },
      badge: { variant: 'price', text: '-9' },
    })
    expect(grid(s, 1, 2)).toMatchObject({
      action: { type: ACTION_RETURN },
      badge: { variant: 'price', text: '-1' },
    })
    expect(grid(s, 1, 1)).toEqual({ tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null })
    expect(getRightGridCellDef(s, 1, 1).tilePreview).toEqual({ kind: 'relativeToPlayer', dx: 0, dy: 0 })
  })

  it('wyrm combat uses wyrm illustration and pay badge when eligible', () => {
    const s = makeState(
      { kind: 'lair', id: 4, isBled: false },
      {
        kind: 'combat',
        enemyArmySize: WYRM_INITIAL_HEALTH,
        initialSpawn: WYRM_INITIAL_HEALTH,
        armyAtCombatStart: 5,
        sourceCellId: 4,
        restoreMessage: '',
      },
      { gold: 100 },
    )
    const grid = rightGrid('combat')
    expect(encounterIllustrationSpriteId(s)).toBe(SPRITES.enemies.wyrm)
    expect(grid(s, 1, 0)).toMatchObject({ badge: { variant: 'left', text: `${WYRM_INITIAL_HEALTH}` } })
    expect(grid(s, 0, 1)).toMatchObject({ badge: { variant: 'price', text: `-${WYRM_PAY_GOLD_COST}` } })
  })

  it('farm badges match offer prices', () => {
    const farm: Cell = {
      kind: 'farm',
      id: 4,
      name: 'Greyfield',
      offers: ['FARM_BUY_FOOD', 'FARM_BUY_BEAST'],
      companionHireGold: 17,
    }
    const s = makeState(farm, { kind: 'farm', sourceCellId: 4, restoreMessage: '' })
    const grid = rightGrid('farm')
    expect(grid(s, 1, 0)).toMatchObject({ badge: { variant: 'price', text: `-${FARM_BUY_FOOD_GOLD_COST}` } })
    expect(grid(s, 0, 1)).toMatchObject({ badge: { variant: 'price', text: '-17' } })
  })

  it('preview sentinel combat grid is total (sourceCellId: -1)', () => {
    const previewEncounter = MECHANIC_INDEX.previewEncounterByEncounterKind.combat?.()
    expect(previewEncounter).toBeDefined()
    const s = makeState({ kind: 'grass' }, previewEncounter ?? null)
    const grid = rightGrid('combat')
    expect(grid(s, 1, 1)).toEqual({ tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null })
    expect(grid(s, 1, 0).badge).toBeUndefined()
    expect(encounterIllustrationSpriteId(s)).toBe(SPRITES.enemies.enemy)
  })
})
