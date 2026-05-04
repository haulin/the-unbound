// Sprite ID registry (TIC-80 sprite sheet).
//
// Goal: keep all numeric IDs in one place so future sprite shuffles are cheap.

export const SPRITES = {
  tiles: {
    // Terrain / tiles
    mountains: 2,
    woods: 4,
    swamp: 6,
    plains: 8,
    gravel: 10,
    farm: 34,
    lake: 36,
    signpost: 42,
    rainbow: 76,
  },

  interactivePois: {
    locksmith: 66,
    henge: 68,
    town: 72, // castle/town
    camp: 74,
    gate: 78,
    gateOpen: 206,
  },

  buttons: {
    gold: 98,
    fight: 100,
    map: 102,
    troop: 104,
    return: 108,
    goal: 110,
    food: 130,
    beast: 132,
    scout: 134,
    rumorTip: 136,
    search: 138,
    minimap: 140, // "debug map" in sheet notes; used as minimap toggle
    restart: 142,
  },

  cosmetics: {
    farmBarn: 162,
    beastIllustration: 164,
    rumorIllustration: 168,
    campfireIcon: 170,
    tombstoneIllustration: 174,
    locksmithKiln: 194,
    marketStall: 200,
  },

  stats: {
    food: 226,
    enemy: 228,
    scout: 230,
    troop: 232,
    gold: 236,
    key: 238,
  },

  smallStats8x8: {
    seed: 234,
    position: 235,
    steps: 250,
  },

  ui8x8: {
    // Nine-slice 3x3, arranged as 3 columns x 3 rows (row stride is +16 sprite ids).
    panelBorder: {
      tl: 258,
      t: 259,
      tr: 260,
      l: 274,
      c: 275,
      r: 276,
      bl: 290,
      b: 291,
      br: 292,
    },
    panelBorderBronze: {
      tl: 261,
      t: 262,
      tr: 263,
      l: 277,
      c: 278,
      r: 279,
      bl: 293,
      b: 294,
      br: 295,
    },
    mapHereMarker: 306,
    mapBackground: 307,
    previewGrain: 308,
  },
} as const

