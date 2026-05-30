import { describe, expect, it } from 'vitest'
import {
  ACTION_MOVE,
  ACTION_RESTART,
  ACTION_SHOW_GOAL,
  ACTION_TOGGLE_MAP,
  ACTION_TOGGLE_MINIMAP,
} from '../../../src/core/constants'
import { ACTION_TOWN_BUY_FOOD, ACTION_TOWN_HIRE_SCOUT } from '../../../src/core/mechanics/defs/town'
import { labelForAction } from '../../../src/platform/terminal/labels'

describe('labelForAction', () => {
  it('renders move actions with a compass suffix derived from dx/dy', () => {
    expect(labelForAction({ type: ACTION_MOVE, dx: 0, dy: -1 })).toBe('move_n')
    expect(labelForAction({ type: ACTION_MOVE, dx: 0, dy: 1 })).toBe('move_s')
    expect(labelForAction({ type: ACTION_MOVE, dx: -1, dy: 0 })).toBe('move_w')
    expect(labelForAction({ type: ACTION_MOVE, dx: 1, dy: 0 })).toBe('move_e')
  })

  it('lowercases SCREAMING_SNAKE_CASE action ids without inserting underscores', () => {
    expect(labelForAction({ type: ACTION_RESTART })).toBe('restart')
    expect(labelForAction({ type: ACTION_SHOW_GOAL })).toBe('show_goal')
    expect(labelForAction({ type: ACTION_TOGGLE_MAP })).toBe('toggle_map')
    expect(labelForAction({ type: ACTION_TOGGLE_MINIMAP })).toBe('toggle_minimap')
  })

  it('snake_cases camelCase town offer ids', () => {
    expect(labelForAction({ type: ACTION_TOWN_BUY_FOOD })).toBe('buy_food')
    expect(labelForAction({ type: ACTION_TOWN_HIRE_SCOUT })).toBe('hire_scout')
  })
})
