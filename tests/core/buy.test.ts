import { describe, expect, it } from 'vitest'
import { buy } from '../../src/core/mechanics/encounterHelpers'
import { makeResources } from './_helpers/makeResources'

// `buy()` is a pure transactional primitive. Callers feed `result.resources`
// to `commit()`, which auto-derives `resourceChanged` events from the prev →
// next diff — so the tests assert the post-buy resources directly rather than
// any synthetic delta list.
describe('buy()', () => {
  it('ok-path: gold cost + inventory slot gain returns post-cost gold and the new slot', () => {
    const r = buy(makeResources({ food: 10, gold: 5, armySize: 5 }), { gold: 5, gain: { inventory: ['bronzeKey'] } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.gold).toBe(0)
    expect(r.resources.food).toBe(10)
    expect(r.resources.inventory).toContain('bronzeKey')
  })

  it('ok-path: food cost + inventory slot gain returns post-cost food and the new slot', () => {
    const r = buy(makeResources({ food: 7, gold: 10, armySize: 5 }), { food: 7, gain: { inventory: ['bronzeKey'] } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(0)
    expect(r.resources.gold).toBe(10)
    expect(r.resources.inventory).toContain('bronzeKey')
  })

  it('ok-path: gold cost + numeric army gain applies both', () => {
    const r = buy(makeResources({ food: 10, gold: 10, armySize: 5 }), { gold: 3, gain: { armySize: 2 } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.gold).toBe(7)
    expect(r.resources.armySize).toBe(7)
  })

  it('ok-path: gold cost + food gain applies the net food change', () => {
    const r = buy(makeResources({ food: 10, gold: 10, armySize: 5 }), { gold: 4, gain: { food: 6 } })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(16)
    expect(r.resources.gold).toBe(6)
  })

  it('shortfall: insufficient gold returns gold shortfall', () => {
    const r = buy(makeResources({ food: 10, gold: 2, armySize: 5 }), { gold: 5, gain: { inventory: ['bronzeKey'] } })
    expect(r).toEqual({ outcome: 'shortfall', resource: 'gold' })
  })

  it('shortfall: insufficient food returns food shortfall', () => {
    const r = buy(makeResources({ food: 2, gold: 10, armySize: 5 }), { food: 7, gain: { inventory: ['bronzeKey'] } })
    expect(r).toEqual({ outcome: 'shortfall', resource: 'food' })
  })

  it('shortfall: gold checked before food when both costs apply', () => {
    const r = buy(makeResources({ food: 0, gold: 0, armySize: 5 }), { gold: 5, food: 5, gain: { inventory: ['bronzeKey'] } })
    expect(r).toEqual({ outcome: 'shortfall', resource: 'gold' })
  })

  it('zero-cost zero-gain: resources unchanged', () => {
    const before = makeResources({ food: 10, gold: 10, armySize: 5 })
    const r = buy(before, { gain: {} })
    expect(r.outcome).toBe('ok')
    if (r.outcome !== 'ok') return
    expect(r.resources.food).toBe(before.food)
    expect(r.resources.gold).toBe(before.gold)
    expect(r.resources.armySize).toBe(before.armySize)
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
