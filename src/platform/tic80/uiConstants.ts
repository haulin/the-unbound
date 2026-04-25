// Platform-specific tweakables for TIC-80 rendering.
// Keep this small and high-signal: things you might want to tune frequently.

// Sweetie16 palette indices (TIC-80 default palette order).
export const UI_COLOR_BG = 0
export const UI_COLOR_TEXT = 12
export const UI_COLOR_DIM = 15

export const UI_COLOR_GOOD = 5 // green
export const UI_COLOR_WARN = 4 // yellow
export const UI_COLOR_BAD = 2 // red

// Left panel layout
export const UI_LEFT_PANEL_PADDING = 6
export const UI_LEFT_PANEL_INNER_GAP = 6

export const UI_STATUS_ICON_SIZE = 8
export const UI_STATUS_ICON_GAP = 3
export const UI_STATUS_LINE_GAP = 3
export const UI_STATUS_TEXT_OFFSET_Y = 1

// Food line (hero)
export const UI_FOOD_ICON_W_PX = 16
export const UI_FOOD_ICON_H_PX = 16
export const UI_FOOD_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3
export const UI_FOOD_VALUE_OFFSET_Y = 5

// Food delta overlay (relative to food icon origin)
export const UI_FOOD_DELTA_OFFSET_X = 2
export const UI_FOOD_DELTA_OFFSET_Y = -2
export const UI_FOOD_DELTA_RISE_PX = 6
export const UI_FOOD_DELTA_GAP_PX = -4

