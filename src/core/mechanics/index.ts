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

export const MECHANICS: readonly MechanicDef[] = [
  gateMechanic,
  locksmithMechanic,
  signpostMechanic,
  farmMechanic,
  campMechanic,
  hengeMechanic,
  townMechanic,
  terrainHazardsMechanic,
  combatMechanic,
  fishingLakeMechanic,
  rainbowEndMechanic,
] as const

export const MECHANIC_INDEX = buildMechanicIndex(MECHANICS)
