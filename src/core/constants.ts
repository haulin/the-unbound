// Core gameplay + generation constants (platform-agnostic)

import type { CellKind, FeatureKind, TerrainKind } from './types'
import { TERRAIN_LORE_BY_KIND } from './lore'
import { SPRITES } from './spriteIds'

// Re-export lore/name pools (defined in `src/core/lore.ts`).
export * from './lore'

export const SCOUT_GLOBAL_REVEAL_KINDS: readonly CellKind[] = ['farm', 'camp', 'henge', 'town']

export const WORLD_WIDTH = 10
export const WORLD_HEIGHT = 10
export const INITIAL_SEED = 47 // Don't go higher than 4 digits because of UI limitations.
export const ENABLE_ANIMATIONS = true
/** Debug: show next-round hit % below the Fight button in combat. */
export const SHOW_COMBAT_HIT_ODDS = true

export const SIGNPOST_COUNT = 6

// Worldgen tuning
export const GATE_LOCKSMITH_MIN_DISTANCE = 7
export const LOCKSMITH_LAIR_MIN_DISTANCE = 4

export const CAMP_COUNT = 3
export const CAMP_COOLDOWN_MOVES = 3
export const CAMP_FOOD_GAIN = 2

// Max offers per town is 3. Bump TOWN_COUNT when must-cover pool outgrows coverage.
export const TOWN_COUNT = 3
export const TOWN_FOOD_BUNDLE = 3
export const TOWN_TROOPS_BUNDLE = 2

export const TOWN_PRICE_FOOD_MIN = 5
export const TOWN_PRICE_FOOD_MAX = 8
export const TOWN_PRICE_TROOPS_MIN = 5
export const TOWN_PRICE_TROOPS_MAX = 10
export const TOWN_PRICE_RUMOR_MIN = 2
export const TOWN_PRICE_RUMOR_MAX = 4

export const COMPANION_HIRE_GOLD_MIN = 15
export const COMPANION_HIRE_GOLD_MAX = 20
export const HEALER_UPKEEP_GOLD = 1
export const TOWN_RUMORS_PER_VISIT_MAX = 3

// PoI modal buttons (town / camp / farm): 1–3 distinct offers per site.
export const POI_MIN_OFFERS = 1
export const POI_MAX_OFFERS = 3

export const HENGE_COUNT = 3

export const INITIAL_ARMY_SIZE = 10

export const MAP_GEN_NOISE = 'NOISE' as const
export const MAP_GEN_ALGORITHM = MAP_GEN_NOISE
export const NOISE_SMOOTH_PASSES = 2
export const NOISE_VALUE_MAX = 10000

export const INITIAL_FOOD = 15
export const INITIAL_GOLD = 15
export const FOOD_COST_DEFAULT = 1
export const FOOD_COST_SWAMP = 2
export const FOOD_COST_MOUNTAIN = 2
export const FOOD_WARNING_THRESHOLD = 5

export const FARM_COUNT = 3
export const FARM_COOLDOWN_MOVES = 3

export const FISHING_LAKE_COUNT = 6
export const FISHING_LAKE_COOLDOWN_MOVES = 3
export const RAINBOW_END_COUNT = 2
export const RAINBOW_END_MIN_DISTANCE = 7
export const RAINBOW_END_GOLD_PAYOUT = 30

export const FARM_BUY_FOOD_GOLD_COST = 3
export const FARM_BUY_FOOD_AMOUNT = 3
export const BEAST_CARRY_CAP_BONUS = 50

export const LOCKSMITH_KEY_FOOD_COST = 10
export const LOCKSMITH_KEY_GOLD_COST = 20

export const WYRM_PAY_GOLD_COST = 30
export const WYRM_INITIAL_HEALTH = 40
export const MAX_PARTY_SLOTS = 3

