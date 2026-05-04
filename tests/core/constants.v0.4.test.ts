import { describe, expect, it } from 'vitest'
import {
  FISHING_LAKE_COOLDOWN_MOVES,
  FISHING_LAKE_COUNT,
  RAINBOW_END_GOLD_PAYOUT,
  RAINBOW_END_COUNT,
  RAINBOW_END_MIN_DISTANCE,
  TOWN_PRICE_FOOD_MIN,
} from '../../src/core/constants'

describe('v0.4 constants', () => {
  it('raises town food min to 5', () => {
    expect(TOWN_PRICE_FOOD_MIN).toBe(5)
  })
  it('defines placed PoI tuning', () => {
    expect(FISHING_LAKE_COUNT).toBe(6)
    expect(FISHING_LAKE_COOLDOWN_MOVES).toBe(3)
    expect(RAINBOW_END_COUNT).toBe(2)
    expect(RAINBOW_END_MIN_DISTANCE).toBe(7)
    expect(RAINBOW_END_GOLD_PAYOUT).toBe(30)
  })
})
