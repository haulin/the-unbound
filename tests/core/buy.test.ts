import { describe, expect, it } from 'vitest'
import { buy } from '../../src/core/mechanics/encounterHelpers'
import type { Resources } from '../../src/core/types'

function res(overrides: Partial<Resources> = {}): Resources {
  return {
    food: 10,
    gold: 10,
    armySize: 5,
    hasBronzeKey: false,
    hasScout: false,
    hasTameBeast: false,
    ...overrides,
  }
}

describe('buy()', () => {
  it('ok-path: gold cost + boolean gain produces -gold delta only', () => {
    const r = buy(res({ gold: 5 }), { gold: 5, gain: { hasBronzeKey: true } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.gold).toBe(0)
    expect(r.resources.hasBronzeKey).toBe(true)
    expect(r.deltas).toEqual([{ target: 'gold', delta: -5 }])
  })

  it('ok-path: food cost + boolean gain produces -food delta only', () => {
    const r = buy(res({ food: 7 }), { food: 7, gain: { hasBronzeKey: true } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(0)
    expect(r.resources.hasBronzeKey).toBe(true)
    expect(r.deltas).toEqual([{ target: 'food', delta: -7 }])
  })

  it('ok-path: gold cost + numeric army gain produces both deltas', () => {
    const r = buy(res(), { gold: 3, gain: { armySize: 2 } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.armySize).toBe(7)
    expect(r.deltas).toEqual([
      { target: 'gold', delta: -3 },
      { target: 'army', delta: 2 },
    ])
  })

  it('ok-path: gold cost + food gain emits net food delta (gain - cost)', () => {
    // Town buyFood case: pay 4 gold, gain 6 food, no food cost. Net food = +6.
    const r = buy(res(), { gold: 4, gain: { food: 6 } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(16)
    expect(r.deltas).toEqual([
      { target: 'gold', delta: -4 },
      { target: 'food', delta: 6 },
    ])
  })

  it('noFunds: insufficient gold returns noFunds outcome and no resource change', () => {
    const r = buy(res({ gold: 2 }), { gold: 5, gain: { hasBronzeKey: true } })
    expect(r.outcome).toBe('noFunds')
  })

  it('noFunds: insufficient food returns noFunds outcome', () => {
    const r = buy(res({ food: 2 }), { food: 7, gain: { hasBronzeKey: true } })
    expect(r.outcome).toBe('noFunds')
  })

  it('zero-cost zero-gain: no deltas emitted', () => {
    const r = buy(res(), { gain: {} })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.deltas).toEqual([])
  })

  it('does not overwrite unrelated boolean fields', () => {
    const r = buy(res({ hasScout: true, hasTameBeast: true }), {
      gold: 3,
      gain: { hasBronzeKey: true },
    })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.hasScout).toBe(true)
    expect(r.resources.hasTameBeast).toBe(true)
    expect(r.resources.hasBronzeKey).toBe(true)
  })
})
