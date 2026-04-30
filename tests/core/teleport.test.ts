import { describe, expect, it } from 'vitest'
import { TELEPORT_MIN_DISTANCE } from '../../src/core/constants'
import { manhattan, torusDelta } from '../../src/core/math'
import { pickTeleportDestination } from '../../src/core/teleport'
import type { Cell, World } from '../../src/core/types'

function makeWorld(rngState = 1): World {
  const grass = (): Cell => ({ kind: 'grass' })
  const cells: Cell[][] = []
  for (let y = 0; y < 10; y++) {
    const row: Cell[] = []
    for (let x = 0; x < 10; x++) row.push(grass())
    cells.push(row)
  }
  // Sprinkle some non-terrain features that must be avoided.
  cells[0]![0] = { kind: 'gate' }
  cells[5]![5] = { kind: 'locksmith' }
  cells[2]![3] = { kind: 'farm', id: 23, name: 'A Farm', nextReadyStep: 0 }
  cells[7]![1] = { kind: 'signpost' }
  return { seed: 1, width: 10, height: 10, mapGenAlgorithm: 'TEST', cells, rngState }
}

describe('pickTeleportDestination', () => {
  it('picks a non-feature terrain tile at least TELEPORT_MIN_DISTANCE away', () => {
    const w = makeWorld(123)
    for (let r = 0; r < 50; r++) {
      const out = pickTeleportDestination({ world: { ...w, rngState: r + 1 }, origin: { x: 5, y: 5 }, rngState: r + 1 })
      const dest = w.cells[out.destination.y]![out.destination.x]!
      expect(['gate', 'gateOpen', 'locksmith', 'signpost', 'farm', 'camp', 'henge']).not.toContain(dest.kind)
      const dx = torusDelta(5, out.destination.x, 10)
      const dy = torusDelta(5, out.destination.y, 10)
      expect(manhattan(dx, dy)).toBeGreaterThanOrEqual(TELEPORT_MIN_DISTANCE)
    }
  })

  it('clamps to the largest available distance when nothing meets the minimum', () => {
    // 3x3 world: max torus-Manhattan distance is 2 (= 1+1), below TELEPORT_MIN_DISTANCE.
    const grass = (): Cell => ({ kind: 'grass' })
    const tiny: World = {
      seed: 1, width: 3, height: 3, mapGenAlgorithm: 'TEST',
      cells: [
        [grass(), grass(), grass()],
        [grass(), grass(), grass()],
        [grass(), grass(), grass()],
      ],
      rngState: 7,
    }
    const out = pickTeleportDestination({ world: tiny, origin: { x: 1, y: 1 }, rngState: 7 })
    const dx = torusDelta(1, out.destination.x, 3)
    const dy = torusDelta(1, out.destination.y, 3)
    // Largest possible torus-Manhattan distance in a 3x3 is 2.
    expect(manhattan(dx, dy)).toBe(2)
  })

  it('threads rngState forward (consumes RNG to pick)', () => {
    const w = makeWorld(42)
    const a = pickTeleportDestination({ world: w, origin: { x: 5, y: 5 }, rngState: 42 })
    expect(a.rngState).not.toBe(42)
  })
})