// Noise buckets for worldgen: equal slices, duplicates = more of that kind (~2/7 grass/road).
export const TERRAIN_KINDS = ['grass', 'road', 'mountain', 'grass', 'swamp', 'woods', 'road'] as const satisfies readonly TerrainKind[]
export const FEATURE_KINDS = [
  'gate',
  'gateOpen',
  'locksmith',
  'lair',
  'signpost',
  'farm',
  'camp',
  'henge',
  'town',
  'fishingLake',
  'rainbowEnd',
] as const satisfies readonly FeatureKind[]

export const TERRAIN: Record<TerrainKind, { spriteId: number }> = {
  grass: { spriteId: SPRITES.terrain.plains },
  road: { spriteId: SPRITES.terrain.gravel },
  mountain: { spriteId: SPRITES.terrain.mountains },
  swamp: { spriteId: SPRITES.terrain.swamp },
  woods: { spriteId: SPRITES.terrain.woods },
}

export const FEATURES: Record<FeatureKind, { spriteId: number }> = {
  gate: { spriteId: SPRITES.poi.gate },
  gateOpen: { spriteId: SPRITES.poi.gateOpen },
  locksmith: { spriteId: SPRITES.poi.locksmith },
  lair: { spriteId: SPRITES.terrain.cave },
  signpost: { spriteId: SPRITES.poi.signpost },
  farm: { spriteId: SPRITES.poi.farm },
  camp: { spriteId: SPRITES.poi.camp },
  henge: { spriteId: SPRITES.poi.henge },
  town: { spriteId: SPRITES.poi.town },
  fishingLake: { spriteId: SPRITES.poi.lake },
  rainbowEnd: { spriteId: SPRITES.poi.rainbow },
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
    case 'lair':
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
    case 'lair':
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

export const FOOD_DELTA_FRAMES = 36

// Lore strings + name pools are defined in `lore.ts`.

// Terrain move events (lost / ambush / quiet)
export const WOODS_AMBUSH_PERCENT = 25
export const WOODS_LOST_PERCENT = 10
export const SWAMP_LOST_PERCENT = 20
export const MOUNTAIN_AMBUSH_PERCENT = 25
export const TELEPORT_MIN_DISTANCE = 4

// Swamp quiet-enter find
export const SWAMP_FIND_PERCENT = 15
export const SWAMP_FIND_FOOD_BASE = 8
export const SWAMP_FIND_GOLD_BASE = 2

// Mountain quiet-enter find
export const MOUNTAIN_FIND_PERCENT = 15
export const MOUNTAIN_FIND_GOLD_BASE = 8
export const MOUNTAIN_FIND_FOOD_BASE = 2

export const TERRAIN_FIND_AMOUNT_NOISE = 2
// LOST_* are defined in `lore.ts`.

export const GRID_TRANSITION_STEP_FRAMES = 5

export const BRIGAND_RECRUIT_MAX_REMAINING = 5
export const BRIGAND_GOLD_NOISE = 3
export const BRIGAND_FOOD_MAX = 4

export const GOBLIN_GOLD_MAX = 2
export const GOBLIN_FOOD_FACTOR = 0.4
export const GOBLIN_FOOD_NOISE = 1

export const HENGE_COOLDOWN_MOVES = 3
export const HENGE_BAND_MIN = 10
export const HENGE_BAND_MAX = 40
export const HENGE_GOLD_NOISE = 3
export const HENGE_GOLD_BONUS = 10
export const HENGE_FOOD_FACTOR = 0.2
export const HENGE_FOOD_NOISE = 1

// Global actions (per-mechanic actions live on the mechanic defs).
export const ACTION_NEW_RUN = 'NEW_RUN' as const
export const ACTION_RESTART = 'RESTART' as const
export const ACTION_MOVE = 'MOVE' as const
export const ACTION_SHOW_GOAL = 'SHOW_GOAL' as const
export const ACTION_TOGGLE_MINIMAP = 'TOGGLE_MINIMAP' as const
export const ACTION_TOGGLE_MAP = 'TOGGLE_MAP' as const
export const ACTION_TICK = 'TICK' as const

export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 20

