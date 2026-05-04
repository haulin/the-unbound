import { describe, expect, it } from 'vitest'
import { clampFoodToCarryCap, foodCarryCap } from '../../src/core/foodCarry'

describe('foodCarry', () => {
  it('foodCarryCap is 2 * armySize, +50 when hasTameBeast', () => {
    expect(foodCarryCap({ armySize: 5, hasTameBeast: false })).toBe(10)
    expect(foodCarryCap({ armySize: 5, hasTameBeast: true })).toBe(60)
    expect(foodCarryCap({ armySize: 0, hasTameBeast: false })).toBe(0)
    expect(foodCarryCap({ armySize: 0, hasTameBeast: true })).toBe(50)
  })

  it('clampFoodToCarryCap: min(food, cap)', () => {
    expect(clampFoodToCarryCap({ food: 15, armySize: 5, hasTameBeast: false })).toBe(10)
    expect(clampFoodToCarryCap({ food: 5, armySize: 5, hasTameBeast: false })).toBe(5)
    expect(clampFoodToCarryCap({ food: 99, armySize: 5, hasTameBeast: true })).toBe(60)
  })
})
