import { describe, expect, it } from 'vitest'
import '../../src/core/mechanics'
import { goblinCombatVariant } from '../../src/core/mechanics/defs/woods'
import {
  GOBLIN_FOOD_FACTOR,
  GOBLIN_FOOD_NOISE,
  GOBLIN_GOLD_MAX,
  GOBLIN_NOT_RECRUITABLE_LINES,
} from '../../src/core/constants'
import type { CombatEncounter, Resources } from '../../src/core/types'
import { makeResources } from './_helpers/makeResources'

function makeEncounter(initialSpawn: number, enemyArmySize = initialSpawn): CombatEncounter {
  return {
    kind: 'combat',
    enemyArmySize,
    initialSpawn,
    armyAtCombatStart: 10,
    sourceCellId: 0,
    restoreMessage: '',
  }
}

function bigArmyResources(overrides: Partial<Resources> = {}): Resources {
  return makeResources({ food: 0, gold: 0, armySize: 100, ...overrides })
}

describe('goblinCombatVariant.victoryReward', () => {
  it('gold ∈ [0..MAX], mean ≈ MAX/2, flat across initialSpawn', () => {
    const trials = 1000
    const meanGoldFor = (N: number) => {
      let sum = 0
      for (let seed = 1; seed <= trials; seed++) {
        const base = bigArmyResources()
        const out = goblinCombatVariant.victoryReward(base, seed, makeEncounter(N))
        const gold = out.resources.gold - base.gold
        expect(gold).toBeGreaterThanOrEqual(0)
        expect(gold).toBeLessThanOrEqual(GOBLIN_GOLD_MAX)
        sum += gold
      }
      return sum / trials
    }
    const m10 = meanGoldFor(10)
    const m30 = meanGoldFor(30)
    expect(Math.abs(m10 - GOBLIN_GOLD_MAX / 2)).toBeLessThan(0.2)
    expect(Math.abs(m30 - m10)).toBeLessThan(0.3) // flat: gold is independent of N
  })

  it('food ∈ [center ± NOISE], mean ≈ FACTOR·N', () => {
    const N = 10
    const center = Math.round(GOBLIN_FOOD_FACTOR * N)
    const trials = 1000
    let foodSum = 0
    for (let seed = 1; seed <= trials; seed++) {
      const base = bigArmyResources()
      const out = goblinCombatVariant.victoryReward(base, seed, makeEncounter(N))
      const food = out.resources.food - base.food
      expect(food).toBeGreaterThanOrEqual(Math.max(0, center - GOBLIN_FOOD_NOISE))
      expect(food).toBeLessThanOrEqual(center + GOBLIN_FOOD_NOISE)
      foodSum += food
    }
    expect(Math.abs(foodSum / trials - GOBLIN_FOOD_FACTOR * N)).toBeLessThan(0.3)
  })
})

describe('goblinCombatVariant.payment', () => {
  it.each([
    makeEncounter(10, 3),
    makeEncounter(10, 10),
    makeEncounter(2, 2),
    makeEncounter(50, 1),
  ])('isEligible always returns "unrecruitable" (initial=$initialSpawn, current=$enemyArmySize)', (enc) => {
    expect(goblinCombatVariant.payment.isEligible(enc, makeResources({ gold: 100 }))).toBe('unrecruitable')
  })

  it('failLines.unrecruitable points at the goblin teaching pool', () => {
    expect(goblinCombatVariant.payment.failLines.unrecruitable).toBe(GOBLIN_NOT_RECRUITABLE_LINES)
  })
})

describe('goblinCombatVariant identity', () => {
  it('softer +6/+3 round math + goblin sprite', () => {
    expect(goblinCombatVariant.playerRollBonus).toBe(6)
    expect(goblinCombatVariant.enemyRollBonus).toBe(3)
    expect(goblinCombatVariant.illustrationSpriteId).toBe(130)
  })
})
