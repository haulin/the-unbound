// Core gameplay + generation constants (platform-agnostic)

import type { CellKind, FeatureKind, TerrainKind } from './types'
import { TERRAIN_LORE_BY_KIND } from './lore'
import { SPRITES } from './spriteIds'

// Re-export lore/name pools (defined in `src/core/lore.ts`).
export * from './lore'

export const SCOUT_GLOBAL_REVEAL_KINDS: readonly CellKind[] = ['farm', 'camp', 'henge', 'town']

export const WORLD_WIDTH = 10
export const WORLD_HEIGHT = 10
export const INITIAL_SEED = 47
export const ENABLE_ANIMATIONS = true

export const SIGNPOST_COUNT = 6

// Worldgen tuning
export const GATE_LOCKSMITH_MIN_DISTANCE = 7

export const CAMP_COUNT = 3
export const CAMP_COOLDOWN_MOVES = 3
export const CAMP_FOOD_GAIN = 2

// v0.3 - Towns
export const TOWN_COUNT = 2
export const TOWN_FOOD_BUNDLE = 3
export const TOWN_TROOPS_BUNDLE = 2

export const TOWN_PRICE_FOOD_MIN = 5
export const TOWN_PRICE_FOOD_MAX = 8
export const TOWN_PRICE_TROOPS_MIN = 5
export const TOWN_PRICE_TROOPS_MAX = 10
export const TOWN_PRICE_SCOUT_MIN = 10
export const TOWN_PRICE_SCOUT_MAX = 15
export const TOWN_PRICE_RUMOR_MIN = 2
export const TOWN_PRICE_RUMOR_MAX = 4


export const HENGE_COUNT = 3

export const INITIAL_ARMY_SIZE = 10

export const MAP_GEN_NOISE = 'NOISE' as const
export const MAP_GEN_ALGORITHM = MAP_GEN_NOISE
export const NOISE_SMOOTH_PASSES = 2
export const NOISE_VALUE_MAX = 10000

// v0.0.9 - Gate + Key
export const BRONZE_KEY_FOOD_COST = 10


export const INITIAL_FOOD = 15
export const INITIAL_GOLD = 15
export const FOOD_COST_DEFAULT = 1
export const FOOD_COST_MOUNTAIN = 2
export const FOOD_COST_SWAMP = 2
export const FOOD_WARNING_THRESHOLD = 5

export const FARM_COUNT = 3
export const FARM_COOLDOWN_MOVES = 3

// v0.4 - Placed lakes / rainbow ends + farm/locksmith tuning
export const FISHING_LAKE_COUNT = 6
export const FISHING_LAKE_COOLDOWN_MOVES = 3
export const RAINBOW_END_COUNT = 2
export const RAINBOW_END_MIN_DISTANCE = 7
export const RAINBOW_END_GOLD_PAYOUT = 30

export const FARM_BUY_FOOD_GOLD_COST = 3
export const FARM_BUY_FOOD_AMOUNT = 3
export const FARM_BEAST_GOLD_MIN = 10
export const FARM_BEAST_GOLD_MAX = 15
export const BEAST_CARRY_CAP_BONUS = 50

export const LOCKSMITH_KEY_FOOD_COST = 10
export const LOCKSMITH_KEY_GOLD_COST = 20

export const TERRAIN_KINDS = ['grass', 'road', 'mountain', 'grass', 'swamp', 'woods', 'road'] as const satisfies readonly TerrainKind[]
export const FEATURE_KINDS = [
  'gate',
  'gateOpen',
  'locksmith',
  'signpost',
  'farm',
  'camp',
  'henge',
  'town',
  'fishingLake',
  'rainbowEnd',
] as const satisfies readonly FeatureKind[]

export const TERRAIN: Record<TerrainKind, { spriteId: number }> = {
  grass: { spriteId: SPRITES.tiles.plains },
  road: { spriteId: SPRITES.tiles.gravel },
  mountain: { spriteId: SPRITES.tiles.mountains },
  swamp: { spriteId: SPRITES.tiles.swamp },
  woods: { spriteId: SPRITES.tiles.woods },
}

