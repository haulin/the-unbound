import { describe, expect, it } from 'vitest'
import { FARM_COUNT } from '../../../src/core/constants'
import { generateWorld } from '../../../src/core/world'
import type { FarmCell } from '../../../src/core/types'

function farmsIn(world: ReturnType<typeof generateWorld>['world']): FarmCell[] {
  const farms: FarmCell[] = []
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const cell = world.cells[y]![x]!
      if (cell.kind === 'farm') farms.push(cell)
    }
  }
  return farms
}

describe('farm offer pool v0.9', () => {
  it('every farm has food and the map covers mule and boar hires', () => {
    const { world } = generateWorld(47)
    const farms = farmsIn(world)
    expect(farms.length).toBe(FARM_COUNT)
    let hasMule = false
    let hasBoar = false
    for (const farm of farms) {
      expect(farm.offers).toContain('FARM_BUY_FOOD')
      if (farm.offers.includes('FARM_BUY_MULE')) hasMule = true
      if (farm.offers.includes('FARM_BUY_BOAR')) hasBoar = true
    }
    expect(hasMule).toBe(true)
    expect(hasBoar).toBe(true)
  })

  it('spreads specialties across farms instead of duplicating the full pool on every farm', () => {
    const { world } = generateWorld(47)
    const farms = farmsIn(world)
    const allThree = farms.filter((f) => f.offers.length === 3)
    expect(allThree.length).toBeLessThan(farms.length)
    const offerSets = farms.map((f) => new Set(f.offers))
    expect(new Set(offerSets.map((s) => [...s].sort().join(','))).size).toBeGreaterThan(1)
  })
})
