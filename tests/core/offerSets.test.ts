import { describe, expect, it } from 'vitest'
import { buildOfferSets, type OfferCategory } from '../../src/core/worldgen'

type TestOffer = 'food' | 'hire' | 'search'

const categoryOf = (o: TestOffer): OfferCategory =>
  o === 'hire' ? 'companion_hire' : 'economy'

describe('buildOfferSets', () => {
  it('covers must-cover offers and gives each poi at least one non-hire', () => {
    const rng = { intExclusive: (_n: number) => 0, intInRange: () => 2 }
    const sets = buildOfferSets({
      poiCount: 3,
      minOffers: 1,
      maxOffers: 3,
      pool: ['food', 'hire', 'search'] as const,
      mustCover: ['food', 'hire', 'search'] as const,
      categoryOf,
      requiredOnEveryPoi: ['food'],
      rng,
    })
    expect(sets).toHaveLength(3)
    const all = new Set(sets.flat())
    expect(all.has('food')).toBe(true)
    expect(all.has('hire')).toBe(true)
    expect(all.has('search')).toBe(true)
    for (const row of sets) {
      expect(row.length).toBeGreaterThanOrEqual(1)
      expect(row.length).toBeLessThanOrEqual(3)
      expect(row.some((o) => categoryOf(o) !== 'companion_hire')).toBe(true)
      expect(row).toContain('food')
    }
  })

  it('never exceeds maxOffers even when only hires were backfilled', () => {
    const rng = {
      intExclusive: (n: number) => (n > 1 ? 1 : 0),
      intInRange: () => 3,
    }
    const sets = buildOfferSets({
      poiCount: 2,
      minOffers: 1,
      maxOffers: 3,
      pool: ['food', 'hire'] as const,
      mustCover: ['food', 'hire'] as const,
      categoryOf,
      rng,
    })
    for (const row of sets) {
      expect(row.length).toBeLessThanOrEqual(3)
      expect(row.some((o) => categoryOf(o) !== 'companion_hire')).toBe(true)
    }
  })
})
