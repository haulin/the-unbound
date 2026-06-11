import { describe, expect, it } from 'vitest'
import { applyFoodCapOnGainWithEvents, muleCapSavedEvents } from '../../src/core/foodCarry'

describe('muleCapSavedEvents', () => {
  it('highlights mule when carry bonus allows extra food from at or under base cap', () => {
    const prev = { food: 20, gold: 0, armySize: 10, inventory: [], party: ['mule'] }
    const next = { ...prev, food: 35 }
    const events = muleCapSavedEvents(prev, next)
    expect(events).toEqual([{ kind: 'iconHighlighted', target: { band: 'party', id: 'mule' } }])
  })

  it('does not highlight without mule in party', () => {
    const prev = { food: 20, gold: 0, armySize: 10, inventory: [], party: [] }
    const next = { ...prev, food: 35 }
    expect(muleCapSavedEvents(prev, next)).toEqual([])
  })

  it('does not highlight when food was already above base cap before the gain', () => {
    const prev = { food: 22, gold: 0, armySize: 10, inventory: [], party: ['mule'] }
    const next = { ...prev, food: 25 }
    expect(muleCapSavedEvents(prev, next)).toEqual([])
  })

  it('does not highlight when gain stays under base cap with or without mule', () => {
    const prev = { food: 8, gold: 0, armySize: 10, inventory: [], party: ['mule'] }
    const next = { ...prev, food: 15 }
    expect(muleCapSavedEvents(prev, next)).toEqual([])
  })

  it('applyFoodCapOnGainWithEvents clamps without highlight when already over base cap', () => {
    const prev = { food: 65, gold: 0, armySize: 10, inventory: [], party: ['mule'] }
    const next = { ...prev, food: 80 }
    const out = applyFoodCapOnGainWithEvents(prev, next)
    expect(out.resources.food).toBe(70)
    expect(out.events).toEqual([])
  })

  it('applyFoodCapOnGainWithEvents clamps and emits when crossing base cap thanks to mule', () => {
    const prev = { food: 18, gold: 0, armySize: 10, inventory: [], party: ['mule'] }
    const next = { ...prev, food: 30 }
    const out = applyFoodCapOnGainWithEvents(prev, next)
    expect(out.resources.food).toBe(30)
    expect(out.events).toEqual([{ kind: 'iconHighlighted', target: { band: 'party', id: 'mule' } }])
  })
})
