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
// Right-grid cell borders. Action/terrain share one color; shape (single vs
// double) carries the distinction.
export const UI_COLOR_GRID_CELL_BORDER = 14
export const UI_COLOR_GRID_CELL_BORDER_META = 15

export const UI_GRID_CELL_BORDER_DOUBLE_INSET = 2

export const UI_COLOR_RIGHT_PANEL_DIVIDER = 15

export const UI_STATS_BAND_ITEM_GAP_PX = 3
export const UI_STATS_BAND_ICON_VALUE_GAP_PX = 2
export const UI_HELD_BAND_ICON_GAP_PX = 2

// Sprite IDs are referenced directly from `SPRITES` in the renderer.

// 64x64 illustration preview (16x16 sprite scaled up).
export const UI_ILLUSTRATION_SCALE = 4 // 16->64
export const UI_TEXTURE_TILE_PX = 8
export const UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR = 8

// In-game map: fixed viewport centered on player, torus-wrapped.
export const UI_MAP_VIEWPORT_CELLS = 9 // odd so player sits at exact center
export const UI_MAP_CELL_PITCH_PX = 6
export const UI_MAP_POI_TEXT_COLOR = 13
export const UI_MAP_POI_UNCOMMITTED_TEXT_COLOR = UI_COLOR_BG
export const UI_MAP_POI_TEXT_OFFSET_X_PX = 1

// Encounter preview plate layout (overlay inside the illustration block).
export const UI_PREVIEW_PLATE_PAD = 2
export const UI_PREVIEW_PLATE_W = 42
export const UI_PREVIEW_PLATE_INSET = 2

// Right grid sprite draw policy.
export const UI_RIGHT_GRID_SPRITE_SCALE = 1 // 16->16
export const UI_RIGHT_GRID_SPRITE_W = 2
export const UI_RIGHT_GRID_SPRITE_H = 2
export const UI_RIGHT_GRID_COLORKEY = 0

// Left panel layout
export const UI_LEFT_PANEL_PADDING = 8
export const UI_LORE_PADDING_X = 9

// Gap between illustration and stats column; must clear the vertical divider.
export const UI_LEFT_PANEL_INNER_GAP = 12

// Gap above the lore body; must clear the horizontal divider.
export const UI_LEFT_PANEL_LORE_TOP_GAP = 7

export const UI_COLOR_LEFT_PANEL_DIVIDER = 15

// Vertical divider stops this many px short of the horizontal divider, so the
// negative space matches the inset the horizontal keeps from the frame.
export const UI_LEFT_PANEL_DIVIDER_GAP_PX = 5

// Pixel lift to optically center the stats column inside the header band.
export const UI_LEFT_PANEL_STATS_OPTICAL_LIFT_PX = 3

export const UI_STATUS_ICON_SIZE = 8

// Resource + stats stack spacing (tweak to tighten the column).
export const UI_HERO_RESOURCE_GAP_PX = 2
export const UI_AFTER_RESOURCES_GAP_PX = 2

// Army line (hero)
export const UI_ARMY_ICON_W_PX = 16
export const UI_ARMY_ICON_H_PX = 16
export const UI_ARMY_VALUE_OFFSET_X = UI_ARMY_ICON_W_PX + 3
export const UI_ARMY_VALUE_OFFSET_Y = 5

// Army delta overlay (relative to army icon origin)
export const UI_DELTA_OFFSET_X = 2
export const UI_DELTA_OFFSET_Y = 2
export const UI_DELTA_RISE_PX = 6
export const UI_DELTA_GAP_PX = -4

// Food line (hero)
export const UI_FOOD_ICON_W_PX = 16
export const UI_FOOD_ICON_H_PX = 16

// Value text offset next to any 16x16 stat/preview icon.
export const UI_ICON_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3
export const UI_ICON_VALUE_OFFSET_Y = 5

// Gold line (hero)
export const UI_GOLD_ICON_W_PX = 16
export const UI_GOLD_ICON_H_PX = 16
export const UI_GOLD_VALUE_OFFSET_X = UI_GOLD_ICON_W_PX + 3
export const UI_GOLD_VALUE_OFFSET_Y = 5

// Small stats (seed/pos/steps) are placed relative to the hero block (army+food).
export const UI_SMALL_STATS_START_OFFSET_Y =
  UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX + UI_FOOD_ICON_H_PX + UI_AFTER_RESOURCES_GAP_PX

