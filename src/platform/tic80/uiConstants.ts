// Platform-specific tweakables for TIC-80 rendering.
// Keep this small and high-signal: things you might want to tune frequently.

// Sweetie16 palette indices (TIC-80 default palette order).
export const UI_COLOR_BG = 0
export const UI_COLOR_TEXT = 12
export const UI_COLOR_DIM = 15

export const UI_COLOR_GOOD = 5 // green
export const UI_COLOR_WARN = 4 // yellow
export const UI_COLOR_BAD = 2 // red

// Lore / narrative text (tweakable, split title vs body).
export const UI_COLOR_POI_NAME = 11
export const UI_COLOR_POI_DESC = 13
export const UI_COLOR_GRID_HOVER_TINT = 15

// Sprite IDs used by the TIC-80 UI renderer.
export const UI_SPR_STATUS_STEPS = 130
export const UI_SPR_STATUS_POS = 131
export const UI_SPR_STATUS_SEED = 132
export const UI_SPR_TEXTURE_OVERLAY = 133
export const UI_SPR_ENEMY = 102
export const UI_SPR_FIGHT = 74
export const UI_SPR_RETURN = 76

// 64×64 illustration preview (16×16 sprite scaled up).
export const UI_ILLUSTRATION_SCALE = 4 // 16->64
export const UI_TEXTURE_TILE_PX = 8
export const UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR = 8

// Combat preview plate layout inside illustration block.
export const UI_COMBAT_PREVIEW_PLATE_PAD = 2
export const UI_COMBAT_PREVIEW_PLATE_W = 42
export const UI_COMBAT_PREVIEW_PLATE_INSET = 2

// Right grid sprite draw policy.
export const UI_RIGHT_GRID_SPRITE_SCALE = 2 // 16->32
export const UI_RIGHT_GRID_SPRITE_W = 2
export const UI_RIGHT_GRID_SPRITE_H = 2
export const UI_RIGHT_GRID_COLORKEY = 0

// Left panel layout
export const UI_LEFT_PANEL_PADDING = 7
export const UI_LEFT_PANEL_INNER_GAP = 6

export const UI_STATUS_ICON_SIZE = 8
export const UI_STATUS_ICON_GAP = 3
export const UI_STATUS_LINE_GAP = 3
export const UI_STATUS_TEXT_OFFSET_Y = 1

// Resource + stats stack spacing (tweak to tighten the column).
export const UI_HERO_RESOURCE_GAP_PX = 2
export const UI_AFTER_RESOURCES_GAP_PX = 2

// Army line (hero)
export const UI_ARMY_ICON_W_PX = 16
export const UI_ARMY_ICON_H_PX = 16
export const UI_ARMY_VALUE_OFFSET_X = UI_ARMY_ICON_W_PX + 3
export const UI_ARMY_VALUE_OFFSET_Y = 5

// Army delta overlay (relative to army icon origin)
export const UI_ARMY_DELTA_OFFSET_X = 2
export const UI_ARMY_DELTA_OFFSET_Y = 2
export const UI_ARMY_DELTA_RISE_PX = 6
export const UI_ARMY_DELTA_GAP_PX = -4

// Food line (hero)
export const UI_FOOD_ICON_W_PX = 16
export const UI_FOOD_ICON_H_PX = 16
export const UI_FOOD_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3
export const UI_FOOD_VALUE_OFFSET_Y = 5

// Food delta overlay (relative to food icon origin)
export const UI_FOOD_DELTA_OFFSET_X = 2
export const UI_FOOD_DELTA_OFFSET_Y = 2
export const UI_FOOD_DELTA_RISE_PX = 6
export const UI_FOOD_DELTA_GAP_PX = -4

// Small stats (seed/pos/steps) are placed relative to the hero block (army+food).
export const UI_SMALL_STATS_START_OFFSET_Y =
  UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX + UI_FOOD_ICON_H_PX + UI_AFTER_RESOURCES_GAP_PX

