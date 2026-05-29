import { INITIAL_ARMY_SIZE, INITIAL_FOOD, INITIAL_GOLD } from '../../../src/core/constants'
import type { Resources } from '../../../src/core/types'

const DEFAULTS: Resources = {
  food: INITIAL_FOOD,
  gold: INITIAL_GOLD,
  armySize: INITIAL_ARMY_SIZE,
  inventory: [],
  party: [],
}

// Build a `Resources` fixture for tests. Defaults match the new-run baseline
// (mirrors `processAction(null, NEW_RUN)`); arrays are always cloned so two
// callers never share inventory/party mutability.
export function makeResources(overrides: Partial<Resources> = {}): Resources {
  return {
    ...DEFAULTS,
    ...overrides,
    inventory: overrides.inventory ? [...overrides.inventory] : [...DEFAULTS.inventory],
    party: overrides.party ? [...overrides.party] : [...DEFAULTS.party],
  }
}
