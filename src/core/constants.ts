// Core gameplay + generation constants (platform-agnostic)

import type { CellKind, FeatureKind, TerrainKind } from './types'
import { TERRAIN_LORE_BY_KIND } from './lore'

// Re-export lore/name pools (defined in `src/core/lore.ts`).
export * from './lore'

export const WORLD_WIDTH = 10
export const WORLD_HEIGHT = 10
export const INITIAL_SEED = 34
export const ENABLE_ANIMATIONS = true

export const TILE_GATE = 68
export const TILE_GATE_OPEN = 70
export const TILE_LOCKSMITH = 72
export const TILE_SIGNPOST = 42
export const TILE_FARM = 38
export const TILE_CAMP = 36
export const TILE_HENGE = 66
export const TILE_MOUNTAIN = 6
export const TILE_SWAMP = 12

export const SIGNPOST_COUNT = 6

// Worldgen tuning
export const GATE_LOCKSMITH_MIN_DISTANCE = 7

export const CAMP_COUNT = 3
export const CAMP_COOLDOWN_MOVES = 3
export const CAMP_FOOD_GAIN = 2

// v0.2 — Scout
export const SCOUT_FOOD_COST = 5

export const HENGE_COUNT = 3

export const INITIAL_ARMY_SIZE = 10
export const ARMY_SPRITE_ID = 100

export const MAP_GEN_NOISE = 'NOISE' as const
export const MAP_GEN_ALGORITHM = MAP_GEN_NOISE
export const NOISE_SMOOTH_PASSES = 2
export const NOISE_VALUE_MAX = 10000

// v0.0.9 — Gate + Key
export const BRONZE_KEY_FOOD_COST = 10
export const GATE_NAME = 'The Gate'
export const LOCKSMITH_NAME = 'Locksmith of the Unbound'

// Lore strings for gate/locksmith are defined in `lore.ts`.

// Per-terrain lore pools are defined in `lore.ts`.

export const INITIAL_FOOD = 15
export const FOOD_COST_DEFAULT = 1
// Legacy name retained for now; should match default enter-cost.
export const FOOD_MOVE_COST = FOOD_COST_DEFAULT
export const FOOD_COST_MOUNTAIN = 2
export const FOOD_COST_SWAMP = 2
export const FOOD_WARNING_THRESHOLD = 5

export const FARM_COUNT = 3
export const FARM_COOLDOWN_MOVES = 3

export const TERRAIN_KINDS = ['grass', 'road', 'mountain', 'lake', 'swamp', 'woods', 'rainbow'] as const satisfies readonly TerrainKind[]
export const FEATURE_KINDS = ['gate', 'gateOpen', 'locksmith', 'signpost', 'farm', 'camp', 'henge'] as const satisfies readonly FeatureKind[]

export const TERRAIN: Record<TerrainKind, { spriteId: number; enterFoodCost: number }> = {
  grass: { spriteId: 2, enterFoodCost: FOOD_COST_DEFAULT },
  road: { spriteId: 4, enterFoodCost: FOOD_COST_DEFAULT },
  mountain: { spriteId: TILE_MOUNTAIN, enterFoodCost: FOOD_COST_MOUNTAIN },
  lake: { spriteId: 10, enterFoodCost: FOOD_COST_DEFAULT },
  swamp: { spriteId: TILE_SWAMP, enterFoodCost: FOOD_COST_SWAMP },
  woods: { spriteId: 14, enterFoodCost: FOOD_COST_DEFAULT },
  rainbow: { spriteId: 34, enterFoodCost: FOOD_COST_DEFAULT },
}

