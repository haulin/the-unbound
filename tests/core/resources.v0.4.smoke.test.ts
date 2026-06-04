import { describe, expect, it } from 'vitest'
import { processAction } from '../../src/core/processAction'
import { ACTION_NEW_RUN } from '../../src/core/constants'

describe('resources v0.4 smoke', () => {
  it('ACTION_NEW_RUN resources start with empty party (no mule)', () => {
    expect(processAction(null, { type: ACTION_NEW_RUN, seed: 1 })!.resources.party).not.toContain('beast')
  })
})
