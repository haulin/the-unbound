// Core gameplay + generation constants (platform-agnostic)

export const WORLD_WIDTH = 10
export const WORLD_HEIGHT = 10

export const SIGNPOST_COUNT = 6

export const TILE_CASTLE = 8
export const TILE_SIGNPOST = 42
export const TILE_FARM = 38

export const WALKABLE_COSMETIC_TILE_IDS = [2, 4, 6, 10, 12, 14, 34, 36] as const
export const WALKABLE_TILE_COUNT = WALKABLE_COSMETIC_TILE_IDS.length

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
  6: 'The peaks ahead do not look closer.', // mountains
  10: 'The water is still. Something moves beneath.', // lake
  12: 'The ground gives underfoot. It keeps giving.', // swamp
  14: "A path that isn't quite a path.", // woods
  34: 'The light here bends wrong.', // rainbow's end
  36: 'The ash is cold. Has been for some time.', // camp
}

export const INITIAL_FOOD = 10
export const FOOD_MOVE_COST = 1
export const FOOD_WARNING_THRESHOLD = 5

export const FARM_COUNT = 3
export const FARM_COOLDOWN_MOVES = 3

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

export const ACTION_NEW_RUN = 'NEW_RUN' as const
export const ACTION_RESTART = 'RESTART' as const
export const ACTION_MOVE = 'MOVE' as const
export const ACTION_SHOW_GOAL = 'SHOW_GOAL' as const
export const ACTION_TOGGLE_MINIMAP = 'TOGGLE_MINIMAP' as const
export const ACTION_TICK = 'TICK' as const

export const INITIAL_SEED = 6
export const ENABLE_ANIMATIONS = true
export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 19

// UI-affecting sprite IDs that core state references (renderer interprets them).
export const SPR_BUTTON_GOAL = 44
export const SPR_BUTTON_RESTART = 46
export const SPR_BUTTON_MINIMAP = 78

