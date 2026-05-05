import { describe, expect, it } from 'vitest'
import { computeCampArmyGain } from '../../src/core/mechanics/defs/camp'

describe('computeCampArmyGain', () => {
  it('is deterministic for the same inputs', () => {
    const a = computeCampArmyGain({ seed: 7, campId: 4, stepCount: 10 })
    const b = computeCampArmyGain({ seed: 7, campId: 4, stepCount: 10 })
    expect(a).toEqual(b)
  })

  it('armyGain is 1 or 2', () => {
    for (let i = 0; i < 50; i++) {
      const g = computeCampArmyGain({ seed: i + 1, campId: 100 + i, stepCount: i })
      expect([1, 2]).toContain(g)
    }
  })
})

