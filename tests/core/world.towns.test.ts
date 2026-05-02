import { describe, expect, it } from 'vitest'
import { TOWN_COUNT } from '../../src/core/constants'
import { generateWorld } from '../../src/core/world'
import type { Cell, TownCell, World } from '../../src/core/types'

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
  it('places towns deterministically and guarantees hireScout exists', () => {
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
  })
})

