// Sprite ID registry (TIC-80 sprite sheet). Organized by what the sprite
// depicts, not where it renders. See docs/plans/2026-05-30-ui-intermezzo-design.md.

export const SPRITES = {
  // 16x16 world tiles (player walks on these).
  terrain: {
    plains: 8,
    gravel: 10,
    woods: 4,
    swamp: 6,
    mountains: 2,
    cave: 38,
  },

  // 16x16 POI tiles (overworld placement + illustration).
  poi: {
    lake: 34,
    farm: 66,
    henge: 36,
    locksmith: 68,
    signpost: 42,
    rainbow: 76,
    town: 72,
    camp: 74,
    gate: 78,
    gateOpen: 46,
  },

  // 16x16 things the player accumulates (stats / plate labels / grid buttons).
  inventory: {
    food: 194,
    bloodVial: 198,
    beast: 226,
    bronzeKey: 196,
    troop: 200,
    scout: 228,
    gold: 204,
  },

  // 16x16 opponent-side stats.
  enemies: {
    heart: 134,
    enemy: 132,
    goblin: 130,
  },

  // 16x16 verbs with no real-world referent.
  actions: {
    return: 98,
    fight: 100,
    map: 102,
    minimap: 104, // "debug map" in sheet notes; used as minimap toggle
    search: 106,
    restart: 108,
    goal: 110,
    rumor: 142,
  },

  // 16x16 decorative centerpieces for encounter grids (never actionable).
  centers: {
    farmBarn: 162,
    locksmithKiln: 164,
    wyrm: 166,
    marketStall: 168,
    campfire: 170,
    tombstone: 174,
  },

  // 8x8 small stat icons (seed / position / steps band).
  small: {
    seed: 234,
    position: 235,
    steps: 250,
  },

  // 8x8 UI chrome (nine-slice borders, map markers, texture overlay).
  ui: {
    // Nine-slice top-left tile ids. Variants escalate with player progress:
    // default → blood (vial held) → bronze (key forged).
    panelBorder: 258,
    panelBorderBlood: 261,
    panelBorderBronze: 264,
    mapHereMarker: 306,
    mapBackground: 307,
    previewGrain: 308,
  },
} as const
