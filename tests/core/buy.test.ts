import { describe, expect, it } from 'vitest'
import { buy } from '../../src/core/mechanics/encounterHelpers'
import { makeResources } from './_helpers/makeResources'

describe('buy()', () => {
  it('ok-path: gold cost + inventory slot gain produces -gold delta only', () => {
    const r = buy(makeResources({ food: 10, gold: 5, armySize: 5 }), { gold: 5, gain: { inventory: ['bronzeKey'] } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.gold).toBe(0)
    expect(r.resources.inventory).toContain('bronzeKey')
    expect(r.deltas).toEqual([{ target: 'gold', delta: -5 }])
  })

  it('ok-path: food cost + inventory slot gain produces -food delta only', () => {
    const r = buy(makeResources({ food: 7, gold: 10, armySize: 5 }), { food: 7, gain: { inventory: ['bronzeKey'] } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(0)
    expect(r.resources.inventory).toContain('bronzeKey')
    expect(r.deltas).toEqual([{ target: 'food', delta: -7 }])
  })

  it('ok-path: gold cost + numeric army gain produces both deltas', () => {
    const r = buy(makeResources({ food: 10, gold: 10, armySize: 5 }), { gold: 3, gain: { armySize: 2 } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.armySize).toBe(7)
    expect(r.deltas).toEqual([
      { target: 'gold', delta: -3 },
      { target: 'army', delta: 2 },
    ])
  })

  it('ok-path: gold cost + food gain emits net food delta (gain - cost)', () => {
    const r = buy(makeResources({ food: 10, gold: 10, armySize: 5 }), { gold: 4, gain: { food: 6 } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(16)
    expect(r.deltas).toEqual([
      { target: 'gold', delta: -4 },
      { target: 'food', delta: 6 },
    ])
  })

  it('noFunds: insufficient gold returns noFunds outcome and no resource change', () => {
    const r = buy(makeResources({ food: 10, gold: 2, armySize: 5 }), { gold: 5, gain: { inventory: ['bronzeKey'] } })
    expect(r.outcome).toBe('noFunds')
  })

  it('noFunds: insufficient food returns noFunds outcome', () => {
    const r = buy(makeResources({ food: 2, gold: 10, armySize: 5 }), { food: 7, gain: { inventory: ['bronzeKey'] } })
    expect(r.outcome).toBe('noFunds')
  })

  it('zero-cost zero-gain: no deltas emitted', () => {
    const r = buy(makeResources({ food: 10, gold: 10, armySize: 5 }), { gain: {} })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.deltas).toEqual([])
  })

  it('does not overwrite unrelated party slots', () => {
    const r = buy(makeResources({ food: 10, gold: 10, armySize: 5, party: ['scout', 'mule'] }), {
      gold: 3,
      gain: { inventory: ['bronzeKey'] },
    })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.party).toContain('scout')
    expect(r.resources.party).toContain('mule')
    expect(r.resources.inventory).toContain('bronzeKey')
  })
})
