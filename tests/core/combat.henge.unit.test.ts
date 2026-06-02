import { describe, expect, it } from 'vitest'
import '../../src/core/mechanics'
import {
  HENGE_FOOD_FACTOR,
  HENGE_FOOD_NOISE,
  HENGE_GOLD_BONUS,
  HENGE_GOLD_NOISE,
} from '../../src/core/constants'
import { hengeCombatVariant } from '../../src/core/mechanics/defs/henge'
import type { CombatEncounter, Resources } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

// Henge shares `brigandRecruitEligibility` (see `mountain.ts`); the predicate
// is exercised by combat.brigand.unit.test.ts. This file pins henge-specific
// distribution + the killed-ratio loot scale.

function makeEncounter(initialSpawn: number, enemyArmySize = initialSpawn): CombatEncounter {
  return { kind: 'combat', enemyArmySize, initialSpawn, sourceCellId: 0, restoreMessage: '' }
}

function bigArmyResources(overrides: Partial<Resources> = {}): Resources {
  return makeResources({ food: 0, gold: 0, armySize: 100, ...overrides })
}

describe('hengeCombatVariant.victoryReward', () => {
  it('gold ∈ [N - NOISE + BONUS .. N + NOISE + BONUS], mean ≈ N + BONUS', () => {
    const N = 20
    const trials = 1000
    let goldSum = 0
    for (let seed = 1; seed <= trials; seed++) {
      const base = bigArmyResources()
      const out = hengeCombatVariant.victoryReward(base, seed, makeEncounter(N))
      const gold = out.resources.gold - base.gold
      expect(gold).toBeGreaterThanOrEqual(Math.max(0, N - HENGE_GOLD_NOISE) + HENGE_GOLD_BONUS)
      expect(gold).toBeLessThanOrEqual(N + HENGE_GOLD_NOISE + HENGE_GOLD_BONUS)
      goldSum += gold
    }
    expect(Math.abs(goldSum / trials - (N + HENGE_GOLD_BONUS))).toBeLessThan(0.4)
  })

  it('food ∈ [center ± NOISE], mean ≈ round(FACTOR·N)', () => {
    const N = 20
    const center = Math.round(HENGE_FOOD_FACTOR * N)
    const trials = 1000
    let foodSum = 0
    for (let seed = 1; seed <= trials; seed++) {
      const base = bigArmyResources()
      const out = hengeCombatVariant.victoryReward(base, seed, makeEncounter(N))
      const food = out.resources.food - base.food
      expect(food).toBeGreaterThanOrEqual(Math.max(0, center - HENGE_FOOD_NOISE))
      expect(food).toBeLessThanOrEqual(center + HENGE_FOOD_NOISE)
      foodSum += food
    }
    expect(Math.abs(foodSum / trials - center)).toBeLessThan(0.25)
  })
})

describe('hengeCombatVariant.recruitLootScale', () => {
  it.each([
    { initial: 20, current: 1, expected: 19 / 20 },
    { initial: 20, current: 4, expected: 16 / 20 },
    { initial: 10, current: 5, expected: 5 / 10 },
    { initial: 0,  current: 0, expected: 0 }, // guards division by zero
  ])('killed-ratio = ($initial - $current) / $initial', ({ initial, current, expected }) => {
    const enc = makeEncounter(initial, current)
    expect(hengeCombatVariant.recruitLootScale!(enc)).toBeCloseTo(expected, 6)
  })
})
