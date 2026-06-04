import { describe, expect, it } from 'vitest'
import { CAMP_COUNT, FARM_COUNT, TOWN_COUNT } from '../../src/core/constants'
import { generateWorld } from '../../src/core/world'
import type { CampCell, Cell, FarmCell, TownCell, World } from '../../src/core/types'

function flatten(world: World): Cell[] {
  const out: Cell[] = []
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) out.push(world.cells[y]![x]!)
  }
  return out
}

function isTown(c: Cell): c is TownCell {
  return c.kind === 'town'
}

describe('world towns', () => {
  it('places towns deterministically with full offer coverage', () => {
    const w1 = generateWorld(123).world
    const w2 = generateWorld(123).world

    const towns1 = flatten(w1).filter(isTown)
    const towns2 = flatten(w2).filter(isTown)

    expect(towns1.length).toBe(TOWN_COUNT)
    expect(towns2.length).toBe(TOWN_COUNT)

    expect(towns1.map((t) => ({ id: t.id, offers: t.offers, prices: t.prices }))).toEqual(
      towns2.map((t) => ({ id: t.id, offers: t.offers, prices: t.prices })),
    )

    expect(towns1.some((t) => t.offers.includes('hireScout'))).toBe(true)

    const union = new Set<TownCell['offers'][number]>()
    for (let i = 0; i < towns1.length; i++) {
      for (let j = 0; j < towns1[i]!.offers.length; j++) {
        union.add(towns1[i]!.offers[j]!)
      }
    }
    expect(union.has('buyFood')).toBe(true)
    expect(union.has('buyTroops')).toBe(true)
    expect(union.has('hireScout')).toBe(true)
    expect(union.has('hireHealer')).toBe(true)
    expect(union.has('buyRumors')).toBe(true)
  })
})

function isCamp(c: Cell): c is CampCell {
  return c.kind === 'camp'
}

function isFarm(c: Cell): c is FarmCell {
  return c.kind === 'farm'
}

const townEconomy = new Set<string>(['buyFood', 'buyTroops', 'buyRumors'])
const campEconomy = new Set<string>(['CAMP_SEARCH'])
const farmEconomy = new Set<string>(['FARM_BUY_FOOD'])

function poiHasEconomyOffer(offers: readonly string[], economyIds: Set<string>): boolean {
  return offers.some((o) => economyIds.has(o))
}

describe('world PoI offer invariants', () => {
  it('every town, camp, and farm has at least one non-hire offer', () => {
    const world = generateWorld(4242).world
    const cells = flatten(world)

    const towns = cells.filter(isTown)
    const camps = cells.filter(isCamp)
    const farms = cells.filter(isFarm)

    expect(towns.length).toBe(TOWN_COUNT)
    expect(camps.length).toBe(CAMP_COUNT)
    expect(farms.length).toBe(FARM_COUNT)

    for (const t of towns) {
      expect(t.offers.length).toBeGreaterThanOrEqual(1)
      expect(t.offers.length).toBeLessThanOrEqual(3)
      expect(poiHasEconomyOffer(t.offers, townEconomy)).toBe(true)
    }
    for (const c of camps) {
      expect(c.offers.length).toBeGreaterThanOrEqual(1)
      expect(c.offers.length).toBeLessThanOrEqual(3)
      expect(poiHasEconomyOffer(c.offers, campEconomy)).toBe(true)
    }
    for (const f of farms) {
      expect(f.offers.length).toBeGreaterThanOrEqual(1)
      expect(f.offers.length).toBeLessThanOrEqual(3)
      expect(poiHasEconomyOffer(f.offers, farmEconomy)).toBe(true)
      expect(f.offers).toContain('FARM_BUY_FOOD')
    }
  })
})
