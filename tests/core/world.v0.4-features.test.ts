import { describe, expect, it } from 'vitest'
import {
  FARM_BEAST_GOLD_MAX,
  FARM_BEAST_GOLD_MIN,
  FISHING_LAKE_COUNT,
  RAINBOW_END_COUNT,
  RAINBOW_END_MIN_DISTANCE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../src/core/constants'
import { manhattan, torusDelta } from '../../src/core/math'
import { generateWorld } from '../../src/core/world'
import type { Cell, FarmCell } from '../../src/core/types'

function countKinds(cells: Cell[][], kind: string): number {
  let n = 0
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]!
    for (let x = 0; x < row.length; x++) {
      if (row[x]!.kind === kind) n++
    }
  }
  return n
}

function torusManhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = torusDelta(a.x, b.x, WORLD_WIDTH)
  const dy = torusDelta(a.y, b.y, WORLD_HEIGHT)
  return manhattan(dx, dy)
}

describe('world v0.4 features', () => {
  it('places exactly 6 fishing lakes and 2 rainbow ends', () => {
    for (const seed of [1, 42, 99, 12345]) {
      const { world } = generateWorld(seed)
      expect(countKinds(world.cells, 'fishingLake')).toBe(FISHING_LAKE_COUNT)
      expect(countKinds(world.cells, 'rainbowEnd')).toBe(RAINBOW_END_COUNT)
    }
  })

  it('places rainbow ends at least RAINBOW_END_MIN_DISTANCE apart (torus Manhattan)', () => {
    const maxPossible = Math.floor(WORLD_WIDTH / 2) + Math.floor(WORLD_HEIGHT / 2)
    const minD = Math.max(0, Math.min(RAINBOW_END_MIN_DISTANCE | 0, maxPossible))

    for (let seed = 1; seed <= 200; seed++) {
      const { world } = generateWorld(seed)
      const ends: { x: number; y: number }[] = []
      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          if (world.cells[y]![x]!.kind === 'rainbowEnd') ends.push({ x, y })
        }
      }
      expect(ends.length).toBe(2)
      expect(torusManhattan(ends[0]!, ends[1]!)).toBeGreaterThanOrEqual(minD)
    }
  })

  it('gives each farm beastGoldCost in [FARM_BEAST_GOLD_MIN..FARM_BEAST_GOLD_MAX] (spot-check seeds)', () => {
    const seeds = [1, 2, 3, 7, 13, 42, 100, 500, 999, 12345, 99999]
    for (const seed of seeds) {
      const { world } = generateWorld(seed)
      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          const c = world.cells[y]![x]!
          if (c.kind !== 'farm') continue
          const f = c as FarmCell
          expect(f.beastGoldCost).toBeGreaterThanOrEqual(FARM_BEAST_GOLD_MIN)
          expect(f.beastGoldCost).toBeLessThanOrEqual(FARM_BEAST_GOLD_MAX)
        }
      }
    }
  })
})
