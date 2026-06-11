import { describe, expect, it } from 'vitest'
import { RNG } from '../../src/core/rng'
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

  it('places each must-cover offer on a random eligible poi', () => {
    let call = 0
    const picks = [2, 0, 1]
    const rng = {
      intExclusive: (n: number) => {
        expect(n).toBeGreaterThan(0)
        return picks[call++ % picks.length]! % n
      },
      intInRange: () => 1,
    }
    const sets = buildOfferSets({
      poiCount: 3,
      minOffers: 1,
      maxOffers: 3,
      pool: ['food', 'hire', 'search'] as const,
      mustCover: ['food', 'hire', 'search'] as const,
      categoryOf,
      rng,
    })
    expect(sets[0]).toContain('hire')
    expect(sets[1]).toContain('search')
    expect(sets[2]).toContain('food')
  })

  it('does not pin the first must-cover offers on poi 0 for town-shaped pools', () => {
    type TownOffer = 'buyFood' | 'buyTroops' | 'hireScout' | 'hireHealer' | 'buyRumors'
    const townCategory = (o: TownOffer): OfferCategory =>
      o === 'hireScout' || o === 'hireHealer' ? 'companion_hire' : 'economy'
    const poi0Sets = new Set<string>()
    for (let seed = 1; seed <= 24; seed++) {
      const sets = buildOfferSets({
        poiCount: 3,
        minOffers: 1,
        maxOffers: 3,
        pool: ['buyFood', 'buyTroops', 'hireScout', 'hireHealer', 'buyRumors'] as const,
        categoryOf: townCategory,
        rng: RNG.createStreamRandomFromSeed(seed, 'test.town.offers'),
      })
      poi0Sets.add([...sets[0]!].sort().join(','))
    }
    expect(poi0Sets.size).toBeGreaterThan(1)
  })

  it('applies requiredOnEveryPoi before must-cover so staples are not evicted by hires', () => {
    const rng = { intExclusive: (_n: number) => 0, intInRange: () => 3 }
    const sets = buildOfferSets({
      poiCount: 2,
      minOffers: 1,
      maxOffers: 2,
      pool: ['food', 'hireA', 'hireB'] as const,
      mustCover: ['hireA', 'hireB'] as const,
      requiredOnEveryPoi: ['food'],
      categoryOf: (o) => (o === 'food' ? 'economy' : 'companion_hire'),
      rng,
    })
    for (const row of sets) {
      expect(row).toContain('food')
    }
    expect(sets.flat().filter((o) => o === 'hireA').length).toBe(1)
    expect(sets.flat().filter((o) => o === 'hireB').length).toBe(1)
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
