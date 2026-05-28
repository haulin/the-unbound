import type { MechanicDef } from './types'
import { buildMechanicIndex } from './registry'
import { gateMechanic } from './defs/gate'
import { locksmithMechanic } from './defs/locksmith'
import { signpostMechanic } from './defs/signpost'
import { farmMechanic } from './defs/farm'
import { campMechanic } from './defs/camp'
import { hengeMechanic } from './defs/henge'
import { townMechanic } from './defs/town'
import { terrainHazardsMechanic } from './defs/terrainHazards'
import { combatMechanic } from './defs/combat'
import { fishingLakeMechanic } from './defs/fishingLake'
import { rainbowEndMechanic } from './defs/rainbowEnd'

// Array order = worldgen order: `world.ts` calls each `placeWorld` in this
// order, threading RNG state. Reordering changes the determinism golden. Gate
// goes first, locksmith second (reads gate position for min-distance). Pure
// encounter/event mechanics (terrainHazards, combat) have no `placeWorld` and
// sit at the end.
export const MECHANICS: readonly MechanicDef[] = [
  gateMechanic,
  locksmithMechanic,
  farmMechanic,
  campMechanic,
  townMechanic,
  hengeMechanic,
  signpostMechanic,
  fishingLakeMechanic,
  rainbowEndMechanic,
  terrainHazardsMechanic,
  combatMechanic,
] as const

export const MECHANIC_INDEX = buildMechanicIndex(MECHANICS)
