import { describe, expect, it } from 'vitest'
import '../../src/core/mechanics'
import { brigandCombatVariant } from '../../src/core/mechanics/defs/combat'
import {
  BRIGAND_FOOD_MAX,
  BRIGAND_GOLD_NOISE,
  BRIGAND_RECRUIT_MAX_REMAINING,
} from '../../src/core/constants'
import type { CombatEncounter, Resources } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

function makeEncounter(initialSpawn: number, enemyArmySize = initialSpawn): CombatEncounter {
  return { kind: 'combat', enemyArmySize, initialSpawn, sourceCellId: 0, restoreMessage: '' }
}

// armySize=100 keeps the food cap (2*armySize) far above any reward draw
// so we observe the raw formula without clamp interference.
function bigArmyResources(overrides: Partial<Resources> = {}): Resources {
  return makeResources({ food: 0, gold: 0, armySize: 100, ...overrides })
}

describe('brigandCombatVariant.victoryReward', () => {
  it('gold ∈ [N - NOISE .. N + NOISE], mean ≈ N (1000 seeds)', () => {
    const N = 10
    const trials = 1000
    let goldSum = 0
    for (let seed = 1; seed <= trials; seed++) {
      const base = bigArmyResources()
      const out = brigandCombatVariant.victoryReward(base, seed, makeEncounter(N))
      const gold = out.resources.gold - base.gold
      expect(gold).toBeGreaterThanOrEqual(Math.max(0, N - BRIGAND_GOLD_NOISE))
      expect(gold).toBeLessThanOrEqual(N + BRIGAND_GOLD_NOISE)
      goldSum += gold
    }
    expect(Math.abs(goldSum / trials - N)).toBeLessThan(0.4)
  })

  it('food ∈ [0..MAX], mean ≈ MAX/2 (1000 seeds)', () => {
    const trials = 1000
    let foodSum = 0
    for (let seed = 1; seed <= trials; seed++) {
      const base = bigArmyResources()
      const out = brigandCombatVariant.victoryReward(base, seed, makeEncounter(10))
      const food = out.resources.food - base.food
      expect(food).toBeGreaterThanOrEqual(0)
      expect(food).toBeLessThanOrEqual(BRIGAND_FOOD_MAX)
      foodSum += food
    }
    expect(Math.abs(foodSum / trials - BRIGAND_FOOD_MAX / 2)).toBeLessThan(0.25)
  })
})

describe('brigandCombatVariant.payment', () => {
  const ok = (enc: CombatEncounter, gold: number) =>
    brigandCombatVariant.payment.isEligible(enc, makeResources({ gold }))

  it.each([
    { name: 'ok',          enc: makeEncounter(10, 3),                              gold: 9,   expected: 'ok' },
    { name: 'tooMany',     enc: makeEncounter(20, BRIGAND_RECRUIT_MAX_REMAINING + 1), gold: 100, expected: 'tooMany' },
    { name: 'notWounded',  enc: makeEncounter(4, 4),                               gold: 100, expected: 'notWounded' },
    { name: 'noFunds',     enc: makeEncounter(10, 4),                              gold: 15,  expected: 'noFunds' },
  ])('isEligible → $expected when $name', ({ enc, gold, expected }) => {
    expect(ok(enc, gold)).toBe(expected)
  })

  it('onSuccess adds the surviving band to armySize; computeCost = N²', () => {
    const enc = makeEncounter(10, 3)
    expect(brigandCombatVariant.payment.computeCost(enc)).toBe(9)
    const after = brigandCombatVariant.payment.onSuccess(makeResources({ armySize: 5, gold: 100 }), enc)
    expect(after.armySize).toBe(8)
  })
})
