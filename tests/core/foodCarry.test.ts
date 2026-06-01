import { describe, expect, it } from 'vitest'
import { applyFoodCapOnGain, clampFoodToCarryCap, foodCarryCap } from '../../src/core/foodCarry'
import { makeResources } from './_helpers/makeResources'

describe('foodCarry', () => {
  it('foodCarryCap is 2 * armySize, +50 when party includes mule', () => {
    expect(foodCarryCap({ armySize: 5, party: [] })).toBe(10)
    expect(foodCarryCap({ armySize: 5, party: ['mule'] })).toBe(60)
    expect(foodCarryCap({ armySize: 0, party: [] })).toBe(0)
    expect(foodCarryCap({ armySize: 0, party: ['mule'] })).toBe(50)
  })

  it('clampFoodToCarryCap: min(food, cap)', () => {
    expect(clampFoodToCarryCap({ food: 15, armySize: 5, party: [] })).toBe(10)
    expect(clampFoodToCarryCap({ food: 5, armySize: 5, party: [] })).toBe(5)
    expect(clampFoodToCarryCap({ food: 99, armySize: 5, party: ['mule'] })).toBe(60)
  })
})

// Two-argument shape: clamp only the *delta* against the *new* cap. The
// pre-v0.6 helper retroactively trimmed food whenever cap dropped (combat
// losses, starvation), which felt punitive. The new rule: gains can't
// exceed cap, but existing food sticks through cap drops.
describe('applyFoodCapOnGain', () => {
  it('holds existing food when army shrinks (cap drops, no retroactive clamp)', () => {
    const prev = makeResources({ armySize: 10, food: 30 })
    const next = { ...prev, armySize: 5 }
    expect(applyFoodCapOnGain(prev, next).food).toBe(30)
  })

  it('clamps gains that would exceed the current cap', () => {
    const prev = makeResources({ armySize: 10, food: 15 })
    const next = { ...prev, food: 40 }
    expect(applyFoodCapOnGain(prev, next).food).toBe(20)
  })

  it('ignores army growth without a food gain (cap rises, food stays)', () => {
    const prev = makeResources({ armySize: 5, food: 15 })
    const next = { ...prev, armySize: 10 }
    expect(applyFoodCapOnGain(prev, next).food).toBe(15)
  })

  it('clamps gains beyond the new cap when both rise simultaneously', () => {
    const prev = makeResources({ armySize: 5, food: 15 })
    const next = { ...prev, armySize: 10, food: 35 }
    expect(applyFoodCapOnGain(prev, next).food).toBe(20)
  })

  it('food cap respects over-cap prev — gain suppressed but no loss', () => {
    // GIVEN prev = { armySize: 6, food: 18 } (over-cap from prior army shrink)
    // WHEN food gains to 20 (cap=12)
    // THEN food stays at 18 (gain swallowed; no retroactive loss)
    const prev = makeResources({ armySize: 6, food: 18 })
    const next = makeResources({ armySize: 6, food: 20 })
    expect(applyFoodCapOnGain(prev, next).food).toBe(18)
  })

  it('food cap clamps gains to new cap when prev was within old cap', () => {
    // GIVEN prev = { armySize: 10, food: 18 } (within cap 20)
    // WHEN army shrinks to 6 (cap=12) AND food gains to 22
    // THEN food clamps to 18 (max of prev.food and new cap)
    // Rationale: gain over new cap is suppressed; existing food sticks through shrink.
    const prev = makeResources({ armySize: 10, food: 18 })
    const next = makeResources({ armySize: 6, food: 22 })
    expect(applyFoodCapOnGain(prev, next).food).toBe(18)
  })
})
