// Core gameplay + generation constants (platform-agnostic)

import type { CellKind, FeatureKind, TerrainKind } from './types'

export const WORLD_WIDTH = 10
export const WORLD_HEIGHT = 10
export const INITIAL_SEED = 14
export const ENABLE_ANIMATIONS = true

export const TILE_CASTLE = 8
export const TILE_SIGNPOST = 42
export const TILE_FARM = 38
export const TILE_CAMP = 36
export const TILE_HENGE = 66
export const TILE_MOUNTAIN = 6
export const TILE_SWAMP = 12

export const SIGNPOST_COUNT = 6

export const CAMP_COUNT = 3
export const CAMP_COOLDOWN_MOVES = 3
export const CAMP_FOOD_GAIN = 2

export const HENGE_COUNT = 3

export const INITIAL_ARMY_SIZE = 10
export const ARMY_SPRITE_ID = 100

export const MAP_GEN_NOISE = 'NOISE' as const
export const MAP_GEN_ALGORITHM = MAP_GEN_NOISE
export const NOISE_SMOOTH_PASSES = 2
export const NOISE_VALUE_MAX = 10000

export const GOAL_NARRATIVE =
  'Another soul sets out across the Unbound. Somewhere in these lands stands a castle older than memory. Find it.'

export const CASTLE_FOUND_MESSAGE = 'The Castle looms before you. You are home.'

export const TERRAIN_MESSAGE_BY_TILE_ID: Record<number, string> = {
  2: 'The grass bends with your passing.', // grass
  4: 'The road here remembers other feet.', // road / gravel
  6: 'The peaks ahead do not look closer. Stone and thin air. Your supplies will feel it.', // mountains
  10: 'The water is still. Something moves beneath.', // lake
  12: 'Crossing the bog is harder than it looks. You\'ll need to eat well tonight.', // swamp
  14: "A path that isn't quite a path.", // woods
  34: 'The light here bends wrong.', // rainbow's end
}

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
export const FEATURE_KINDS = ['castle', 'signpost', 'farm', 'camp', 'henge'] as const satisfies readonly FeatureKind[]

export const TERRAIN: Record<TerrainKind, { spriteId: number; enterFoodCost: number; message: string }> = {
  grass: { spriteId: 2, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[2] || '' },
  road: { spriteId: 4, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[4] || '' },
  mountain: {
    spriteId: TILE_MOUNTAIN,
    enterFoodCost: FOOD_COST_MOUNTAIN,
    message: TERRAIN_MESSAGE_BY_TILE_ID[TILE_MOUNTAIN] || '',
  },
  lake: { spriteId: 10, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[10] || '' },
  swamp: { spriteId: TILE_SWAMP, enterFoodCost: FOOD_COST_SWAMP, message: TERRAIN_MESSAGE_BY_TILE_ID[TILE_SWAMP] || '' },
  woods: { spriteId: 14, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[14] || '' },
  rainbow: { spriteId: 34, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[34] || '' },
}

export const FEATURES: Record<FeatureKind, { spriteId: number; enterFoodCost: number }> & {
  farm: { spriteId: number; enterFoodCost: number; count: number; cooldownMoves: number }
  camp: { spriteId: number; enterFoodCost: number; count: number; cooldownMoves: number; foodGain: number }
  signpost: { spriteId: number; enterFoodCost: number; count: number }
  castle: { spriteId: number; enterFoodCost: number }
  henge: { spriteId: number; enterFoodCost: number; count: number }
} = {
  castle: { spriteId: TILE_CASTLE, enterFoodCost: FOOD_COST_DEFAULT },
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
    case 'castle':
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
    case 'castle':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
      return FEATURES[kind].enterFoodCost
  }
}

export function terrainMessageForKind(kind: CellKind): string {
  switch (kind) {
    case 'grass':
    case 'road':
    case 'mountain':
    case 'lake':
    case 'swamp':
    case 'woods':
    case 'rainbow':
      return TERRAIN[kind].message
    case 'castle':
    case 'signpost':
    case 'farm':
    case 'camp':
    case 'henge':
      return ''
  }
}

