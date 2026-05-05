import { describe, expect, it } from 'vitest'
import {
  ACTION_FARM_BUY_BEAST,
  ACTION_FARM_BUY_FOOD,
  ACTION_FARM_LEAVE,
  ACTION_LOCKSMITH_LEAVE,
  ACTION_LOCKSMITH_PAY_FOOD,
  ACTION_LOCKSMITH_PAY_GOLD,
} from '../../src/core/constants'
import type { Action, Cell, Encounter } from '../../src/core/types'

describe('v0.4 types smoke', () => {
  it('Cell kinds fishingLake and rainbowEnd', () => {
    const lake: Cell = { kind: 'fishingLake', id: 1, nextReadyStep: 0 }
    expect(lake.kind).toBe('fishingLake')
    const rainbow: Cell = { kind: 'rainbowEnd', id: 2, hasPaidOut: false }
    expect(rainbow.kind).toBe('rainbowEnd')
  })

  it('FarmEncounter shape', () => {
    const e: Encounter = { kind: 'farm', sourceCellId: 1, restoreMessage: '' }
    expect(e.kind).toBe('farm')
  })

  it('LocksmithEncounter shape', () => {
    const e: Encounter = { kind: 'locksmith', sourceCellId: 1, restoreMessage: '' }
    expect(e.kind).toBe('locksmith')
  })

  it('farm and locksmith Action variants use constants', () => {
    const buyFood: Action = { type: ACTION_FARM_BUY_FOOD }
    const buyBeast: Action = { type: ACTION_FARM_BUY_BEAST }
    const farmLeave: Action = { type: ACTION_FARM_LEAVE }
    const payGold: Action = { type: ACTION_LOCKSMITH_PAY_GOLD }
    const payFood: Action = { type: ACTION_LOCKSMITH_PAY_FOOD }
    const lockLeave: Action = { type: ACTION_LOCKSMITH_LEAVE }
    expect(buyFood.type).toBe(ACTION_FARM_BUY_FOOD)
    expect(buyBeast.type).toBe(ACTION_FARM_BUY_BEAST)
    expect(farmLeave.type).toBe(ACTION_FARM_LEAVE)
    expect(payGold.type).toBe(ACTION_LOCKSMITH_PAY_GOLD)
    expect(payFood.type).toBe(ACTION_LOCKSMITH_PAY_FOOD)
    expect(lockLeave.type).toBe(ACTION_LOCKSMITH_LEAVE)
  })
})
