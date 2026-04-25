// Core gameplay + generation constants (platform-agnostic)

export const WORLD_WIDTH = 10
export const WORLD_HEIGHT = 10

export const SIGNPOST_COUNT = 6

export const TILE_CASTLE = 8
export const TILE_SIGNPOST = 42

export const WALKABLE_COSMETIC_TILE_IDS = [2, 4, 6, 10, 12, 14, 34, 36, 38] as const
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
  38: 'Furrows run to the horizon. No one tends them.', // farm
}

export const ACTION_NEW_RUN = 'NEW_RUN' as const
export const ACTION_RESTART = 'RESTART' as const
export const ACTION_MOVE = 'MOVE' as const
export const ACTION_SHOW_GOAL = 'SHOW_GOAL' as const
export const ACTION_TOGGLE_MINIMAP = 'TOGGLE_MINIMAP' as const
export const ACTION_TICK = 'TICK' as const

export const INITIAL_SEED = 1
export const ENABLE_ANIMATIONS = true
export const MOVE_SLIDE_FRAMES = 15
export const LORE_MAX_CHARS_PER_LINE = 19

// UI-affecting sprite IDs that core state references (renderer interprets them).
export const SPR_BUTTON_GOAL = 44
export const SPR_BUTTON_RESTART = 46
export const SPR_BUTTON_MINIMAP = 78

