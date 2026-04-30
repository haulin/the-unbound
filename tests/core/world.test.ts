import { describe, expect, it } from 'vitest'
import {
  CAMP_COUNT,
  FARM_COUNT,
  GATE_LOCKSMITH_MIN_DISTANCE,
  HENGE_COUNT,
  SIGNPOST_COUNT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../src/core/constants'
import { generateWorld } from '../../src/core/world'
import { manhattan, torusDelta } from '../../src/core/math'
import type { Cell } from '../../src/core/types'

function countKinds(cells: { kind: string }[][], kind: string): number {
  let n = 0
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]!
    for (let x = 0; x < row.length; x++) {
      if (row[x]!.kind === kind) n++
    }
  }
  return n
}

function allCells(world: { cells: Cell[][] }): Array<{ x: number; y: number; cell: Cell }> {
  const out: Array<{ x: number; y: number; cell: Cell }> = []
  for (let y = 0; y < world.cells.length; y++) {
    const row = world.cells[y]!
    for (let x = 0; x < row.length; x++) out.push({ x, y, cell: row[x]! })
  }
  return out
}

describe('world', () => {
  it('has correct dimensions and specials', () => {
    const g = generateWorld(1)
    expect(g.world.width).toBe(WORLD_WIDTH)
    expect(g.world.height).toBe(WORLD_HEIGHT)
    expect(g.world.cells.length).toBe(WORLD_HEIGHT)
    expect(g.world.cells[0]?.length).toBe(WORLD_WIDTH)

    expect(countKinds(g.world.cells, 'gate')).toBe(1)
    expect(countKinds(g.world.cells, 'locksmith')).toBe(1)
    expect(countKinds(g.world.cells, 'farm')).toBe(FARM_COUNT)
    expect(countKinds(g.world.cells, 'camp')).toBe(CAMP_COUNT)
    expect(countKinds(g.world.cells, 'henge')).toBe(HENGE_COUNT)
    expect(countKinds(g.world.cells, 'signpost')).toBe(SIGNPOST_COUNT)

    const cells = allCells(g.world)
    const farms = cells.filter((c) => c.cell.kind === 'farm')
    const camps = cells.filter((c) => c.cell.kind === 'camp')
    const henges = cells.filter((c) => c.cell.kind === 'henge')

    expect(new Set(farms.map((f) => (f.cell.kind === 'farm' ? f.cell.name : ''))).size).toBe(FARM_COUNT)
    expect(new Set(farms.map((f) => `${f.x},${f.y}`)).size).toBe(FARM_COUNT)
    for (const f of farms) {
      expect(f.cell.kind).toBe('farm')
      expect(f.cell.id).toBe(f.y * WORLD_WIDTH + f.x)
    }

    expect(new Set(camps.map((c) => (c.cell.kind === 'camp' ? c.cell.name : ''))).size).toBe(CAMP_COUNT)
    expect(new Set(camps.map((c) => `${c.x},${c.y}`)).size).toBe(CAMP_COUNT)
    for (const c of camps) {
      expect(c.cell.kind).toBe('camp')
      expect(c.cell.id).toBe(c.y * WORLD_WIDTH + c.x)
    }

    for (const h of henges) {
      expect(h.cell.kind).toBe('henge')
      expect(h.cell.id).toBe(h.y * WORLD_WIDTH + h.x)
    }
  })

  it('is deterministic by seed', () => {
    const a = generateWorld(1)
    const b = generateWorld(1)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('places gate and locksmith at least min distance apart', () => {
    const maxSeeds = 200
    for (let seed = 1; seed <= maxSeeds; seed++) {
      const g = generateWorld(seed).world
      let gate: { x: number; y: number } | null = null
      let locksmith: { x: number; y: number } | null = null
      for (let y = 0; y < g.height; y++) {
        for (let x = 0; x < g.width; x++) {
          const k = g.cells[y]![x]!.kind
          if (k === 'gate') gate = { x, y }
          else if (k === 'locksmith') locksmith = { x, y }
        }
      }
      expect(gate).not.toBe(null)
      expect(locksmith).not.toBe(null)
      const dx = torusDelta(gate!.x, locksmith!.x, g.width)
      const dy = torusDelta(gate!.y, locksmith!.y, g.height)
      const d = manhattan(dx, dy)
      expect(d).toBeGreaterThanOrEqual(GATE_LOCKSMITH_MIN_DISTANCE)
    }
  })
})