// UI icon for food (16×16 sprite; renderer draws with w=2,h=2)
export const FOOD_SPRITE_ID = 98

export const FOOD_DELTA_FRAMES = 24

// Max 14 characters
export const FARM_NAME_POOL = [
  'The Oast',
  'Burnt Acre',
  'Greyfield',
  "Hob's Reach",
  'The Stemming',
  'Fallow End',
  "Cotter's Rise",
] as const

export const FARM_HARVEST_LINES = [
  'Someone left in a hurry. The stores are still full.',
  'The cellar is cold and deep. You help yourself.',
  'Enough here to keep moving. You take what you need.',
  'Unharvested, but not unwelcome. You gather what you can.',
  'The farmer is long gone. The food remains.',
] as const

export const FARM_REVISIT_LINES = [
  'You already took what there was.',
  'The stores are empty now. Come back later.',
  'Nothing left here. It will regrow in time.',
] as const

export const CAMP_NAME_POOL = [
  'The Wayrest',
  'Ember Cross',
  'The Muster',
  'Cold Haven',
  'Ashford',
  'Dusk Halt',
  'The Holdfast',
] as const

export const HENGE_NAME_POOL = [
  'The Mending',
  'Old Insistence',
  "Crows' Argument",
  'The Recurring',
  'Patient Circle',
  'Weather Cross',
] as const

export const HENGE_LORE_LINES = [
  'The circle remembers old debts.',
  'The stones do not ask why you are here.',
  'Whatever drew you here drew them first.',
] as const

export const HENGE_EMPTY_LINES = [
  'The spirits here are quiet. Come back later.',
  'The circle is empty for now.',
  'You do not look back. You do not need to.',
] as const

export const CAMP_RECRUIT_LINES = [
  'Stragglers around a dying fire. They fall in without a word.',
  'A few souls with nowhere better to be. They join you.',
  "They were waiting for someone. You'll do.",
  'No questions asked. No names given. Your ranks grow.',
  "They look like they've found something. So have you.",
] as const

export const CAMP_EMPTY_LINES = [
  'The fire is cold. Give it time.',
  'Not yet. The road brings more, but not today.',
  "The word hasn't spread far enough yet. Return later.",
] as const

export const GAME_OVER_LINES = [
  "The last of them fell somewhere you won't remember. The world keeps turning.",
  'You came with an army. You leave with nothing.\nThe gate remains closed.',
  'Alone now. The road goes on without you.',
] as const

export const COMBAT_AMBUSH_PERCENT = 20
export const COMBAT_REWARD_MIN = 5
export const COMBAT_REWARD_MAX = 15
export const GRID_TRANSITION_STEP_FRAMES = 5

export const COMBAT_ENCOUNTER_LINES = [
  'They were already here.',
  'Company. The unwanted kind.',
  'This was always going to happen.',
] as const

export const COMBAT_FLEE_EXIT_LINES = [
  'You left one of your own behind so the journey can continue.',
  'You turned away. Not everyone followed.',
  'You survived. That is not the same as winning.',
] as const

export const COMBAT_VICTORY_EXIT_LINES = ['To the victor go the spoils.', 'You took what you could and moved on.', 'They will not follow you again.'] as const

export const HENGE_ENCOUNTER_LINE = 'You walked into something that was already happening.'

export const HENGE_COOLDOWN_MOVES = 3

export const ACTION_NEW_RUN = 'NEW_RUN' as const
export const ACTION_RESTART = 'RESTART' as const
export const ACTION_MOVE = 'MOVE' as const
export const ACTION_SHOW_GOAL = 'SHOW_GOAL' as const
export const ACTION_TOGGLE_MINIMAP = 'TOGGLE_MINIMAP' as const
export const ACTION_FIGHT = 'FIGHT' as const
export const ACTION_RETURN = 'RETURN' as const
export const ACTION_TICK = 'TICK' as const

export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 19

// UI-affecting sprite IDs that core state references (renderer interprets them).
export const SPR_BUTTON_GOAL = 44
export const SPR_BUTTON_RESTART = 46
export const SPR_BUTTON_MINIMAP = 78