export const FEATURES: Record<FeatureKind, { spriteId: number; enterFoodCost: number }> & {
  farm: { spriteId: number; enterFoodCost: number; count: number; cooldownMoves: number }
  camp: { spriteId: number; enterFoodCost: number; count: number; cooldownMoves: number; foodGain: number }
  signpost: { spriteId: number; enterFoodCost: number; count: number }
  gate: { spriteId: number; enterFoodCost: number }
  gateOpen: { spriteId: number; enterFoodCost: number }
  locksmith: { spriteId: number; enterFoodCost: number }
  henge: { spriteId: number; enterFoodCost: number; count: number }
} = {
  gate: { spriteId: TILE_GATE, enterFoodCost: FOOD_COST_DEFAULT },
  gateOpen: { spriteId: TILE_GATE_OPEN, enterFoodCost: FOOD_COST_DEFAULT },
  locksmith: { spriteId: TILE_LOCKSMITH, enterFoodCost: FOOD_COST_DEFAULT },
  signpost: { spriteId: TILE_SIGNPOST, enterFoodCost: FOOD_COST_DEFAULT, count: SIGNPOST_COUNT },
  farm: { spriteId: TILE_FARM, enterFoodCost: FOOD_COST_DEFAULT, count: FARM_COUNT, cooldownMoves: FARM_COOLDOWN_MOVES },
  camp: {
    spriteId: TILE_CAMP,
    enterFoodCost: FOOD_COST_DEFAULT,
    count: CAMP_COUNT,
    cooldownMoves: CAMP_COOLDOWN_MOVES,
    foodGain: CAMP_FOOD_GAIN,
  },
  henge: { spriteId: TILE_HENGE, enterFoodCost: FOOD_COST_DEFAULT, count: HENGE_COUNT },
}

export function spriteIdForKind(kind: CellKind): number {
  switch (kind) {
    case 'grass':
    case 'road':
    case 'mountain':
    case 'lake':
    case 'swamp':
    case 'woods':
    case 'rainbow':
      return TERRAIN[kind].spriteId
    case 'gate':
    case 'gateOpen':
    case 'locksmith':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
      return FEATURES[kind].spriteId
  }
}

export function enterFoodCostForKind(kind: CellKind): number {
  switch (kind) {
    case 'grass':
    case 'road':
    case 'mountain':
    case 'lake':
    case 'swamp':
    case 'woods':
    case 'rainbow':
      return TERRAIN[kind].enterFoodCost
    case 'gate':
    case 'gateOpen':
    case 'locksmith':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
      return FEATURES[kind].enterFoodCost
  }
}

export function terrainLoreLinesForKind(kind: CellKind): readonly string[] {
  switch (kind) {
    case 'grass':
    case 'road':
    case 'mountain':
    case 'lake':
    case 'swamp':
    case 'woods':
    case 'rainbow':
      return TERRAIN_LORE_BY_KIND[kind]
    case 'gate':
    case 'gateOpen':
    case 'locksmith':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
      return []
  }
}

// UI icon for food (16×16 sprite; renderer draws with w=2,h=2)
export const FOOD_SPRITE_ID = 98

export const FOOD_DELTA_FRAMES = 24

// Lore strings + name pools are defined in `lore.ts`.

// v0.1 — Lost (per-tile event roll + teleport)
export const WOODS_AMBUSH_PERCENT = 15
export const WOODS_LOST_PERCENT = 10
export const MOUNTAIN_AMBUSH_PERCENT = 25
export const SWAMP_LOST_PERCENT = 20
export const TELEPORT_MIN_DISTANCE = 4
// LOST_* are defined in `lore.ts`.

export const COMBAT_REWARD_MIN = 5
export const COMBAT_REWARD_MAX = 15
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
export const ACTION_CAMP_HIRE_SCOUT = 'CAMP_HIRE_SCOUT' as const
export const ACTION_CAMP_LEAVE = 'CAMP_LEAVE' as const

export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 19

// UI-affecting sprite IDs that core state references (renderer interprets them).
export const SPR_BUTTON_GOAL = 44
export const SPR_BUTTON_RESTART = 46
export const SPR_BUTTON_MINIMAP = 78
export const SPR_BUTTON_MAP = 138
export const SPR_BUTTON_CAMP_SEARCH = 110
export const SPR_BUTTON_CAMP_HIRE_SCOUT = 142
export const SPR_ICON_SCOUT = 108