export const FEATURES: Record<FeatureKind, { spriteId: number }> = {
  gate: { spriteId: SPRITES.interactivePois.gate },
  gateOpen: { spriteId: SPRITES.interactivePois.gateOpen },
  locksmith: { spriteId: SPRITES.interactivePois.locksmith },
  signpost: { spriteId: SPRITES.tiles.signpost },
  farm: { spriteId: SPRITES.tiles.farm },
  camp: { spriteId: SPRITES.interactivePois.camp },
  henge: { spriteId: SPRITES.interactivePois.henge },
  town: { spriteId: SPRITES.interactivePois.town },
  fishingLake: { spriteId: SPRITES.tiles.lake },
  rainbowEnd: { spriteId: SPRITES.tiles.rainbow },
}

export function spriteIdForKind(kind: CellKind): number {
  switch (kind) {
    case 'grass':
    case 'road':
    case 'mountain':
    case 'swamp':
    case 'woods':
      return TERRAIN[kind].spriteId
    case 'gate':
    case 'gateOpen':
    case 'locksmith':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
    case 'town':
    case 'fishingLake':
    case 'rainbowEnd':
      return FEATURES[kind].spriteId
  }
}

export function terrainLoreLinesForKind(kind: CellKind): readonly string[] {
  switch (kind) {
    case 'grass':
    case 'road':
    case 'mountain':
    case 'swamp':
    case 'woods':
      return TERRAIN_LORE_BY_KIND[kind]
    case 'gate':
    case 'gateOpen':
    case 'locksmith':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
    case 'town':
    case 'fishingLake':
    case 'rainbowEnd':
      return []
  }
}

export const FOOD_DELTA_FRAMES = 24

// Lore strings + name pools are defined in `lore.ts`.

// v0.1 - Lost (per-tile event roll + teleport)
export const WOODS_AMBUSH_PERCENT = 15
export const WOODS_LOST_PERCENT = 10
export const MOUNTAIN_AMBUSH_PERCENT = 25
export const SWAMP_LOST_PERCENT = 20
export const TELEPORT_MIN_DISTANCE = 4
// LOST_* are defined in `lore.ts`.

export const COMBAT_GOLD_REWARD_MIN = 8
export const COMBAT_GOLD_REWARD_MAX = 20
export const COMBAT_FOOD_BONUS_MAX = 4 // 0..4
export const GRID_TRANSITION_STEP_FRAMES = 5

// Combat + henge encounter lore lines are defined in `lore.ts`.

export const HENGE_COOLDOWN_MOVES = 3

export const ACTION_NEW_RUN = 'NEW_RUN' as const
export const ACTION_RESTART = 'RESTART' as const
export const ACTION_MOVE = 'MOVE' as const
export const ACTION_SHOW_GOAL = 'SHOW_GOAL' as const
export const ACTION_TOGGLE_MINIMAP = 'TOGGLE_MINIMAP' as const
export const ACTION_TOGGLE_MAP = 'TOGGLE_MAP' as const
export const ACTION_FIGHT = 'FIGHT' as const
export const ACTION_RETURN = 'RETURN' as const
export const ACTION_TICK = 'TICK' as const
export const ACTION_CAMP_SEARCH = 'CAMP_SEARCH' as const
export const ACTION_CAMP_LEAVE = 'CAMP_LEAVE' as const

export const ACTION_TOWN_BUY_FOOD = 'buyFood' as const
export const ACTION_TOWN_BUY_TROOPS = 'buyTroops' as const
export const ACTION_TOWN_HIRE_SCOUT = 'hireScout' as const
export const ACTION_TOWN_BUY_RUMOR = 'buyRumors' as const
export const ACTION_TOWN_LEAVE = 'TOWN_LEAVE' as const

export const ACTION_FARM_BUY_FOOD = 'FARM_BUY_FOOD' as const
export const ACTION_FARM_BUY_BEAST = 'FARM_BUY_BEAST' as const
export const ACTION_FARM_LEAVE = 'FARM_LEAVE' as const

export const ACTION_LOCKSMITH_PAY_GOLD = 'LOCKSMITH_PAY_GOLD' as const
export const ACTION_LOCKSMITH_PAY_FOOD = 'LOCKSMITH_PAY_FOOD' as const
export const ACTION_LOCKSMITH_LEAVE = 'LOCKSMITH_LEAVE' as const

export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 19

