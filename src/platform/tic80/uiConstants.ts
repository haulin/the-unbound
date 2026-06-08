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

// Sprite IDs are referenced directly from `SPRITES` in the renderer.

// 64x64 illustration preview (16x16 sprite scaled up).
export const UI_ILLUSTRATION_SCALE = 4 // 16->64
export const UI_TEXTURE_TILE_PX = 8
export const UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR = 8

// In-game map: fixed viewport centered on player, torus-wrapped.
export const UI_MAP_VIEWPORT_CELLS = 9 // odd so player sits at exact center
export const UI_MAP_CELL_PITCH_PX = 7
// 9×7px grid leaves 1px slack in the 64×64 band; nudge right to balance margins.
export const UI_MAP_GRID_OFFSET_X_PX = 1
export const UI_MAP_POI_TEXT_COLOR = 13
export const UI_MAP_POI_UNCOMMITTED_TEXT_COLOR = UI_COLOR_BG
export const UI_MAP_POI_TEXT_OFFSET_X_PX = 1
export const UI_MAP_POI_TEXT_OFFSET_Y_PX = 1

// Right-panel seed/position/steps band — dimmer than hero stats (UI_COLOR_TEXT).
export const UI_COLOR_RIGHT_STATS_TEXT = UI_COLOR_POI_DESC
// Right-grid cell borders. Action/terrain share one color; shape (single vs
// double) carries the distinction.
export const UI_COLOR_GRID_CELL_BORDER = 14
export const UI_COLOR_GRID_CELL_BORDER_META = 15
// Right-grid action button nine-slice: keyed #8 so hover tint shows through cutouts.
export const UI_GRID_ACTION_BORDER_COLORKEY = UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR

export const UI_GRID_CELL_BORDER_DOUBLE_INSET = 2

export const UI_COLOR_RIGHT_PANEL_DIVIDER = 15

export const UI_STATS_BAND_ITEM_GAP_PX = 3
export const UI_STATS_BAND_ICON_VALUE_GAP_PX = 2
export const UI_HELD_BAND_ICON_GAP_PX = 2

// Right grid sprite draw policy.
export const UI_RIGHT_GRID_SPRITE_SCALE = 1 // 16->16
export const UI_RIGHT_GRID_SPRITE_W = 2
export const UI_RIGHT_GRID_SPRITE_H = 2
export const UI_RIGHT_GRID_COLORKEY = 0

export const UI_BADGE_HEIGHT_PX = 7
export const UI_BADGE_PAD_X = 2 // left inset inside pill
export const UI_BADGE_PAD_RIGHT = 1 // right inset (trailing gap is part of pill art)
export const UI_BADGE_PAD_Y = 1
export const UI_BADGE_OFFSET_X = 1
export const UI_BADGE_OFFSET_Y = 4
export const UI_BADGE_PILL_CAP_PX = 4
export const UI_BADGE_PILL_SHEET_W_PX = 8
export const UI_BADGE_PILL_COLORKEY = 0
// Glyph advance inside pill (TIC default font at 1×).
export const UI_BADGE_MINUS_WIDTH_PX = 4
export const UI_BADGE_DIGIT1_WIDTH_PX = 5
export const UI_BADGE_DIGIT_WIDTH_PX = 6

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

export const UI_STATUS_ICON_SIZE = 8

// Delta overlay (relative to hero stat icon origin; see HERO_STATS_* in render.ts).
export const UI_DELTA_OFFSET_X = 2
export const UI_DELTA_OFFSET_Y = 2
export const UI_DELTA_RISE_PX = 6
export const UI_DELTA_GAP_PX = -4

// Animation timing (frames).
export const MOVE_SLIDE_FRAMES = 15
export const FOOD_DELTA_FRAMES = 36
export const GRID_TRANSITION_STEP_FRAMES = 5

// When false, the translator is a no-op and the renderer paints the static
// post-dispatch state.
export const ENABLE_ANIMATIONS = true

