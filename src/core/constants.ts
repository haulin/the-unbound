// Core gameplay + generation constants (platform-agnostic)

import type { CellKind, FeatureKind, TerrainKind } from './types'
import { TERRAIN_LORE_BY_KIND } from './lore'
import { SPRITES } from './spriteIds'

// Re-export lore/name pools (defined in `src/core/lore.ts`).
export * from './lore'

export type GameMapLabel = 'F' | 'C' | 'H' | 'T' | 'G' | 'L'

export const SCOUT_GLOBAL_REVEAL_KINDS = ['farm', 'camp', 'henge', 'town'] as const satisfies readonly FeatureKind[]

export const GAME_MAP_LABEL_BY_KIND = {
  farm: 'F',
  camp: 'C',
  henge: 'H',
  town: 'T',
  gate: 'G',
  gateOpen: 'G',
  locksmith: 'L',
} as const satisfies Partial<Record<CellKind, GameMapLabel>>

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

// v0.3 — Towns
export const TOWN_COUNT = 2
export const TOWN_FOOD_BUNDLE = 3
export const TOWN_TROOPS_BUNDLE = 2

export const TOWN_PRICE_FOOD_MIN = 3
export const TOWN_PRICE_FOOD_MAX = 6
export const TOWN_PRICE_TROOPS_MIN = 5
export const TOWN_PRICE_TROOPS_MAX = 10
export const TOWN_PRICE_SCOUT_MIN = 8
export const TOWN_PRICE_SCOUT_MAX = 12
export const TOWN_PRICE_RUMOR_MIN = 3
export const TOWN_PRICE_RUMOR_MAX = 6


export const HENGE_COUNT = 3

export const INITIAL_ARMY_SIZE = 10

export const MAP_GEN_NOISE = 'NOISE' as const
export const MAP_GEN_ALGORITHM = MAP_GEN_NOISE
export const NOISE_SMOOTH_PASSES = 2
export const NOISE_VALUE_MAX = 10000

// v0.0.9 — Gate + Key
export const BRONZE_KEY_FOOD_COST = 10


export const INITIAL_FOOD = 15
export const INITIAL_GOLD = 15
export const FOOD_COST_DEFAULT = 1
// Legacy name retained for now; should match default enter-cost.
export const FOOD_MOVE_COST = FOOD_COST_DEFAULT
export const FOOD_COST_MOUNTAIN = 2
export const FOOD_COST_SWAMP = 2
export const FOOD_WARNING_THRESHOLD = 5

export const FARM_COUNT = 3
export const FARM_COOLDOWN_MOVES = 3

export const TERRAIN_KINDS = ['grass', 'road', 'mountain', 'lake', 'swamp', 'woods', 'rainbow'] as const satisfies readonly TerrainKind[]
export const FEATURE_KINDS = ['gate', 'gateOpen', 'locksmith', 'signpost', 'farm', 'camp', 'henge', 'town'] as const satisfies readonly FeatureKind[]

export const TERRAIN: Record<TerrainKind, { spriteId: number; enterFoodCost: number }> = {
  grass: { spriteId: SPRITES.tiles.plains, enterFoodCost: FOOD_COST_DEFAULT },
  road: { spriteId: SPRITES.tiles.gravel, enterFoodCost: FOOD_COST_DEFAULT },
  mountain: { spriteId: SPRITES.tiles.mountains, enterFoodCost: FOOD_COST_MOUNTAIN },
  lake: { spriteId: SPRITES.tiles.lake, enterFoodCost: FOOD_COST_DEFAULT },
  swamp: { spriteId: SPRITES.tiles.swamp, enterFoodCost: FOOD_COST_SWAMP },
  woods: { spriteId: SPRITES.tiles.woods, enterFoodCost: FOOD_COST_DEFAULT },
  rainbow: { spriteId: SPRITES.tiles.rainbow, enterFoodCost: FOOD_COST_DEFAULT },
}

export const FEATURES: Record<FeatureKind, { spriteId: number; enterFoodCost: number }> & {
  farm: { spriteId: number; enterFoodCost: number; count: number; cooldownMoves: number }
  camp: { spriteId: number; enterFoodCost: number; count: number; cooldownMoves: number; foodGain: number }
  signpost: { spriteId: number; enterFoodCost: number; count: number }
  town: { spriteId: number; enterFoodCost: number; count: number }
  gate: { spriteId: number; enterFoodCost: number }
  gateOpen: { spriteId: number; enterFoodCost: number }
  locksmith: { spriteId: number; enterFoodCost: number }
  henge: { spriteId: number; enterFoodCost: number; count: number }
} = {
  gate: { spriteId: SPRITES.interactivePois.gate, enterFoodCost: FOOD_COST_DEFAULT },
  gateOpen: { spriteId: SPRITES.interactivePois.gateOpen, enterFoodCost: FOOD_COST_DEFAULT },
  locksmith: { spriteId: SPRITES.interactivePois.locksmith, enterFoodCost: FOOD_COST_DEFAULT },
  signpost: { spriteId: SPRITES.tiles.signpost, enterFoodCost: FOOD_COST_DEFAULT, count: SIGNPOST_COUNT },
  farm: { spriteId: SPRITES.tiles.farm, enterFoodCost: FOOD_COST_DEFAULT, count: FARM_COUNT, cooldownMoves: FARM_COOLDOWN_MOVES },
  camp: {
    spriteId: SPRITES.interactivePois.camp,
    enterFoodCost: FOOD_COST_DEFAULT,
    count: CAMP_COUNT,
    cooldownMoves: CAMP_COOLDOWN_MOVES,
    foodGain: CAMP_FOOD_GAIN,
  },
  henge: { spriteId: SPRITES.interactivePois.henge, enterFoodCost: FOOD_COST_DEFAULT, count: HENGE_COUNT },
  town: { spriteId: SPRITES.interactivePois.town, enterFoodCost: FOOD_COST_DEFAULT, count: TOWN_COUNT },
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
    case 'town':
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
    case 'town':
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
    case 'town':
      return []
  }
}

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

export const ACTION_TOWN_BUY_FOOD = 'TOWN_BUY_FOOD' as const
export const ACTION_TOWN_BUY_TROOPS = 'TOWN_BUY_TROOPS' as const
export const ACTION_TOWN_HIRE_SCOUT = 'TOWN_HIRE_SCOUT' as const
export const ACTION_TOWN_BUY_RUMOR = 'TOWN_BUY_RUMOR' as const
export const ACTION_TOWN_LEAVE = 'TOWN_LEAVE' as const

export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 19

