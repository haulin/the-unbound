import type { Resources } from './types'
import { BEAST_CARRY_CAP_BONUS } from './constants'

export type FoodCarryFields = {
  food: number
  armySize: number
  hasTameBeast: boolean
}

export function foodCarryCap(res: { armySize: number; hasTameBeast: boolean }): number {
  const cap = 2 * Math.max(0, Math.trunc(res.armySize))
  return res.hasTameBeast ? cap + BEAST_CARRY_CAP_BONUS : cap
}

export function clampFoodToCarryCap(res: FoodCarryFields): number {
  return Math.min(res.food, foodCarryCap(res))
}

export const FOOD_CARRY_FULL_MESSAGE = "You can't carry more food."

export function resourcesWithClampedFoodIfNeeded(res: Resources): Resources {
  const food = clampFoodToCarryCap(res)
  if (food === res.food) return res
  return { ...res, food }
}
