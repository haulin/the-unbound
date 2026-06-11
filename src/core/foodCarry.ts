import type { DomainEvent, Resources } from './types'
import { BEAST_CARRY_CAP_BONUS } from './constants'

export type FoodCarryFields = {
  food: number
  armySize: number
  party: readonly string[]
}

export function foodCarryCap(res: { armySize: number; party: readonly string[] }): number {
  const cap = 2 * Math.max(0, Math.trunc(res.armySize))
  return res.party.includes('mule') ? cap + BEAST_CARRY_CAP_BONUS : cap
}

export function clampFoodToCarryCap(res: FoodCarryFields): number {
  return Math.min(res.food, foodCarryCap(res))
}

export const FOOD_CARRY_FULL_MESSAGE = "You can't carry more food."

// Cap-on-gain rule: gains can't push food above carry cap, but existing
// food sticks through cap drops, and a gain never retroactively removes
// food. If food didn't rise, `next` passes through. If food rose past
// cap, the result floors at `max(prev.food, cap)` — an over-cap prev
// (e.g. after an army shrink) can swallow a gain without losing existing
// food, but it can never gain past its prior level until back under cap.
export function applyFoodCapOnGain(prev: Resources, next: Resources): Resources {
  if (next.food <= prev.food) return next
  const cap = foodCarryCap(next)
  if (next.food <= cap) return next
  return { ...next, food: Math.max(prev.food, cap) }
}

/** Pulse the mule when a food gain crossed the base carry cap thanks to the +50 bonus.
 *
 * Only when food was at or under `2 × army` before the gain — not when already
 * hoarding above base cap from an army shrink. Compare applied delta with vs
 * without mule; pulse when the mule allowed strictly more food on this gain. */
export function muleCapSavedEvents(prev: Resources, capped: Resources): readonly DomainEvent[] {
  if (capped.food <= prev.food) return []
  if (!prev.party.includes('mule')) return []
  const baseCap = 2 * Math.max(0, Math.trunc(prev.armySize))
  if (prev.food > baseCap) return []
  const withoutMule: Resources = { ...capped, party: capped.party.filter((slot) => slot !== 'mule') }
  const cappedWithoutMule = applyFoodCapOnGain(prev, withoutMule)
  const appliedWith = capped.food - prev.food
  const appliedWithout = cappedWithoutMule.food - prev.food
  if (appliedWith > appliedWithout) {
    return [{ kind: 'iconHighlighted', target: { band: 'party', id: 'mule' } }]
  }
  return []
}

export function applyFoodCapOnGainWithEvents(
  prev: Resources,
  next: Resources,
): { resources: Resources; events: readonly DomainEvent[] } {
  const resources = applyFoodCapOnGain(prev, next)
  return { resources, events: muleCapSavedEvents(prev, resources) }
}
