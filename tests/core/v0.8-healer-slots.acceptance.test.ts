import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_MOVE, HEALER_UPKEEP_GOLD, WYRM_PAY_GOLD_COST } from '../../src/core/constants'
import { ACTION_COMBAT_PAY, applyHealerMend } from '../../src/core/mechanics/defs/combat'
import { ACTION_TOWN_BUY_RUMOR, ACTION_TOWN_HIRE_HEALER } from '../../src/core/mechanics/defs/town'
import type { Cell, CombatEncounter, LairCell, State, TownCell, World } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

function grass(): Cell {
  return { kind: 'grass' }
}

function makeWorld(town: TownCell): World {
  return {
    seed: 7,
    width: 3,
    height: 3,
    mapGenAlgorithm: 'TEST',
    cells: [
      [grass(), grass(), grass()],
      [grass(), town, grass()],
      [grass(), grass(), grass()],
    ],
    rngState: 1,
  }
}

function makeState(town: TownCell, resources = makeResources({ food: 10, gold: 20, armySize: 10 })): State {
  return {
    world: makeWorld(town),
    player: { position: { x: 1, y: 0 } },
    run: { stepCount: 5, hasWon: false, isGameOver: false, knowsPosition: true, path: [], lostBufferStartIndex: null },
    resources,
    encounter: null,
    ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
  }
}

const baseTown: TownCell = {
  kind: 'town',
  id: 4,
  name: 'Stonebridge',
  offers: ['buyFood', 'buyTroops', 'hireHealer', 'buyRumors'],
  prices: { foodGold: 3, troopsGold: 5, companionHireGold: 15, rumorGold: 2 },
  bundles: { food: 3, troops: 2 },
}

describe('v0.8 healer + slots acceptance', () => {
  it('healer mends up to 2 round losses after victory', () => {
    const enc: CombatEncounter = {
      kind: 'combat',
      enemyArmySize: 0,
      initialSpawn: 5,
      armyAtCombatStart: 10,
      sourceCellId: 1,
      restoreMessage: '',
    }
    const res = makeResources({ armySize: 7, party: ['healer'] })
    const mended = applyHealerMend(res, enc)
    expect(mended.armySize).toBe(9)
  })

  it('healer does not mend on flee (only rear-guard loss applies)', () => {
    const enc: CombatEncounter = {
      kind: 'combat',
      enemyArmySize: 3,
      initialSpawn: 5,
      armyAtCombatStart: 5,
      sourceCellId: 1,
      restoreMessage: '',
    }
    const afterRounds = makeResources({ armySize: 4, party: ['healer'] })
    expect(applyHealerMend(afterRounds, enc).armySize).toBe(5)
    const afterFleeArmy = afterRounds.armySize - 1
    expect(afterFleeArmy).toBe(3)
  })

  it('healer mends round losses when paying after fighting', () => {
    const enc: CombatEncounter = {
      kind: 'combat',
      enemyArmySize: 5,
      initialSpawn: 10,
      armyAtCombatStart: 10,
      sourceCellId: 1,
      restoreMessage: '',
    }
    const afterFighting = makeResources({ armySize: 7, party: ['healer'] })
    expect(applyHealerMend(afterFighting, enc).armySize).toBe(9)
  })

  it('healer upkeep on town enter', () => {
    const s0 = makeState(baseTown, makeResources({ gold: 5, armySize: 5, party: ['healer'] }))
    const onto = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(onto.resources.gold).toBe(5 - HEALER_UPKEEP_GOLD)
    expect(onto.encounter?.kind).toBe('town')
  })

  it('rumor cap per town visit', () => {
    const s0 = makeState(baseTown, makeResources({ gold: 99, armySize: 5 }))
    let s = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    s = processAction(s, { type: ACTION_TOWN_BUY_RUMOR })!
    s = processAction(s, { type: ACTION_TOWN_BUY_RUMOR })!
    s = processAction(s, { type: ACTION_TOWN_BUY_RUMOR })!
    const goldBefore = s.resources.gold
    const fourth = processAction(s, { type: ACTION_TOWN_BUY_RUMOR })!
    expect(fourth.resources.gold).toBe(goldBefore)
  })

  it('party full refuses hire with stable line and no gold spent', () => {
    const fullParty = ['scout', 'beast', 'captain']
    const s0 = makeState(baseTown, makeResources({ gold: 20, armySize: 5, party: fullParty }))
    const inTown = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const refused = processAction(inTown, { type: ACTION_TOWN_HIRE_HEALER })!
    expect(refused.resources.gold).toBe(20)
    expect(refused.resources.party).toEqual(fullParty)
    const again = processAction(refused, { type: ACTION_TOWN_HIRE_HEALER })!
    expect(again.ui.message).toBe(refused.ui.message)
  })

  it('hire healer adds healer to party', () => {
    const s0 = makeState(baseTown, makeResources({ gold: 20, armySize: 5 }))
    const inTown = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    const hired = processAction(inTown, { type: ACTION_TOWN_HIRE_HEALER })!
    expect(hired.resources.party).toContain('healer')
    expect(hired.resources.gold).toBe(20 - 15)
  })

  // GWT: pay exit without fighting — no mend (docs/plans/2026-06-03-v0.8-design.md)
  it('healer does not mend army when paying to leave wyrm combat without fighting', () => {
    const lair: LairCell = { kind: 'lair', id: 4, isBled: false }
    const world: World = {
      seed: 1,
      width: 3,
      height: 3,
      mapGenAlgorithm: 'TEST',
      cells: [
        [grass(), grass(), grass()],
        [grass(), lair, grass()],
        [grass(), grass(), grass()],
      ],
      rngState: 1,
    }
    const armySize = 10
    const s0: State = {
      world,
      player: { position: { x: 1, y: 0 } },
      run: { stepCount: 0, hasWon: false, isGameOver: false, knowsPosition: false, path: [], lostBufferStartIndex: null },
      resources: makeResources({
        gold: WYRM_PAY_GOLD_COST + 5,
        armySize,
        party: ['healer'],
      }),
      encounter: null,
      ui: { message: '', leftPanel: { kind: 'auto' }, clock: { frame: 0 }, anim: { nextId: 1, active: [] } },
    }
    const inCombat = processAction(s0, { type: ACTION_MOVE, dx: 0, dy: 1 })!
    expect(inCombat.encounter?.kind).toBe('combat')
    const paid = processAction(inCombat, { type: ACTION_COMBAT_PAY })!
    expect(paid.encounter).toBe(null)
    expect(paid.resources.armySize).toBe(armySize)
  })
})
