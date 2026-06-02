import type { MechanicDef } from './types'
import { buildMechanicIndex } from './registry'
import { gateMechanic } from './defs/gate'
import { locksmithMechanic } from './defs/locksmith'
import { signpostMechanic } from './defs/signpost'
import { farmMechanic } from './defs/farm'
import { campMechanic } from './defs/camp'
import { hengeMechanic } from './defs/henge'
import { townMechanic } from './defs/town'
import { woodsMechanic } from './defs/woods'
import { swampMechanic } from './defs/swamp'
import { mountainMechanic } from './defs/mountain'
import { combatMechanic } from './defs/combat'
import { fishingLakeMechanic } from './defs/fishingLake'
import { rainbowEndMechanic } from './defs/rainbowEnd'
import { wyrmMechanic } from './defs/wyrm'

// Array order = worldgen order: `world.ts` calls each `placeWorld` in this
// order, threading RNG state. Peer-aware placers assert their predecessor's
// presence; reordering them changes the determinism golden.
export const MECHANICS: readonly MechanicDef[] = [
  wyrmMechanic,
  locksmithMechanic,
  gateMechanic,
  farmMechanic,
  campMechanic,
  townMechanic,
  hengeMechanic,
  signpostMechanic,
  fishingLakeMechanic,
  rainbowEndMechanic,
  woodsMechanic,
  swampMechanic,
  mountainMechanic,
  combatMechanic,
] as const

export const MECHANIC_INDEX = buildMechanicIndex(MECHANICS)
