// title:  The Unbound (prototype 0.4.0)
// author: haulin
// desc:   Prototype 0.4.0 toward the North Star
// script: js
// input:  mouse

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 haulin
// See LICENSE for full text.


"use strict";
(() => {
  // src/core/lore.ts
  var GOAL_NARRATIVE = "The road never ends. It only returns.\nThey say there is a bronze gate that breaks the circle.\nYou mean to find out.";
  var LOST_COORD_LABEL = "??";
  var MAP_HINT_MESSAGE = "Map\nThe world, as best you can read it.";
  var BARKEEP_TIPS = {
    movementAndHunger: [
      "Most steps cost 1 ration. Mountains and swamps cost 2.",
      "If you don't have rations, your soldiers will start to starve."
    ],
    carryCapacity: [
      "You can only carry so many rations: 2 per soldier.",
      "A tame beast lets you carry 50 more rations.",
      "If you're already full, you can't buy more rations."
    ],
    lostAndOrientation: [
      "Woods and swamps can pull you off course.",
      "When lost, find a signpost, farm, or town to get your bearings again.",
      "What's nice about the Unbound is that everything is at most 10 leagues away."
    ],
    map: [
      "The map shows landmarks, not terrain.",
      "While lost, map only shows what you've found since you went off course."
    ],
    scout: [
      "A Scout halves your odds of getting lost in woods and swamps.",
      "When you're oriented, a Scout points out farms, camps, and henges.",
      "A scout can be hired in a Town - or, if you're lucky, around a Camp's fire."
    ],
    goal: [
      "Someone saw the Locksmith three nights ago.",
      "The Locksmith won't forge without the quench. Bring blood.",
      "The dragon in the high country bleeds, if you can reach it."
    ],
    wyrm: [
      "There's a dragon up in the high passes. Old as the stones.",
      "Don't go to the wyrm alone. Even with men, it's a near thing.",
      "You don't have to kill it. Just enough to draw the blood. It heals.",
      "Gold works on the wyrm too, they say. If you've got a lot of it.",
      "The cave with the long wind - that's where it sleeps."
    ],
    mule: [
      "A mule carries fifty more rations, but it'll take some of yours at every camp.",
      "Sell a tired mule at a Crossing if you can. Half what you paid is fair."
    ],
    healer: [
      "A hedge-healer can pull a soldier back from a bad day. She'll empty your purse, slowly.",
      "Some towns have one. She'll cost you a coin every time you stop in - bandages, herbs, the salve that smells of iron."
    ],
    boar: [
      "A trained boar does one thing well, and at the start of a fight. Don't expect it twice in a day.",
      "If you've a mule, a boar won't sit beside it. Pick one."
    ],
    captain: [
      "A banner makes the men fight straighter. It also makes them seen. Mind your woods and mountains.",
      "If you carry the colours, expect company on bad roads."
    ],
    fisherman: [
      "A fisherman doubles what a lake gives you. He's heavy gear though. You'll feel it if you run."
    ],
    magpie: [
      "A magpie palms a coin out of any honest trade. Roughly one in three. Pays for itself if you trade enough.",
      "Don't ask the farmer where she got it. She doesn't know either."
    ],
    crossing: [
      "Carrying too many companions? A Crossing will take one off your hands. Half what you paid is the going rate.",
      "Drovers at a Crossing buy from anyone. Beasts, banners, even people with somewhere else to be."
    ]
  };
  var GATE_LOCKED_LINES = [
    "A keyhole with no key. Not yet.",
    "Bronze, but unyielding. You will need the key.",
    "It does not open for hands. Only for the turning."
  ];
  var GATE_OPEN_LINES = [
    "The lock turns. The Unbound lets you pass.",
    "Bronze gives way. The road continues."
  ];
  var LOCKSMITH_PURCHASE_LINES = [
    "You feed the fire. They finish the key.",
    "A small hammer-song. A key, still warm.",
    "They take what you offer and give you what you came for.",
    "The blade plunges into the vial. The hiss is brief. The key is bronze and done.",
    "The quench is over before you can blink. The key cools in their palm."
  ];
  var LOCKSMITH_ENTER_LINES = [
    "The forge offers a key - for a price.",
    "Heat rolls out from the kiln. The smith waits."
  ];
  var LOCKSMITH_VISITED_LINES = [
    "The forge is cold. The work is done.",
    "Nothing left to make for you here."
  ];
  var LOCKSMITH_NO_FOOD_LINES = [
    "No heat, no key.",
    "Come back with enough. The fire needs feeding first.",
    "Others have paid for this before you. Most of them got further than you'd think."
  ];
  var TERRAIN_LORE_BY_KIND = {
    grass: [
      "The grass bends with your passing.",
      "You watch the wind arrive before you do.",
      "A soft field that does not care who crosses it."
    ],
    road: [
      "The road here remembers other feet.",
      "A track worn down by those who never stopped walking.",
      "The dust rises and settles like it has done this before."
    ],
    mountain: [
      "The peaks ahead do not look closer. Stone and thin air. Your supplies will feel it.",
      "Narrow passes. Notorious for ambushes.",
      "The wind here forgets to carry sound."
    ],
    swamp: [
      "Crossing the bog is harder than it looks. You'll need to eat well tonight.",
      "Mist clings. Landmarks lie. You hope you remember the way back.",
      "The reeds whisper. They have heard worse."
    ],
    woods: [
      "A path that isn't quite a path.",
      "Something moves between the trunks. You move faster.",
      "The trees rearrange themselves while you blink. You hope it is the wind."
    ]
  };
  var FARM_NAME_POOL = [
    "The Oast",
    "Burnt Acre",
    "Greyfield",
    "Hob's Reach",
    "The Stemming",
    "Fallow End",
    "Cotter's Rise"
  ];
  var CAMP_NAME_POOL = [
    "The Wayrest",
    "Ember Watch",
    "The Muster",
    "Cold Haven",
    "Ashford",
    "Dusk Halt",
    "The Holdfast"
  ];
  var HENGE_NAME_POOL = [
    "The Mending",
    "Old Insistence",
    "Crows' Argument",
    "The Recurring",
    "Patient Circle",
    "Weather Stones"
  ];
  var TOWN_NAME_POOL = [
    "Stonebridge",
    "Cinder Row",
    "Ember Crossroads",
    "The Long Return",
    "Market of Ash"
  ];
  var GATE_NAME = "The Gate";
  var LOCKSMITH_NAME = "Locksmith of the Unbound";
  var FARM_ENTER_LINES = [
    "The barn still trades - food for coin, and whatever the farmer has at hand for those with the purse for it.",
    "Stalls line the yard: rations, and a price scratched beside something else.",
    "Someone left this place open. Stock and prices are scratched on the door."
  ];
  var MULE_ALREADY_LINES = [
    "You already have a beast at heel. Another would be trouble.",
    "One is enough - the pen is closed to you.",
    "Your pack-beast is already yours. No second sale today."
  ];
  var FARM_BUY_FOOD_LINES = [
    "Sacks changed hands. The barn nod is all the thanks you get.",
    "Fair weight on the scale - you count every parcel twice.",
    "The trade is quick; hunger won't be, if you ration well."
  ];
  var MULE_BUY_LINES = [
    "Coins pass; a horned head lowers, then follows.",
    "The handler knots the lead - yours now, for better or worse.",
    "Lean muscle, patient eyes. It will carry more than you alone."
  ];
  var FISHING_LAKE_READY_LINES = [
    "A tug on the line. Supper tonight.",
    "The lake gives. You pack it away.",
    "Silver flicker - then weight. Rations secured."
  ];
  var FISHING_LAKE_COOLDOWN_LINES = [
    "The fish aren't biting. Not yet.",
    "Still water. Give it time.",
    "Nothing on the hook. Later, maybe."
  ];
  var RAINBOW_END_PAYOUT_LINES = [
    "The arc ends here - with weight in your purse.",
    "Light pools where the road stops. Coins find you.",
    "A small fortune in what the sky left behind - not for long, but enough."
  ];
  var RAINBOW_END_SPENT_LINES = [
    "Only a memory of color now. Nothing left to take.",
    "The rainbow has moved on. So should you.",
    "You already claimed what lingered here."
  ];
  var CAMP_RECRUIT_LINES = [
    "Stragglers around a dying fire. They fall in without a word.",
    "A few souls with nowhere better to be. They join you.",
    "They were waiting for someone. You'll do.",
    "No questions asked. No names given. Your ranks grow.",
    "They look like they've found something. So have you."
  ];
  var CAMP_EMPTY_LINES = [
    "The fire is cold. Give it time.",
    "Not yet. The road brings more, but not today.",
    "The word hasn't spread far enough yet. Return later."
  ];
  var HENGE_LORE_LINES = [
    "The circle remembers old debts.",
    "The stones do not ask why you are here.",
    "Whatever drew you here drew them first."
  ];
  var HENGE_EMPTY_LINES = [
    "The spirits here are quiet. Come back later.",
    "The circle is empty for now.",
    "You do not look back. You do not need to."
  ];
  var HENGE_ENCOUNTER_LINE = "You walked into something that was already happening.";
  var TOWN_ENTER_LINES = [
    "A market that learned to survive the loop.",
    "You smell bread, smoke, and old arguments.",
    "A place that pretends the road is straight."
  ];
  var TOWN_BUY_LINES = [
    "Coins change hands. You keep moving.",
    "No ceremony. Just trade."
  ];
  var TOWN_NO_GOLD_LINES = [
    "Not enough to pay.",
    "Your purse is light."
  ];
  var TOWN_SCOUT_HIRE_LINES = [
    "You pay. They fall in beside you.",
    "You pay in food. They lead the way.",
    `"When you have your bearings, I'll mark what matters."`,
    `"Woods and bog won't steal you as often with me ahead."`
  ];
  var TOWN_SCOUT_ALREADY_HAVE_LINES = [
    `"I'm already watching the road."`,
    '"You kept me for a reason. Let me do it."'
  ];
  var LOST_FLAVOR_LINES = [
    "The road loops. You do not.",
    "The horizon reads the same in every direction.",
    "Further than expected. Not where you were.",
    "Lost between one step and the next."
  ];
  var COMBAT_ENCOUNTER_LINES = [
    "They were already here.",
    "Company. The unwanted kind.",
    "This was always going to happen."
  ];
  var COMBAT_FLEE_EXIT_LINES = [
    "You left one of your own behind so the journey can continue.",
    "You turned away. Not everyone followed.",
    "You survived. That is not the same as winning."
  ];
  var COMBAT_VICTORY_EXIT_LINES = [
    "To the victor go the spoils.",
    "You took what you could and moved on.",
    "They will not follow you again."
  ];
  var GAME_OVER_LINES = [
    "The last of them fell somewhere you won't remember. The world keeps turning.",
    "You came with an army. You leave with nothing.\nThe gate remains closed.",
    "Alone now. The road goes on without you."
  ];

  // src/core/spriteIds.ts
  var SPRITES = {
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
      rainbow: 76
    },
    interactivePois: {
      locksmith: 66,
      henge: 68,
      town: 72,
      // castle/town
      camp: 74,
      gate: 78,
      gateOpen: 206
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
      minimap: 140,
      // "debug map" in sheet notes; used as minimap toggle
      restart: 142
    },
    cosmetics: {
      farmBarn: 162,
      beastIllustration: 164,
      rumorIllustration: 168,
      campfireIcon: 170,
      tombstoneIllustration: 174,
      locksmithKiln: 194,
      marketStall: 200
    },
    stats: {
      food: 226,
      enemy: 228,
      scout: 230,
      troop: 232,
      gold: 236,
      key: 238
    },
    smallStats8x8: {
      seed: 234,
      position: 235,
      steps: 250
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
        br: 292
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
        br: 295
      },
      mapHereMarker: 306,
      mapBackground: 307,
      previewGrain: 308
    }
  };

  // src/core/constants.ts
  var SCOUT_GLOBAL_REVEAL_KINDS = ["farm", "camp", "henge", "town"];
  var WORLD_WIDTH = 10;
  var WORLD_HEIGHT = 10;
  var INITIAL_SEED = 47;
  var ENABLE_ANIMATIONS = true;
  var SIGNPOST_COUNT = 6;
  var GATE_LOCKSMITH_MIN_DISTANCE = 7;
  var CAMP_COUNT = 3;
  var CAMP_COOLDOWN_MOVES = 3;
  var CAMP_FOOD_GAIN = 2;
  var TOWN_COUNT = 2;
  var TOWN_FOOD_BUNDLE = 3;
  var TOWN_TROOPS_BUNDLE = 2;
  var TOWN_PRICE_FOOD_MIN = 5;
  var TOWN_PRICE_FOOD_MAX = 8;
  var TOWN_PRICE_TROOPS_MIN = 5;
  var TOWN_PRICE_TROOPS_MAX = 10;
  var TOWN_PRICE_SCOUT_MIN = 10;
  var TOWN_PRICE_SCOUT_MAX = 15;
  var TOWN_PRICE_RUMOR_MIN = 2;
  var TOWN_PRICE_RUMOR_MAX = 4;
  var HENGE_COUNT = 3;
  var INITIAL_ARMY_SIZE = 10;
  var MAP_GEN_NOISE = "NOISE";
  var MAP_GEN_ALGORITHM = MAP_GEN_NOISE;
  var NOISE_SMOOTH_PASSES = 2;
  var NOISE_VALUE_MAX = 1e4;
  var INITIAL_FOOD = 15;
  var INITIAL_GOLD = 15;
  var FOOD_COST_DEFAULT = 1;
  var FOOD_COST_MOUNTAIN = 2;
  var FOOD_COST_SWAMP = 2;
  var FOOD_WARNING_THRESHOLD = 5;
  var FARM_COUNT = 3;
  var FISHING_LAKE_COUNT = 6;
  var FISHING_LAKE_COOLDOWN_MOVES = 3;
  var RAINBOW_END_MIN_DISTANCE = 7;
  var RAINBOW_END_GOLD_PAYOUT = 30;
  var FARM_BUY_FOOD_GOLD_COST = 3;
  var FARM_BUY_FOOD_AMOUNT = 3;
  var FARM_BEAST_GOLD_MIN = 10;
  var FARM_BEAST_GOLD_MAX = 15;
  var BEAST_CARRY_CAP_BONUS = 50;
  var LOCKSMITH_KEY_FOOD_COST = 10;
  var LOCKSMITH_KEY_GOLD_COST = 20;
  var TERRAIN_KINDS = ["grass", "road", "mountain", "grass", "swamp", "woods", "road"];
  var FEATURE_KINDS = [
    "gate",
    "gateOpen",
    "locksmith",
    "signpost",
    "farm",
    "camp",
    "henge",
    "town",
    "fishingLake",
    "rainbowEnd"
  ];
  var TERRAIN = {
    grass: { spriteId: SPRITES.tiles.plains },
    road: { spriteId: SPRITES.tiles.gravel },
    mountain: { spriteId: SPRITES.tiles.mountains },
    swamp: { spriteId: SPRITES.tiles.swamp },
    woods: { spriteId: SPRITES.tiles.woods }
  };
  var FEATURES = {
    gate: { spriteId: SPRITES.interactivePois.gate },
    gateOpen: { spriteId: SPRITES.interactivePois.gateOpen },
    locksmith: { spriteId: SPRITES.interactivePois.locksmith },
    signpost: { spriteId: SPRITES.tiles.signpost },
    farm: { spriteId: SPRITES.tiles.farm },
    camp: { spriteId: SPRITES.interactivePois.camp },
    henge: { spriteId: SPRITES.interactivePois.henge },
    town: { spriteId: SPRITES.interactivePois.town },
    fishingLake: { spriteId: SPRITES.tiles.lake },
    rainbowEnd: { spriteId: SPRITES.tiles.rainbow }
  };
  function spriteIdForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "swamp":
      case "woods":
        return TERRAIN[kind].spriteId;
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
      case "town":
      case "fishingLake":
      case "rainbowEnd":
        return FEATURES[kind].spriteId;
    }
  }
  function terrainLoreLinesForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "swamp":
      case "woods":
        return TERRAIN_LORE_BY_KIND[kind];
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
      case "town":
      case "fishingLake":
      case "rainbowEnd":
        return [];
    }
  }
  var FOOD_DELTA_FRAMES = 24;
  var WOODS_AMBUSH_PERCENT = 15;
  var WOODS_LOST_PERCENT = 10;
  var MOUNTAIN_AMBUSH_PERCENT = 25;
  var SWAMP_LOST_PERCENT = 20;
  var TELEPORT_MIN_DISTANCE = 4;
  var COMBAT_GOLD_REWARD_MIN = 8;
  var COMBAT_GOLD_REWARD_MAX = 20;
  var COMBAT_FOOD_BONUS_MAX = 4;
  var GRID_TRANSITION_STEP_FRAMES = 5;
  var HENGE_COOLDOWN_MOVES = 3;
  var ACTION_NEW_RUN = "NEW_RUN";
  var ACTION_RESTART = "RESTART";
  var ACTION_MOVE = "MOVE";
  var ACTION_SHOW_GOAL = "SHOW_GOAL";
  var ACTION_TOGGLE_MINIMAP = "TOGGLE_MINIMAP";
  var ACTION_TOGGLE_MAP = "TOGGLE_MAP";
  var ACTION_TICK = "TICK";
  var MOVE_SLIDE_FRAMES = 15;
  var LORE_MAX_CHARS_PER_LINE = 19;

  // src/core/math.ts
  function wrapIndex(i, size) {
    const r = i % size;
    return r < 0 ? r + size : r;
  }
  function torusDelta(from, to, size) {
    const raw = to - from;
    const a = raw;
    const b = raw - size;
    const c = raw + size;
    let best = a;
    for (const cand of [b, c]) {
      if (Math.abs(cand) < Math.abs(best)) best = cand;
      else if (Math.abs(cand) === Math.abs(best) && cand > best) best = cand;
    }
    return best;
  }
  function manhattan(dx, dy) {
    return Math.abs(dx) + Math.abs(dy);
  }
  function dirLabel(dx, dy) {
    let s = "";
    if (dy < 0) s += "N";
    else if (dy > 0) s += "S";
    if (dx < 0) s += "W";
    else if (dx > 0) s += "E";
    return s;
  }

  // src/core/cells.ts
  function getCellAt(world, pos) {
    return world.cells[pos.y][pos.x];
  }
  function getSpriteIdAt(world, x, y) {
    const tx = wrapIndex(x, world.width);
    const ty = wrapIndex(y, world.height);
    const cell = world.cells[ty][tx];
    return spriteIdForKind(cell.kind);
  }
  function cellIdForPos(world, pos) {
    return pos.y * world.width + pos.x;
  }
  function setCellAt(world, pos, nextCell) {
    const cells = world.cells;
    const row = cells[pos.y];
    const nextRow = row.slice();
    nextRow[pos.x] = nextCell;
    const nextCells = cells.slice();
    nextCells[pos.y] = nextRow;
    return { ...world, cells: nextCells };
  }
  function findCellByKind(cells, kind) {
    for (let y = 0; y < cells.length; y++) {
      const row = cells[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x].kind === kind) return { x, y };
      }
    }
    return null;
  }

  // src/core/rng.ts
  function xorshift32(x) {
    x = x >>> 0;
    x ^= x << 13 >>> 0;
    x ^= x >>> 17;
    x ^= x << 5 >>> 0;
    return x >>> 0;
  }
  function u32(x) {
    return x >>> 0;
  }
  function seedToRngState(seed) {
    let s = (seed ^ 2779096485) >>> 0;
    if (s === 0) s = 1;
    return s;
  }
  function normalizeMaxExclusive(maxExclusive) {
    if (!Number.isFinite(maxExclusive)) return 1;
    const n = Math.trunc(maxExclusive);
    return n <= 0 ? 1 : n;
  }
  function randInt(rngState, maxExclusive) {
    const next = xorshift32(u32(rngState));
    const m = normalizeMaxExclusive(maxExclusive);
    return { rngState: next, value: next % m };
  }
  function hashSeedStepCellInternal(opts) {
    const base = seedToRngState(opts.seed | 0);
    const stepMix = u32(Math.imul(opts.stepCount | 0, 2654435761));
    const cellId2 = u32(opts.cellId | 0);
    const salt = u32(opts.salt == null ? 0 : opts.salt | 0);
    return xorshift32(u32(base ^ stepMix ^ cellId2 ^ salt));
  }
  function pickIndex(state2, length) {
    const m = length | 0;
    if (m <= 0) return 0;
    const h = hashSeedStepCellInternal(state2);
    return u32(h) % m;
  }
  function pickIntExclusive(state2, maxExclusive) {
    const m = normalizeMaxExclusive(maxExclusive);
    const h = hashSeedStepCellInternal(state2);
    return u32(h) % m;
  }
  function pickIntInRange(state2, minInclusive, maxInclusive) {
    const span = maxInclusive - minInclusive + 1;
    return minInclusive + pickIntExclusive(state2, span);
  }
  function pickFromPool(state2, pool) {
    if (!pool.length) return void 0;
    return pool[pickIndex(state2, pool.length)];
  }
  function shuffledIndices(args) {
    const n = Number.isFinite(args.length) ? Math.trunc(args.length) : 0;
    if (n <= 0) return [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(i);
    if (n <= 1) return out;
    const baseSalt = args.salt == null ? 0 : args.salt | 0;
    const cellId2 = n | 0;
    for (let i = n - 1; i > 0; i--) {
      const j = pickIntExclusive({ seed: args.seed, stepCount: 0, cellId: cellId2, salt: baseSalt ^ i }, i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
  function stable(args) {
    const { seed, placeId, pool, salt } = args;
    if (!pool.length) return "";
    const state2 = salt == null ? { seed, stepCount: 0, cellId: placeId } : { seed, stepCount: 0, cellId: placeId, salt };
    return pickFromPool(state2, pool) || pool[0] || "";
  }
  function perMove(args) {
    const { seed, stepCount, cellId: cellId2, pool, salt } = args;
    if (!pool.length) return "";
    const state2 = salt == null ? { seed, stepCount, cellId: cellId2 } : { seed, stepCount, cellId: cellId2, salt };
    return pickFromPool(state2, pool) || pool[0] || "";
  }
  function cursorAdvance(args) {
    const { seed, pool } = args;
    const n = pool.length;
    if (n <= 0) return { line: "", nextCursor: args.cursor };
    const indices = args.salt == null ? shuffledIndices({ seed, length: n }) : shuffledIndices({ seed, length: n, salt: args.salt });
    const idx = indices[args.cursor % n] ?? 0;
    const line = pool[idx] || pool[0] || "";
    return { line, nextCursor: args.cursor + 1 };
  }
  function getCopyCursors(run) {
    return run.copyCursors ?? {};
  }
  function advanceRunCursor(args) {
    const cursors = getCopyCursors(args.run);
    const cursor = cursors[args.tag] ?? 0;
    const pick = args.salt == null ? cursorAdvance({ seed: args.seed, cursor, pool: args.pool }) : cursorAdvance({ seed: args.seed, cursor, pool: args.pool, salt: args.salt });
    const nextCursors = { ...cursors, [args.tag]: pick.nextCursor };
    return { line: pick.line, run: { ...args.run, copyCursors: nextCursors } };
  }
  function createTileRandom(args) {
    const seed = args.world.seed;
    const cellId2 = cellIdForPos(args.world, args.pos);
    const stepCount = args.stepCount;
    return {
      stableLine: (pool, opts) => opts?.salt == null ? stable({ seed, placeId: opts?.placeId ?? cellId2, pool }) : stable({ seed, placeId: opts?.placeId ?? cellId2, pool, salt: opts.salt }),
      perMoveLine: (pool, opts) => opts?.salt == null ? perMove({ seed, stepCount, cellId: opts?.cellId ?? cellId2, pool }) : perMove({ seed, stepCount, cellId: opts?.cellId ?? cellId2, pool, salt: opts.salt })
    };
  }
  function createRunCopyRandom(state2) {
    const seed = state2.world.seed;
    const stepCount = state2.run.stepCount;
    const cellId2 = cellIdForPos(state2.world, state2.player.position);
    return {
      stableLine: (pool, opts) => opts?.salt == null ? stable({ seed, placeId: opts?.placeId ?? cellId2, pool }) : stable({ seed, placeId: opts?.placeId ?? cellId2, pool, salt: opts.salt }),
      perMoveLine: (pool, opts) => opts?.salt == null ? perMove({ seed, stepCount: opts?.stepCount ?? stepCount, cellId: opts?.cellId ?? cellId2, pool }) : perMove({ seed, stepCount: opts?.stepCount ?? stepCount, cellId: opts?.cellId ?? cellId2, pool, salt: opts.salt }),
      advanceCursor: (tag, pool, opts) => {
        const next = opts?.salt == null ? advanceRunCursor({ run: state2.run, seed, tag, pool }) : advanceRunCursor({ run: state2.run, seed, tag, pool, salt: opts.salt });
        return { line: next.line, nextState: { ...state2, run: next.run } };
      }
    };
  }
  function createStreamRandom(rngState) {
    let rng = rngState;
    const intExclusive = (maxExclusive) => {
      const r = randInt(rng, maxExclusive);
      rng = r.rngState;
      return r.value;
    };
    return {
      intExclusive,
      // Inclusive on both ends. Callers pass ordered (min ≤ max) constants;
      // we don't normalize because the only places this is used pair compile-
      // time literals like FOO_MIN/FOO_MAX.
      intInRange: (minInclusive, maxInclusive) => minInclusive + intExclusive(maxInclusive - minInclusive + 1),
      get rngState() {
        return rng;
      }
    };
  }
  function createStreamRandomFromSeed(seed) {
    return createStreamRandom(seedToRngState(seed));
  }
  var RNG = {
    // Facades (preferred)
    createTileRandom,
    createRunCopyRandom,
    createStreamRandom,
    createStreamRandomFromSeed,
    // Keyed deterministic helpers (stable, no global rngState consumption).
    keyedIntExclusive: pickIntExclusive,
    keyedIntInRange: pickIntInRange
  };

  // src/core/gameOver.ts
  function gameOverMessage(seed, stepCount) {
    if (!GAME_OVER_LINES.length) return "";
    const idx = RNG.keyedIntExclusive({ seed, stepCount, cellId: 0 }, GAME_OVER_LINES.length);
    return GAME_OVER_LINES[idx] ?? "";
  }

  // src/core/mechanics/registry.ts
  function buildMechanicIndex(mechanics) {
    const seenIds = /* @__PURE__ */ new Set();
    const ownerByKind = {};
    const onEnterTileByKind2 = {};
    const rightGridByEncounterKind2 = {};
    const reduceEncounterActionByEncounterKind2 = {};
    const previewPlateByEncounterKind = {};
    const previewPlateDeltaAnchorsByEncounterKind = {};
    const previewEncounterByEncounterKind = {};
    const poiSignpostByKind = {};
    const mapLabelByKind = {};
    const enterFoodCostByKind2 = {};
    const moveEventPolicyByKind = {};
    const seenEncounterKinds = /* @__PURE__ */ new Set();
    for (let i = 0; i < mechanics.length; i++) {
      const m = mechanics[i];
      if (seenIds.has(m.id)) {
        throw new Error(`Duplicate mechanic id: ${m.id}`);
      }
      seenIds.add(m.id);
      if (m.encounter) {
        const ek = m.encounter.kind;
        if (seenEncounterKinds.has(ek)) {
          throw new Error(`Duplicate encounterKind: ${ek}`);
        }
        seenEncounterKinds.add(ek);
        if (m.encounter.rightGrid) rightGridByEncounterKind2[ek] = m.encounter.rightGrid;
        if (m.encounter.reduceAction) reduceEncounterActionByEncounterKind2[ek] = m.encounter.reduceAction;
        if (m.encounter.previewPlate) previewPlateByEncounterKind[ek] = m.encounter.previewPlate;
        if (m.encounter.previewPlateDeltaAnchors) {
          previewPlateDeltaAnchorsByEncounterKind[ek] = m.encounter.previewPlateDeltaAnchors;
        }
        if (m.encounter.previewEncounter) previewEncounterByEncounterKind[ek] = m.encounter.previewEncounter;
      }
      const costByKind = m.enterFoodCostByKind;
      if (costByKind) {
        for (const kindKey of Object.keys(costByKind)) {
          if (!m.kinds.includes(kindKey)) {
            throw new Error(`Mechanic ${m.id} sets enterFoodCostByKind for ${kindKey} but does not claim that kind`);
          }
          const cost = costByKind[kindKey];
          if (cost < 0) {
            throw new Error(`enterFoodCostByKind for ${kindKey} must be >= 0`);
          }
        }
      }
      const policyByKind = m.moveEventPolicyByKind;
      if (policyByKind) {
        for (const kindKey of Object.keys(policyByKind)) {
          if (!m.kinds.includes(kindKey)) {
            throw new Error(`Mechanic ${m.id} sets moveEventPolicyByKind for ${kindKey} but does not claim that kind`);
          }
          const policy = policyByKind[kindKey];
          const ambushPercent = policy.ambushPercent;
          const lostPercent = policy.lostPercent;
          if (ambushPercent < 0 || lostPercent < 0 || ambushPercent > 100 || lostPercent > 100 || ambushPercent + lostPercent > 100) {
            throw new Error(
              `MoveEventPolicy for ${kindKey} must have ambushPercent and lostPercent in [0, 100] with sum <= 100`
            );
          }
        }
      }
      for (let k = 0; k < m.kinds.length; k++) {
        const kind = m.kinds[k];
        const prevOwner = ownerByKind[kind];
        if (prevOwner) {
          throw new Error(`Duplicate kind ownership: ${kind} claimed by ${prevOwner} and ${m.id}`);
        }
        ownerByKind[kind] = m.id;
        if (m.onEnterTile) onEnterTileByKind2[kind] = m.onEnterTile;
        if (m.mapLabel != null) mapLabelByKind[kind] = m.mapLabel;
        if (m.poiSignpost) poiSignpostByKind[kind] = m.poiSignpost;
        const cost = costByKind?.[kind];
        if (cost != null) enterFoodCostByKind2[kind] = cost;
        const policy = policyByKind?.[kind];
        if (policy) moveEventPolicyByKind[kind] = policy;
      }
    }
    return {
      ownerByKind,
      onEnterTileByKind: onEnterTileByKind2,
      rightGridByEncounterKind: rightGridByEncounterKind2,
      reduceEncounterActionByEncounterKind: reduceEncounterActionByEncounterKind2,
      previewPlateByEncounterKind,
      previewPlateDeltaAnchorsByEncounterKind,
      previewEncounterByEncounterKind,
      poiSignpostByKind,
      mapLabelByKind,
      enterFoodCostByKind: enterFoodCostByKind2,
      moveEventPolicyByKind
    };
  }

  // src/core/worldgen.ts
  var TERRAIN_KIND_SET = new Set(TERRAIN_KINDS);
  function isTerrainCell(cell) {
    return TERRAIN_KIND_SET.has(cell.kind);
  }
  function cellId(x, y) {
    return cellIdForPos({ width: WORLD_WIDTH }, { x, y });
  }
  function torusManhattanDistance(a, b) {
    const dx = torusDelta(a.x, b.x, WORLD_WIDTH);
    const dy = torusDelta(a.y, b.y, WORLD_HEIGHT);
    return manhattan(dx, dy);
  }
  function clampMinTorusDistance(minDistance) {
    const maxPossible = Math.floor(WORLD_WIDTH / 2) + Math.floor(WORLD_HEIGHT / 2);
    return Math.max(0, Math.min(minDistance, maxPossible));
  }
  function placeFeature(cells, rngState, opts) {
    const placed = [];
    const rng = RNG.createStreamRandom(rngState);
    const minD = opts.awayFrom ? clampMinTorusDistance(opts.awayFrom.minDistance) : 0;
    while (placed.length < opts.count) {
      const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT);
      const x = v % WORLD_WIDTH;
      const y = Math.floor(v / WORLD_WIDTH);
      const here = cells[y][x];
      if (!opts.canPlaceAt(x, y, here)) continue;
      if (opts.awayFrom && torusManhattanDistance({ x, y }, opts.awayFrom.pos) < minD) continue;
      cells[y][x] = opts.buildCell({ x, y, rng });
      placed.push({ x, y });
    }
    return { placed, rngState: rng.rngState };
  }
  function placeNamedFeature(cells, rngState, opts) {
    const remainingNames = [...opts.namePool];
    const res = placeFeature(cells, rngState, {
      count: opts.count,
      canPlaceAt: opts.canPlaceAt,
      buildCell: ({ x, y, rng }) => {
        let name = opts.fallbackName;
        if (remainingNames.length > 0) {
          const idx = rng.intExclusive(remainingNames.length);
          name = remainingNames.splice(idx, 1)[0] || opts.fallbackName;
        }
        return opts.buildCell({ x, y, name, rng });
      }
    });
    return res.rngState;
  }

  // src/core/mechanics/defs/gate.ts
  var onEnterGate = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "gate" && cell.kind !== "gateOpen") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    if (!resources.hasBronzeKey) {
      const line2 = r.perMoveLine(GATE_LOCKED_LINES);
      return { message: `${GATE_NAME}
${line2}` };
    }
    const nextWorld = cell.kind === "gateOpen" ? world : setCellAt(world, pos, { kind: "gateOpen" });
    const line = r.perMoveLine(GATE_OPEN_LINES);
    return { world: nextWorld, hasWon: true, message: `${GATE_NAME}
${line}` };
  };
  var placeGate = ({ cells, rngState }) => {
    const res = placeFeature(cells, rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: () => ({ kind: "gate" })
    });
    return { rngState: res.rngState };
  };
  var gateMechanic = {
    id: "gate",
    kinds: ["gate", "gateOpen"],
    mapLabel: "G",
    onEnterTile: onEnterGate,
    poiSignpost: {
      rank: 0,
      name: () => GATE_NAME
    },
    placeWorld: placeGate
  };

  // src/core/uiAnim.ts
  function enqueueAnim(ui, anim) {
    const id = Math.max(1, Math.trunc(ui.anim.nextId));
    const a = { id, ...anim };
    const nextActive = ui.anim.active.concat([a]);
    return {
      message: ui.message,
      leftPanel: ui.leftPanel,
      clock: ui.clock,
      anim: { nextId: id + 1, active: nextActive }
    };
  }
  function enqueueGridTransition(ui, args) {
    const phaseCount = 5;
    const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0);
    const durationFrames = stepFrames * phaseCount;
    const startFrame = args.startFrame ?? ui.clock.frame;
    return enqueueAnim(ui, {
      kind: "gridTransition",
      startFrame,
      durationFrames,
      blocksInput: true,
      params: { from: args.from, to: args.to }
    });
  }
  function enqueueDeltas(ui, args) {
    const startFrame = args.startFrame ?? ui.clock.frame;
    let next = ui;
    for (let i = 0; i < args.deltas.length; i++) {
      const delta = args.deltas[i];
      if (!delta) continue;
      next = enqueueAnim(next, {
        kind: "delta",
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: args.target, delta }
      });
    }
    return next;
  }

  // src/core/mechanics/encounterHelpers.ts
  function setEncounterMessage(state2, prefix, line) {
    return { ...state2, ui: { ...state2.ui, message: `${prefix}
${line}` } };
  }
  function noGoldResponse(state2, prefix, cellId2) {
    const rnd = RNG.createRunCopyRandom(state2);
    const line = rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: cellId2 });
    return setEncounterMessage(state2, prefix, line);
  }
  function leaveEncounter(state2, fromGrid) {
    const enc = state2.encounter;
    const restore = enc?.restoreMessage ?? state2.ui.message;
    const baseUi = { ...state2.ui, message: restore };
    if (!ENABLE_ANIMATIONS) {
      return { ...state2, encounter: null, ui: baseUi };
    }
    const uiWith = enqueueGridTransition(baseUi, { from: fromGrid, to: "overworld" });
    return { ...state2, encounter: null, ui: uiWith };
  }
  function applyDeltas(state2, args) {
    const baseUi = { ...state2.ui, message: args.message };
    const baseNext = {
      ...state2,
      ...args.resources ? { resources: args.resources } : {},
      ...args.run ? { run: args.run } : {},
      ui: baseUi
    };
    if (!ENABLE_ANIMATIONS) return baseNext;
    let uiWith = baseUi;
    for (let i = 0; i < args.deltas.length; i++) {
      const d = args.deltas[i];
      uiWith = enqueueDeltas(uiWith, { target: d.target, deltas: [d.delta] });
    }
    return { ...baseNext, ui: uiWith };
  }
  function buy(resources, spec) {
    const goldCost = spec.gold ?? 0;
    const foodCost = spec.food ?? 0;
    if (resources.gold < goldCost || resources.food < foodCost) return { outcome: "noFunds" };
    const gain = spec.gain;
    const foodGain = gain.food ?? 0;
    const armyGain = gain.armySize ?? 0;
    const next = {
      ...resources,
      gold: resources.gold - goldCost,
      food: resources.food - foodCost + foodGain,
      armySize: resources.armySize + armyGain,
      ...gain.hasBronzeKey ? { hasBronzeKey: true } : {},
      ...gain.hasScout ? { hasScout: true } : {},
      ...gain.hasTameBeast ? { hasTameBeast: true } : {}
    };
    const deltas = [];
    if (goldCost) deltas.push({ target: "gold", delta: -goldCost });
    const netFood = foodGain - foodCost;
    if (netFood) deltas.push({ target: "food", delta: netFood });
    if (armyGain) deltas.push({ target: "army", delta: armyGain });
    return { outcome: "ok", resources: next, deltas };
  }
  function applyEnterAnims(ui, anims, startFrame) {
    let next = ui;
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      const offset = a.afterFrames ?? 0;
      next = enqueueGridTransition(next, { from: a.from, to: a.to, startFrame: startFrame + offset });
    }
    return next;
  }

  // src/core/mechanics/defs/locksmith.ts
  var ACTION_LOCKSMITH_PAY_GOLD = "LOCKSMITH_PAY_GOLD";
  var ACTION_LOCKSMITH_PAY_FOOD = "LOCKSMITH_PAY_FOOD";
  var ACTION_LOCKSMITH_LEAVE = "LOCKSMITH_LEAVE";
  var onEnterLocksmith = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "locksmith") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    if (resources.hasBronzeKey) {
      const line2 = r.perMoveLine(LOCKSMITH_VISITED_LINES);
      return { message: `${LOCKSMITH_NAME}
${line2}` };
    }
    const line = r.stableLine(LOCKSMITH_ENTER_LINES);
    const message = `${LOCKSMITH_NAME}
${line}`;
    const cellId2 = cellIdForPos(world, pos);
    const encounter = {
      kind: "locksmith",
      sourceCellId: cellId2,
      restoreMessage: message
    };
    const result = {
      message,
      encounter,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: "locksmith" }]
    };
    return result;
  };
  var reduceLocksmithAction = (prevState, action) => {
    if (action.type !== ACTION_LOCKSMITH_PAY_GOLD && action.type !== ACTION_LOCKSMITH_PAY_FOOD && action.type !== ACTION_LOCKSMITH_LEAVE) {
      return null;
    }
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "locksmith") return prevState;
    if (action.type === ACTION_LOCKSMITH_LEAVE) return leaveEncounter(prevState, "locksmith");
    if (action.type === ACTION_LOCKSMITH_PAY_GOLD) return reduceLocksmithPayGold(prevState, enc.sourceCellId);
    return reduceLocksmithPayFood(prevState);
  };
  function reduceLocksmithPayGold(prevState, sourceCellId) {
    const rnd = RNG.createRunCopyRandom(prevState);
    const result = buy(prevState.resources, { gold: LOCKSMITH_KEY_GOLD_COST, gain: { hasBronzeKey: true } });
    if (result.outcome === "noFunds") {
      return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: sourceCellId }));
    }
    return applyDeltas(prevState, {
      resources: result.resources,
      message: `${LOCKSMITH_NAME}
${rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)}`,
      deltas: result.deltas
    });
  }
  var placeLocksmith = ({ cells, rngState }) => {
    const gatePos = findCellByKind(cells, "gate");
    if (!gatePos) throw new Error("placeLocksmith: gate must be placed before locksmith");
    const res = placeFeature(cells, rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      awayFrom: { pos: gatePos, minDistance: GATE_LOCKSMITH_MIN_DISTANCE },
      buildCell: () => ({ kind: "locksmith" })
    });
    return { rngState: res.rngState };
  };
  var locksmithPreviewPlate = () => {
    const lines = [
      { spriteId: SPRITES.stats.gold, text: `-${LOCKSMITH_KEY_GOLD_COST}` },
      { spriteId: SPRITES.stats.food, text: `-${LOCKSMITH_KEY_FOOD_COST}` }
    ];
    return lines;
  };
  function reduceLocksmithPayFood(prevState) {
    const rnd = RNG.createRunCopyRandom(prevState);
    const result = buy(prevState.resources, { food: LOCKSMITH_KEY_FOOD_COST, gain: { hasBronzeKey: true } });
    if (result.outcome === "noFunds") {
      return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_NO_FOOD_LINES));
    }
    return applyDeltas(prevState, {
      resources: result.resources,
      message: `${LOCKSMITH_NAME}
${rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)}`,
      deltas: result.deltas
    });
  }
  var locksmithMechanic = {
    id: "locksmith",
    kinds: ["locksmith"],
    mapLabel: "L",
    onEnterTile: onEnterLocksmith,
    poiSignpost: {
      rank: 10,
      name: () => LOCKSMITH_NAME
    },
    placeWorld: placeLocksmith,
    encounter: {
      kind: "locksmith",
      reduceAction: reduceLocksmithAction,
      previewPlate: locksmithPreviewPlate,
      previewEncounter: () => ({ kind: "locksmith", sourceCellId: -1, restoreMessage: "" }),
      rightGrid: (_s, row, col) => {
        if (row === 0 && col === 1)
          return { spriteId: SPRITES.buttons.gold, action: { type: ACTION_LOCKSMITH_PAY_GOLD } };
        if (row === 1 && col === 0)
          return { spriteId: SPRITES.buttons.food, action: { type: ACTION_LOCKSMITH_PAY_FOOD } };
        if (row === 1 && col === 2)
          return { spriteId: SPRITES.buttons.return, action: { type: ACTION_LOCKSMITH_LEAVE } };
        if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.locksmithKiln, action: null };
        return { action: null };
      }
    }
  };

  // src/core/signpost.ts
  var SIGNPOST_MIN_TARGET_DISTANCE = 2;
  function formatNearestPoiSignpostMessage(playerPos, world) {
    const cells = world.cells;
    const poiSignpostByKind = MECHANIC_INDEX.poiSignpostByKind;
    const candidates = [];
    for (let y = 0; y < cells.length; y++) {
      const row = cells[y];
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        const contribution = poiSignpostByKind[cell.kind];
        if (!contribution) continue;
        candidates.push({
          rank: contribution.rank,
          cellSerial: y * world.width + x,
          name: contribution.name(cell),
          pos: { x, y }
        });
      }
    }
    if (candidates.length === 0) return "";
    function evalCandidate(c) {
      const dx = torusDelta(playerPos.x, c.pos.x, world.width);
      const dy = torusDelta(playerPos.y, c.pos.y, world.height);
      return { ...c, dx, dy, d: manhattan(dx, dy) };
    }
    function isBetter(a, b) {
      if (a.d !== b.d) return a.d < b.d;
      if (a.rank !== b.rank) return a.rank < b.rank;
      return a.cellSerial < b.cellSerial;
    }
    let bestAny = null;
    let bestFar = null;
    for (let i = 0; i < candidates.length; i++) {
      const e = evalCandidate(candidates[i]);
      if (!bestAny || isBetter(e, bestAny)) bestAny = e;
      if (e.d > SIGNPOST_MIN_TARGET_DISTANCE && (!bestFar || isBetter(e, bestFar))) bestFar = e;
    }
    const chosen = bestFar || bestAny;
    const dir = dirLabel(chosen.dx, chosen.dy);
    return `${chosen.name}
${dir}, ${chosen.d} leagues away.`;
  }

  // src/core/mechanics/defs/signpost.ts
  var onEnterSignpost = ({ world, pos }) => ({
    message: formatNearestPoiSignpostMessage(pos, world),
    knowsPosition: true
  });
  var placeSignposts = ({ cells, rngState }) => {
    const res = placeFeature(cells, rngState, {
      count: SIGNPOST_COUNT,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: () => ({ kind: "signpost" })
    });
    return { rngState: res.rngState };
  };
  var signpostMechanic = {
    id: "signpost",
    kinds: ["signpost"],
    onEnterTile: onEnterSignpost,
    placeWorld: placeSignposts
  };

  // src/core/foodCarry.ts
  function foodCarryCap(res) {
    const cap = 2 * Math.max(0, Math.trunc(res.armySize));
    return res.hasTameBeast ? cap + BEAST_CARRY_CAP_BONUS : cap;
  }
  function clampFoodToCarryCap(res) {
    return Math.min(res.food, foodCarryCap(res));
  }
  var FOOD_CARRY_FULL_MESSAGE = "You can't carry more food.";
  function resourcesWithClampedFoodIfNeeded(res) {
    const food = clampFoodToCarryCap(res);
    if (food === res.food) return res;
    return { ...res, food };
  }

  // src/core/mechanics/defs/farm.ts
  var ACTION_FARM_BUY_FOOD = "FARM_BUY_FOOD";
  var ACTION_FARM_BUY_BEAST = "FARM_BUY_BEAST";
  var ACTION_FARM_LEAVE = "FARM_LEAVE";
  function farmPrefix(farm) {
    const name = farm.name || "A Farm";
    return `${name} Farm`;
  }
  var onEnterFarm = ({ cell, world, pos, stepCount }) => {
    if (cell.kind !== "farm") return {};
    const farmCell = getCellAt(world, pos);
    if (!farmCell || farmCell.kind !== "farm") return {};
    const name = farmCell.name || "A Farm";
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.stableLine(FARM_ENTER_LINES, { placeId: farmCell.id });
    const message = `${name} Farm
${line}`;
    const cellId2 = cellIdForPos(world, pos);
    const encounter = {
      kind: "farm",
      sourceCellId: cellId2,
      restoreMessage: message
    };
    const result = {
      message,
      knowsPosition: true,
      encounter,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: "farm" }]
    };
    return result;
  };
  var reduceFarmAction = (prevState, action) => {
    if (action.type !== ACTION_FARM_BUY_FOOD && action.type !== ACTION_FARM_BUY_BEAST && action.type !== ACTION_FARM_LEAVE) {
      return null;
    }
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "farm") return prevState;
    if (action.type === ACTION_FARM_LEAVE) return leaveEncounter(prevState, "farm");
    const farm = getCellAt(prevState.world, prevState.player.position);
    if (action.type === ACTION_FARM_BUY_FOOD) return reduceFarmBuyFood(prevState, farm);
    return reduceFarmBuyBeast(prevState, farm);
  };
  function reduceFarmBuyFood(prevState, farm) {
    const prefix = farmPrefix(farm);
    if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
      return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE);
    }
    const result = buy(prevState.resources, { gold: FARM_BUY_FOOD_GOLD_COST, gain: { food: FARM_BUY_FOOD_AMOUNT } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, prefix, farm.id);
    const clamped = resourcesWithClampedFoodIfNeeded(result.resources);
    const appliedFoodDelta = clamped.food - prevState.resources.food;
    const deltas = result.deltas.map((d) => d.target === "food" ? { ...d, delta: appliedFoodDelta } : d);
    const pick = RNG.createRunCopyRandom(prevState).advanceCursor("farm.buyFoodFeedback", FARM_BUY_FOOD_LINES);
    return applyDeltas(prevState, {
      resources: clamped,
      run: pick.nextState.run,
      message: `${prefix}
${pick.line}`,
      deltas
    });
  }
  var placeNamedFarms = ({ cells, rngState }) => {
    const next = placeNamedFeature(cells, rngState, {
      count: FARM_COUNT,
      namePool: FARM_NAME_POOL,
      fallbackName: "A Farm",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name, rng }) => {
        const beastGoldCost = rng.intInRange(FARM_BEAST_GOLD_MIN, FARM_BEAST_GOLD_MAX);
        return { kind: "farm", id: cellId(x, y), name, beastGoldCost };
      }
    });
    return { rngState: next };
  };
  var farmPreviewPlate = (s) => {
    const here = getCellAt(s.world, s.player.position);
    if (!here || here.kind !== "farm") return null;
    const lines = [
      { spriteId: SPRITES.stats.food, text: `-${FARM_BUY_FOOD_GOLD_COST}` },
      { spriteId: SPRITES.cosmetics.beastIllustration, text: `-${here.beastGoldCost}` }
    ];
    return lines;
  };
  function reduceFarmBuyBeast(prevState, farm) {
    const prefix = farmPrefix(farm);
    const rnd = RNG.createRunCopyRandom(prevState);
    if (prevState.resources.hasTameBeast) {
      return setEncounterMessage(prevState, prefix, rnd.perMoveLine(MULE_ALREADY_LINES, { cellId: farm.id }));
    }
    const result = buy(prevState.resources, { gold: farm.beastGoldCost, gain: { hasTameBeast: true } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, prefix, farm.id);
    return applyDeltas(prevState, {
      resources: result.resources,
      message: `${prefix}
${rnd.perMoveLine(MULE_BUY_LINES, { cellId: farm.id })}`,
      deltas: result.deltas
    });
  }
  var farmMechanic = {
    id: "farm",
    kinds: ["farm"],
    mapLabel: "F",
    onEnterTile: onEnterFarm,
    poiSignpost: {
      rank: 20,
      name: (cell) => `${cell.name || "A Farm"} Farm`
    },
    placeWorld: placeNamedFarms,
    encounter: {
      kind: "farm",
      reduceAction: reduceFarmAction,
      previewPlate: farmPreviewPlate,
      previewEncounter: () => ({ kind: "farm", sourceCellId: -1, restoreMessage: "" }),
      rightGrid: (_s, row, col) => {
        if (row === 0 && col === 1)
          return { spriteId: SPRITES.buttons.food, action: { type: ACTION_FARM_BUY_FOOD } };
        if (row === 1 && col === 0)
          return { spriteId: SPRITES.buttons.beast, action: { type: ACTION_FARM_BUY_BEAST } };
        if (row === 1 && col === 2)
          return { spriteId: SPRITES.buttons.return, action: { type: ACTION_FARM_LEAVE } };
        if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.farmBarn, action: null };
        return { action: null };
      }
    }
  };

  // src/core/mechanics/defs/camp.ts
  var ACTION_CAMP_SEARCH = "CAMP_SEARCH";
  var ACTION_CAMP_LEAVE = "CAMP_LEAVE";
  function computeCampArmyGain(args) {
    return RNG.keyedIntInRange({ seed: args.seed, stepCount: args.stepCount, cellId: args.campId }, 1, 2);
  }
  var placeNamedCamps = ({ cells, rngState }) => {
    const next = placeNamedFeature(cells, rngState, {
      count: CAMP_COUNT,
      namePool: CAMP_NAME_POOL,
      fallbackName: "A Camp",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name }) => ({ kind: "camp", id: cellId(x, y), name, nextReadyStep: 0 })
    });
    return { rngState: next };
  };
  var campPreviewPlate = (s) => {
    const camp = getCellAt(s.world, s.player.position);
    const stepCount = s.run.stepCount;
    if (stepCount < (camp.nextReadyStep ?? 0)) return null;
    const armyGain = computeCampArmyGain({ seed: s.world.seed, campId: camp.id, stepCount });
    return [
      { spriteId: SPRITES.stats.food, text: `+${CAMP_FOOD_GAIN}` },
      { spriteId: SPRITES.stats.troop, text: `+${armyGain}` }
    ];
  };
  var onEnterCamp = ({ cell, world, pos }) => {
    if (cell.kind !== "camp") return {};
    const camp = getCellAt(world, pos);
    if (!camp || camp.kind !== "camp") return {};
    const name = camp.name || "A Camp";
    const message = `${name} Camp`;
    const cellId2 = cellIdForPos(world, pos);
    const encounter = {
      kind: "camp",
      sourceCellId: cellId2,
      restoreMessage: message
    };
    const result = {
      message,
      encounter,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: "camp" }]
    };
    return result;
  };
  var reduceCampAction = (prevState, action) => {
    if (action.type !== ACTION_CAMP_LEAVE && action.type !== ACTION_CAMP_SEARCH) return null;
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "camp") return prevState;
    if (action.type === ACTION_CAMP_LEAVE) return leaveEncounter(prevState, "camp");
    return reduceCampSearch(prevState);
  };
  function reduceCampSearch(prevState) {
    const campCell = getCellAt(prevState.world, prevState.player.position);
    const campName = campCell.name || "A Camp";
    const stepCount = prevState.run.stepCount;
    const prevRes = prevState.resources;
    const rnd = RNG.createRunCopyRandom(prevState);
    const readyAt = campCell.nextReadyStep ?? 0;
    if (stepCount < readyAt) {
      const line2 = rnd.perMoveLine(CAMP_EMPTY_LINES, { cellId: campCell.id });
      return setEncounterMessage(prevState, `${campName} Camp`, line2);
    }
    const armyGain = computeCampArmyGain({ seed: prevState.world.seed, campId: campCell.id, stepCount });
    const nextCampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES };
    const nextWorld = setCellAt(prevState.world, prevState.player.position, nextCampCell);
    const gained = { ...prevRes, food: prevRes.food + CAMP_FOOD_GAIN, armySize: prevRes.armySize + armyGain };
    const nextResources = resourcesWithClampedFoodIfNeeded(gained);
    const foodGain = nextResources.food - prevRes.food;
    const line = rnd.perMoveLine(CAMP_RECRUIT_LINES, { cellId: campCell.id });
    return applyDeltas(
      { ...prevState, world: nextWorld },
      {
        resources: nextResources,
        message: `${campName} Camp
${line}`,
        deltas: [
          { target: "food", delta: foodGain },
          { target: "army", delta: armyGain }
        ]
      }
    );
  }
  var campMechanic = {
    id: "camp",
    kinds: ["camp"],
    mapLabel: "C",
    onEnterTile: onEnterCamp,
    poiSignpost: {
      rank: 40,
      name: (cell) => `${cell.name || "A Camp"} Camp`
    },
    placeWorld: placeNamedCamps,
    encounter: {
      kind: "camp",
      reduceAction: reduceCampAction,
      previewPlate: campPreviewPlate,
      previewEncounter: () => ({ kind: "camp", sourceCellId: -1, restoreMessage: "" }),
      rightGrid: (_s, row, col) => {
        if (row === 0 && col === 1) return { action: null };
        if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.search, action: { type: ACTION_CAMP_SEARCH } };
        if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_CAMP_LEAVE } };
        if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.campfireIcon, action: null };
        return { action: null };
      }
    }
  };

  // src/core/mechanics/moveEvents.ts
  function rollMoveEvent(args) {
    const { policy, hasScout, source, rngKeys } = args;
    const ambushPercent = policy.ambushPercent;
    let lostPercent = policy.lostPercent;
    if (hasScout && policy.scoutLostHalves) {
      lostPercent = Math.floor(lostPercent / 2);
    }
    if (ambushPercent + lostPercent === 0) return null;
    const percentile = RNG.keyedIntExclusive(rngKeys, 100);
    if (percentile < ambushPercent) {
      return { kind: "fight", source };
    }
    if (percentile < ambushPercent + lostPercent) {
      return { kind: "lost", source };
    }
    return null;
  }

  // src/core/mechanics/defs/combat.ts
  var ACTION_FIGHT = "FIGHT";
  var ACTION_RETURN = "RETURN";
  function spawnEnemyArmy(opts) {
    const playerArmy = Math.max(0, Math.trunc(opts.playerArmy));
    const r = RNG.createStreamRandom(opts.rngState);
    const delta = r.intExclusive(playerArmy + 1);
    return { rngState: r.rngState, enemyArmy: playerArmy + delta };
  }
  function resolveFightRound(opts) {
    const playerArmy = Math.max(0, Math.trunc(opts.playerArmy));
    const enemyArmy = Math.max(0, Math.trunc(opts.enemyArmy));
    const r = RNG.createStreamRandom(opts.rngState);
    const w = r.intExclusive(playerArmy + 5);
    const b = r.intExclusive(enemyArmy + 5);
    if (w >= b) {
      const nextEnemyArmy = Math.floor(enemyArmy / 2);
      const killed = enemyArmy - nextEnemyArmy;
      return { rngState: r.rngState, outcome: "playerHit", nextEnemyArmy, enemyDelta: nextEnemyArmy - enemyArmy, killed };
    }
    return { rngState: r.rngState, outcome: "enemyHit", nextEnemyArmy: enemyArmy, enemyDelta: 0, killed: 0 };
  }
  var combatRightGrid = (_s, row, col) => {
    if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.fight, action: { type: ACTION_FIGHT } };
    if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_RETURN } };
    if (row === 1 && col === 1) return { spriteId: SPRITES.stats.enemy, action: null };
    return { action: null };
  };
  var combatPreviewPlate = (s) => {
    const enc = s.encounter;
    if (!enc) return null;
    return [{ spriteId: SPRITES.stats.enemy, text: `${enc.enemyArmySize}` }];
  };
  var reduceCombatAction = (prevState, action) => {
    if (action.type !== ACTION_FIGHT && action.type !== ACTION_RETURN) return null;
    if (action.type === ACTION_RETURN) return reduceCombatReturn(prevState);
    return reduceCombatFight(prevState);
  };
  function reduceCombatReturn(prevState) {
    if (!prevState.encounter) return prevState;
    if (prevState.encounter.kind !== "combat") return prevState;
    const prevUi = prevState.ui;
    const prevRes = prevState.resources;
    const nextArmy = prevRes.armySize - 1;
    const isGameOver = nextArmy <= 0;
    const nextResources = { ...prevRes, armySize: Math.max(0, nextArmy) };
    const fleePick = isGameOver ? null : RNG.createRunCopyRandom(prevState).advanceCursor("combat.exit.flee", COMBAT_FLEE_EXIT_LINES);
    const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : fleePick.nextState.run;
    const nextMessage = isGameOver ? gameOverMessage(prevState.world.seed, prevState.run.stepCount) : fleePick.line || prevUi.message;
    const baseUi = { ...prevUi, message: nextMessage };
    if (!ENABLE_ANIMATIONS) {
      return {
        world: prevState.world,
        player: prevState.player,
        run: nextRun,
        resources: nextResources,
        encounter: null,
        ui: baseUi
      };
    }
    let uiWith = enqueueDeltas(baseUi, { target: "army", deltas: [-1] });
    return {
      world: prevState.world,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: null,
      ui: isGameOver ? uiWith : enqueueGridTransition(uiWith, { from: "combat", to: "overworld" })
    };
  }
  function reduceCombatFight(prevState) {
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "combat") return prevState;
    const prevEnemy = enc.enemyArmySize;
    if (prevEnemy <= 0) {
      return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, encounter: null, ui: prevState.ui };
    }
    const prevRes = prevState.resources;
    const prevUi = prevState.ui;
    const round = resolveFightRound({
      rngState: prevState.world.rngState,
      playerArmy: prevRes.armySize,
      enemyArmy: prevEnemy
    });
    const foodDeltas = [];
    const goldDeltas = [];
    const armyDeltas = [];
    const enemyDeltas = [];
    let nextResources = prevRes;
    let nextEncounter = enc;
    if (round.outcome === "playerHit") {
      const nextEnemy = round.nextEnemyArmy;
      const killed = round.killed;
      if (killed) enemyDeltas.push(-killed);
      nextEncounter = nextEnemy <= 0 ? null : { ...enc, enemyArmySize: nextEnemy };
    } else {
      nextResources = { ...nextResources, armySize: nextResources.armySize - 1 };
      armyDeltas.push(-1);
    }
    let nextWorld = { ...prevState.world, rngState: round.rngState };
    if (round.outcome === "playerHit" && nextEncounter == null) {
      const goldSpan = COMBAT_GOLD_REWARD_MAX - COMBAT_GOLD_REWARD_MIN + 1;
      const sr = RNG.createStreamRandom(nextWorld.rngState);
      const gold = COMBAT_GOLD_REWARD_MIN + sr.intExclusive(goldSpan);
      nextResources = { ...nextResources, gold: nextResources.gold + gold };
      goldDeltas.push(gold);
      const foodBonus = sr.intExclusive(COMBAT_FOOD_BONUS_MAX + 1);
      if (foodBonus) {
        nextResources = { ...nextResources, food: nextResources.food + foodBonus };
      }
      nextWorld = { ...nextWorld, rngState: sr.rngState };
    }
    nextResources = resourcesWithClampedFoodIfNeeded(nextResources);
    const appliedFoodDelta = nextResources.food - prevRes.food;
    if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta);
    const isGameOver = nextResources.armySize <= 0;
    const victoryPick = !isGameOver && nextEncounter == null ? RNG.createRunCopyRandom(prevState).advanceCursor("combat.exit.victory", COMBAT_VICTORY_EXIT_LINES) : null;
    const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : nextEncounter == null ? victoryPick.nextState.run : prevState.run;
    const nextMessage = isGameOver ? gameOverMessage(nextWorld.seed, prevState.run.stepCount) : nextEncounter == null ? victoryPick.line || prevUi.message : prevUi.message;
    const baseUi = { message: nextMessage, leftPanel: prevUi.leftPanel, clock: prevUi.clock, anim: prevUi.anim };
    if (!ENABLE_ANIMATIONS) {
      return {
        world: nextWorld,
        player: prevState.player,
        run: nextRun,
        resources: nextResources,
        encounter: isGameOver ? null : nextEncounter,
        ui: baseUi
      };
    }
    let uiWith = baseUi;
    uiWith = enqueueDeltas(uiWith, { target: "food", deltas: foodDeltas });
    uiWith = enqueueDeltas(uiWith, { target: "gold", deltas: goldDeltas });
    uiWith = enqueueDeltas(uiWith, { target: "army", deltas: armyDeltas });
    uiWith = enqueueDeltas(uiWith, { target: "enemyArmy", deltas: enemyDeltas });
    if (!isGameOver && nextEncounter == null) {
      uiWith = enqueueGridTransition(uiWith, { from: "combat", to: "overworld" });
    }
    return {
      world: nextWorld,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: isGameOver ? null : nextEncounter,
      ui: uiWith
    };
  }
  function startCombatEncounter(args) {
    const spawned = spawnEnemyArmy({ rngState: args.world.rngState, playerArmy: args.playerArmy });
    const nextWorld = { ...args.world, rngState: spawned.rngState };
    const encounter = {
      kind: "combat",
      enemyArmySize: spawned.enemyArmy,
      sourceCellId: cellIdForPos(nextWorld, args.pos),
      restoreMessage: args.restoreMessage
    };
    return {
      world: nextWorld,
      encounter,
      message: args.encounterMessage,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: "combat" }]
    };
  }
  var combatMechanic = {
    id: "combat",
    kinds: [],
    encounter: {
      kind: "combat",
      rightGrid: combatRightGrid,
      reduceAction: reduceCombatAction,
      previewPlate: combatPreviewPlate,
      // Enemy-army delta popups land on the plate's enemy line. Negative deltas
      // (enemy losing troops) are "good" for the player → green.
      previewPlateDeltaAnchors: [{ target: "enemyArmy", lineIndex: 0, goodSign: -1 }],
      previewEncounter: () => ({
        kind: "combat",
        enemyArmySize: 0,
        sourceCellId: -1,
        restoreMessage: ""
      })
    }
  };

  // src/core/mechanics/defs/henge.ts
  var hengePolicy = { ambushPercent: 100, lostPercent: 0 };
  var onEnterHenge = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "henge") return {};
    const hengeCell = getCellAt(world, pos);
    if (!hengeCell || hengeCell.kind !== "henge") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const name = hengeCell.name || "A Henge";
    const readyAt = hengeCell.nextReadyStep ?? 0;
    if (stepCount < readyAt) {
      const line = r.perMoveLine(HENGE_EMPTY_LINES, { cellId: hengeCell.id });
      return { message: `${name} Henge
${line}` };
    }
    const cellId2 = cellIdForPos(world, pos);
    const event = rollMoveEvent({
      policy: hengePolicy,
      hasScout: !!resources.hasScout,
      source: "henge",
      rngKeys: { seed: world.seed, stepCount, cellId: cellId2 }
    });
    if (event?.kind !== "fight") {
      const line = r.perMoveLine(HENGE_LORE_LINES, { cellId: hengeCell.id });
      return { message: `${name} Henge
${line}` };
    }
    const tileMessage = `${name} Henge
${r.perMoveLine(HENGE_LORE_LINES, { cellId: hengeCell.id })}`;
    const result = startCombatEncounter({
      world,
      pos,
      playerArmy: resources.armySize,
      encounterMessage: HENGE_ENCOUNTER_LINE,
      restoreMessage: tileMessage
    });
    const nextHenge = { ...hengeCell, nextReadyStep: stepCount + HENGE_COOLDOWN_MOVES };
    return { ...result, world: setCellAt(result.world, pos, nextHenge) };
  };
  var placeHenges = ({ cells, rngState }) => {
    const next = placeNamedFeature(cells, rngState, {
      count: HENGE_COUNT,
      namePool: HENGE_NAME_POOL,
      fallbackName: "A Henge",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name }) => ({ kind: "henge", id: cellId(x, y), name, nextReadyStep: 0 })
    });
    return { rngState: next };
  };
  var hengeMechanic = {
    id: "henge",
    kinds: ["henge"],
    mapLabel: "H",
    moveEventPolicyByKind: { henge: { ambushPercent: 100, lostPercent: 0 } },
    onEnterTile: onEnterHenge,
    poiSignpost: {
      rank: 50,
      name: (cell) => `${cell.name || "A Henge"} Henge`
    },
    placeWorld: placeHenges
  };

  // src/core/mechanics/defs/town.ts
  var ACTION_TOWN_BUY_FOOD = "buyFood";
  var ACTION_TOWN_BUY_TROOPS = "buyTroops";
  var ACTION_TOWN_HIRE_SCOUT = "hireScout";
  var ACTION_TOWN_BUY_RUMOR = "buyRumors";
  var ACTION_TOWN_LEAVE = "TOWN_LEAVE";
  function townPrefix(town) {
    const name = town.name || "A Town";
    return `${name} Town`;
  }
  function rumorPool() {
    const pool = [];
    const groups = Object.values(BARKEEP_TIPS);
    for (let i = 0; i < groups.length; i++) {
      const lines = groups[i];
      for (let j = 0; j < lines.length; j++) pool.push(lines[j]);
    }
    return pool;
  }
  var onEnterTown = ({ cell, world, pos, stepCount }) => {
    if (cell.kind !== "town") return {};
    const town = getCellAt(world, pos);
    if (!town || town.kind !== "town") return {};
    const name = town.name || "A Town";
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.stableLine(TOWN_ENTER_LINES, { placeId: town.id });
    const message = `${name} Town
${line}`;
    const cellId2 = cellIdForPos(world, pos);
    const encounter = {
      kind: "town",
      sourceCellId: cellId2,
      restoreMessage: message
    };
    const result = {
      message,
      knowsPosition: true,
      encounter,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: "town" }]
    };
    return result;
  };
  var reduceTownAction = (prevState, action) => {
    if (action.type !== ACTION_TOWN_BUY_FOOD && action.type !== ACTION_TOWN_BUY_TROOPS && action.type !== ACTION_TOWN_HIRE_SCOUT && action.type !== ACTION_TOWN_BUY_RUMOR && action.type !== ACTION_TOWN_LEAVE) {
      return null;
    }
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "town") return prevState;
    if (action.type === ACTION_TOWN_LEAVE) return leaveEncounter(prevState, "town");
    const town = getCellAt(prevState.world, prevState.player.position);
    if (action.type === ACTION_TOWN_BUY_FOOD) return reduceTownBuyFood(prevState, town);
    if (action.type === ACTION_TOWN_BUY_TROOPS) return reduceTownBuyTroops(prevState, town);
    if (action.type === ACTION_TOWN_HIRE_SCOUT) return reduceTownHireScout(prevState, town);
    return reduceTownBuyRumor(prevState, town);
  };
  function reduceTownBuyFood(prevState, town) {
    const prefix = townPrefix(town);
    if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
      return setEncounterMessage(prevState, prefix, FOOD_CARRY_FULL_MESSAGE);
    }
    const result = buy(prevState.resources, { gold: town.prices.foodGold, gain: { food: town.bundles.food } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, prefix, town.id);
    const clamped = resourcesWithClampedFoodIfNeeded(result.resources);
    const appliedFoodDelta = clamped.food - prevState.resources.food;
    const deltas = result.deltas.map((d) => d.target === "food" ? { ...d, delta: appliedFoodDelta } : d);
    const pick = RNG.createRunCopyRandom(prevState).advanceCursor("town.buyFeedback", TOWN_BUY_LINES);
    return applyDeltas(prevState, {
      resources: clamped,
      run: pick.nextState.run,
      message: `${prefix}
${pick.line}`,
      deltas
    });
  }
  function reduceTownBuyTroops(prevState, town) {
    const prefix = townPrefix(town);
    const result = buy(prevState.resources, { gold: town.prices.troopsGold, gain: { armySize: town.bundles.troops } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, prefix, town.id);
    const pick = RNG.createRunCopyRandom(prevState).advanceCursor("town.buyFeedback", TOWN_BUY_LINES);
    return applyDeltas(prevState, {
      resources: result.resources,
      run: pick.nextState.run,
      message: `${prefix}
${pick.line}`,
      deltas: result.deltas
    });
  }
  function reduceTownHireScout(prevState, town) {
    const prefix = townPrefix(town);
    const rnd = RNG.createRunCopyRandom(prevState);
    if (prevState.resources.hasScout) {
      return setEncounterMessage(prevState, prefix, rnd.perMoveLine(TOWN_SCOUT_ALREADY_HAVE_LINES, { cellId: town.id }));
    }
    const result = buy(prevState.resources, { gold: town.prices.scoutGold, gain: { hasScout: true } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, prefix, town.id);
    return applyDeltas(prevState, {
      resources: result.resources,
      message: `${prefix}
${rnd.perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: town.id })}`,
      deltas: result.deltas
    });
  }
  var placeNamedTowns = ({ cells, rngState }) => {
    const baseOffers = [
      ACTION_TOWN_BUY_FOOD,
      ACTION_TOWN_BUY_TROOPS,
      ACTION_TOWN_HIRE_SCOUT,
      ACTION_TOWN_BUY_RUMOR
    ];
    const omitNoScoutIndices = [0, 1, 3];
    let townIndex = 0;
    const next = placeNamedFeature(cells, rngState, {
      count: TOWN_COUNT,
      namePool: TOWN_NAME_POOL,
      fallbackName: "A Town",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name, rng }) => {
        let omitIdx;
        if (townIndex === 0) {
          const idx = rng.intExclusive(omitNoScoutIndices.length);
          omitIdx = omitNoScoutIndices[idx];
        } else {
          omitIdx = rng.intExclusive(baseOffers.length);
        }
        const offers = baseOffers.filter((_k, idx) => idx !== omitIdx);
        const foodGold = rng.intInRange(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX);
        const troopsGold = rng.intInRange(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX);
        const scoutGold = rng.intInRange(TOWN_PRICE_SCOUT_MIN, TOWN_PRICE_SCOUT_MAX);
        const rumorGold = rng.intInRange(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX);
        const cell = {
          kind: "town",
          id: cellId(x, y),
          name,
          offers,
          prices: { foodGold, troopsGold, scoutGold, rumorGold },
          bundles: { food: TOWN_FOOD_BUNDLE, troops: TOWN_TROOPS_BUNDLE }
        };
        townIndex++;
        return cell;
      }
    });
    return { rngState: next };
  };
  var townPreviewPlate = (s) => {
    const here = getCellAt(s.world, s.player.position);
    if (!here || here.kind !== "town") return null;
    const lines = [];
    for (let i = 0; i < here.offers.length; i++) {
      const o = here.offers[i];
      if (o === "buyFood") lines.push({ spriteId: SPRITES.stats.food, text: `-${here.prices.foodGold}` });
      else if (o === "buyTroops") lines.push({ spriteId: SPRITES.stats.troop, text: `-${here.prices.troopsGold}` });
      else if (o === "hireScout") lines.push({ spriteId: SPRITES.stats.scout, text: `-${here.prices.scoutGold}` });
      else if (o === "buyRumors") lines.push({ spriteId: SPRITES.cosmetics.rumorIllustration, text: `-${here.prices.rumorGold}` });
    }
    return lines.length ? lines : null;
  };
  function reduceTownBuyRumor(prevState, town) {
    const prefix = townPrefix(town);
    const result = buy(prevState.resources, { gold: town.prices.rumorGold, gain: {} });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, prefix, town.id);
    const pool = rumorPool();
    const pick = RNG.createRunCopyRandom(prevState).advanceCursor(`town.rumor.${town.id}`, pool, { salt: town.id });
    return applyDeltas(prevState, {
      resources: result.resources,
      run: pick.nextState.run,
      message: `${prefix}
${pick.line}`,
      deltas: result.deltas
    });
  }
  var townMechanic = {
    id: "town",
    kinds: ["town"],
    mapLabel: "T",
    onEnterTile: onEnterTown,
    poiSignpost: {
      rank: 30,
      name: (cell) => `${cell.name || "A Town"} Town`
    },
    placeWorld: placeNamedTowns,
    encounter: {
      kind: "town",
      reduceAction: reduceTownAction,
      previewPlate: townPreviewPlate,
      previewEncounter: () => ({ kind: "town", sourceCellId: -1, restoreMessage: "" }),
      rightGrid: (s, row, col) => {
        const town = getCellAt(s.world, s.player.position);
        function spriteIdForOffer(o) {
          if (!o) return null;
          if (o === "buyFood") return SPRITES.buttons.food;
          if (o === "buyTroops") return SPRITES.buttons.troop;
          if (o === "hireScout") return SPRITES.buttons.scout;
          if (o === "buyRumors") return SPRITES.buttons.rumorTip;
          return null;
        }
        const offerAt = (idx) => {
          const o = town.offers[idx];
          if (!o) return { action: null };
          const spriteId = spriteIdForOffer(o);
          if (spriteId == null) return { action: null };
          return { spriteId, action: { type: o } };
        };
        if (row === 0 && col === 1) return offerAt(0);
        if (row === 1 && col === 0) return offerAt(1);
        if (row === 2 && col === 1) return offerAt(2);
        if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_TOWN_LEAVE } };
        if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.marketStall, action: null };
        return { action: null };
      }
    }
  };

  // src/core/teleport.ts
  var FEATURE_KIND_SET = new Set(FEATURE_KINDS);
  function isTerrain(kind) {
    return !FEATURE_KIND_SET.has(kind);
  }
  function pickTeleportDestination(args) {
    const { world, origin } = args;
    const r = RNG.createStreamRandom(args.rngState);
    const candidates = [];
    let maxD = 0;
    for (let y = 0; y < world.height; y++) {
      const row = world.cells[y];
      for (let x = 0; x < world.width; x++) {
        const cell = row[x];
        if (!isTerrain(cell.kind)) continue;
        if (x === origin.x && y === origin.y) continue;
        const dx = torusDelta(origin.x, x, world.width);
        const dy = torusDelta(origin.y, y, world.height);
        const d = manhattan(dx, dy);
        candidates.push({ x, y, d });
        if (d > maxD) maxD = d;
      }
    }
    const target = Math.min(TELEPORT_MIN_DISTANCE, maxD);
    const eligible = candidates.filter((c) => c.d >= target);
    const pool = eligible.length > 0 ? eligible : candidates;
    if (pool.length === 0) {
      return { destination: origin, rngState: r.rngState };
    }
    const pick = pool[r.intExclusive(pool.length)];
    return { destination: { x: pick.x, y: pick.y }, rngState: r.rngState };
  }

  // src/core/mechanics/defs/terrainHazards.ts
  var woodsPolicy = {
    ambushPercent: WOODS_AMBUSH_PERCENT,
    lostPercent: WOODS_LOST_PERCENT,
    scoutLostHalves: true
  };
  var swampPolicy = {
    ambushPercent: 0,
    lostPercent: SWAMP_LOST_PERCENT,
    scoutLostHalves: true
  };
  var mountainPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 };
  var onEnterTerrainHazards = ({ cell, world, pos, stepCount, resources }) => {
    const kind = cell.kind;
    let policy;
    if (kind === "woods") policy = woodsPolicy;
    else if (kind === "swamp") policy = swampPolicy;
    else if (kind === "mountain") policy = mountainPolicy;
    else return {};
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind(kind));
    const event = rollMoveEvent({
      policy,
      hasScout: !!resources.hasScout,
      source: kind,
      rngKeys: { seed: world.seed, stepCount, cellId: cellIdForPos(world, pos) }
    });
    if (!event) {
      return { message: tileMessage };
    }
    if (event.kind === "fight") {
      const encounterMessage = tileRand.perMoveLine(COMBAT_ENCOUNTER_LINES);
      return startCombatEncounter({
        world,
        pos,
        playerArmy: resources.armySize,
        encounterMessage,
        restoreMessage: tileMessage
      });
    }
    const td = pickTeleportDestination({ world, origin: pos, rngState: world.rngState });
    const nextWorld = { ...world, rngState: td.rngState };
    const lostMessage = RNG.createTileRandom({ world: nextWorld, stepCount, pos }).perMoveLine(LOST_FLAVOR_LINES);
    return {
      world: nextWorld,
      teleportTo: td.destination,
      message: lostMessage
    };
  };
  var terrainHazardsMechanic = {
    id: "terrainHazards",
    kinds: ["woods", "swamp", "mountain"],
    enterFoodCostByKind: {
      swamp: FOOD_COST_SWAMP,
      mountain: FOOD_COST_MOUNTAIN
    },
    moveEventPolicyByKind: {
      woods: woodsPolicy,
      swamp: swampPolicy,
      mountain: mountainPolicy
    },
    onEnterTile: onEnterTerrainHazards
  };

  // src/core/mechanics/defs/fishingLake.ts
  var onEnterFishingLake = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "fishingLake") return {};
    const lake = getCellAt(world, pos);
    if (!lake || lake.kind !== "fishingLake") return {};
    if (stepCount < lake.nextReadyStep) {
      const r2 = RNG.createTileRandom({ world, stepCount, pos });
      return {
        message: r2.perMoveLine(FISHING_LAKE_COOLDOWN_LINES, { cellId: lake.id })
      };
    }
    const sr = RNG.createStreamRandom(world.rngState);
    const gain = sr.intExclusive(3) + 1;
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.perMoveLine(FISHING_LAKE_READY_LINES, { cellId: lake.id });
    const nextLake = { ...lake, nextReadyStep: stepCount + FISHING_LAKE_COOLDOWN_MOVES };
    const nextWorld = setCellAt({ ...world, rngState: sr.rngState }, pos, nextLake);
    return {
      world: nextWorld,
      resources: {
        ...resources,
        food: resources.food + gain
      },
      message: line
    };
  };
  var placeFishingLakes = ({ cells, rngState }) => {
    const res = placeFeature(cells, rngState, {
      count: FISHING_LAKE_COUNT,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y }) => ({ kind: "fishingLake", id: cellId(x, y), nextReadyStep: 0 })
    });
    return { rngState: res.rngState };
  };
  var fishingLakeMechanic = {
    id: "fishingLake",
    kinds: ["fishingLake"],
    onEnterTile: onEnterFishingLake,
    placeWorld: placeFishingLakes
  };

  // src/core/mechanics/defs/rainbowEnd.ts
  var onEnterRainbowEnd = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "rainbowEnd") return {};
    const rainbowEndCell = getCellAt(world, pos);
    if (!rainbowEndCell || rainbowEndCell.kind !== "rainbowEnd") return {};
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    if (rainbowEndCell.hasPaidOut) {
      return { message: tileRand.perMoveLine(RAINBOW_END_SPENT_LINES, { cellId: rainbowEndCell.id }) };
    }
    const nextCell = { ...rainbowEndCell, hasPaidOut: true };
    const nextWorld = setCellAt(world, pos, nextCell);
    return {
      world: nextWorld,
      resources: { ...resources, gold: resources.gold + RAINBOW_END_GOLD_PAYOUT },
      message: tileRand.perMoveLine(RAINBOW_END_PAYOUT_LINES, { cellId: rainbowEndCell.id })
    };
  };
  var placeRainbowEnds = ({ cells, rngState }) => {
    const first = placeFeature(cells, rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y }) => ({ kind: "rainbowEnd", id: cellId(x, y), hasPaidOut: false })
    });
    const second = placeFeature(cells, first.rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      awayFrom: { pos: first.placed[0], minDistance: RAINBOW_END_MIN_DISTANCE },
      buildCell: ({ x, y }) => ({ kind: "rainbowEnd", id: cellId(x, y), hasPaidOut: false })
    });
    return { rngState: second.rngState };
  };
  var rainbowEndMechanic = {
    id: "rainbowEnd",
    kinds: ["rainbowEnd"],
    mapLabel: "R",
    onEnterTile: onEnterRainbowEnd,
    placeWorld: placeRainbowEnds
  };

  // src/core/mechanics/index.ts
  var MECHANICS = [
    gateMechanic,
    locksmithMechanic,
    farmMechanic,
    campMechanic,
    townMechanic,
    hengeMechanic,
    signpostMechanic,
    fishingLakeMechanic,
    rainbowEndMechanic,
    terrainHazardsMechanic,
    combatMechanic
  ];
  var MECHANIC_INDEX = buildMechanicIndex(MECHANICS);

  // src/core/world.ts
  function boxBlurIntGridWrap(grid, w, h) {
    const out = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = wrapIndex(x + dx, w);
            const ny = wrapIndex(y + dy, h);
            sum += grid[ny][nx];
          }
        }
        row.push(Math.floor(sum / 9));
      }
      out.push(row);
    }
    return out;
  }
  function generateBaseTerrainCells(rngState) {
    const vals = [];
    const rng = RNG.createStreamRandom(rngState);
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        row.push(rng.intExclusive(NOISE_VALUE_MAX));
      }
      vals.push(row);
    }
    let V = vals;
    for (let p = 0; p < NOISE_SMOOTH_PASSES; p++) {
      V = boxBlurIntGridWrap(V, WORLD_WIDTH, WORLD_HEIGHT);
    }
    let minV = V[0][0];
    let maxV = V[0][0];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const v = V[y][x];
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    }
    const span = maxV - minV || 1;
    const kindByBucket = TERRAIN_KINDS;
    const bucketCount = kindByBucket.length;
    const cells = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        let bucket = Math.floor(bucketCount * (V[y][x] - minV) / span);
        if (bucket < 0) bucket = 0;
        if (bucket >= bucketCount) bucket = bucketCount - 1;
        row.push({ kind: kindByBucket[bucket] });
      }
      cells.push(row);
    }
    return { cells, rngState: rng.rngState };
  }
  function pickStart({ rngState }) {
    const rng = RNG.createStreamRandom(rngState);
    const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT);
    const x = v % WORLD_WIDTH;
    const y = Math.floor(v / WORLD_WIDTH);
    return { startPosition: { x, y }, rngState: rng.rngState };
  }
  function generateWorld(seed) {
    let rngState = RNG.createStreamRandomFromSeed(seed).rngState;
    const base = generateBaseTerrainCells(rngState);
    rngState = base.rngState;
    const cells = base.cells;
    for (let i = 0; i < MECHANICS.length; i++) {
      const m = MECHANICS[i];
      if (!m.placeWorld) continue;
      rngState = m.placeWorld({ cells, rngState }).rngState;
    }
    const startPick = pickStart({ rngState });
    rngState = startPick.rngState;
    const world = {
      seed,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      mapGenAlgorithm: MAP_GEN_ALGORITHM,
      cells,
      rngState
    };
    return { world, startPosition: startPick.startPosition };
  }

  // src/core/mechanics/onEnter.ts
  var onEnterDefaultTerrain = ({ cell, world, pos, stepCount }) => {
    const r = RNG.createTileRandom({ world, stepCount, pos });
    return { message: r.perMoveLine(terrainLoreLinesForKind(cell.kind)) };
  };

  // src/core/types.ts
  var LEFT_PANEL_KIND_AUTO = "auto";
  var LEFT_PANEL_KIND_SPRITE = "sprite";
  var LEFT_PANEL_KIND_MINIMAP = "minimap";
  var LEFT_PANEL_KIND_MAP = "map";

  // src/core/gameMap.ts
  function updateRunPathMemoryAfterMove(args) {
    const prevPath = args.prevPath ?? [];
    let path = prevPath.concat([{ pos: args.nextPos, isMapped: false }]);
    let lostBufferStartIndex = args.prevLostBufferStartIndex ?? null;
    if (args.teleported) {
      lostBufferStartIndex = path.length - 1;
    }
    if (!args.nextKnowsPosition && lostBufferStartIndex == null) {
      lostBufferStartIndex = path.length - 1;
    }
    if (args.nextKnowsPosition) {
      if (lostBufferStartIndex != null) {
        const start = Math.max(0, Math.min(lostBufferStartIndex, path.length - 1));
        const mapped = path.slice();
        for (let i = start; i < mapped.length; i++) {
          const step = mapped[i];
          if (step.isMapped) continue;
          mapped[i] = { pos: step.pos, isMapped: true };
        }
        path = mapped;
        lostBufferStartIndex = null;
      } else {
        const idx = path.length - 1;
        const step = path[idx];
        if (!step.isMapped) {
          const mapped = path.slice();
          mapped[idx] = { pos: step.pos, isMapped: true };
          path = mapped;
        }
      }
    }
    return { path, lostBufferStartIndex };
  }
  function computeGameMapView(s) {
    const { mapLabelByKind } = MECHANIC_INDEX;
    const showPlayer = !!s.run.knowsPosition;
    const markers = [];
    const seen = /* @__PURE__ */ new Set();
    function push(pos, label, isMapped) {
      const k = `${label}@${pos.x},${pos.y}`;
      if (seen.has(k)) return;
      seen.add(k);
      markers.push({ pos, label, isMapped });
    }
    const candidates = [];
    const path = s.run.path ?? [];
    if (s.run.knowsPosition) {
      if (s.resources.hasScout) {
        for (let y = 0; y < s.world.height; y++) {
          for (let x = 0; x < s.world.width; x++) {
            const kind = s.world.cells[y][x].kind;
            if (!SCOUT_GLOBAL_REVEAL_KINDS.includes(kind)) continue;
            candidates.push({ pos: { x, y }, isMapped: true });
          }
        }
      }
      for (let i = 0; i < path.length; i++) {
        const step = path[i];
        if (!step.isMapped) continue;
        candidates.push({ pos: step.pos, isMapped: true });
      }
    } else {
      const start = s.run.lostBufferStartIndex ?? path.length;
      for (let i = Math.max(0, start); i < path.length; i++) {
        const step = path[i];
        candidates.push({ pos: step.pos, isMapped: step.isMapped });
      }
    }
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const kind = s.world.cells[c.pos.y][c.pos.x].kind;
      const label = mapLabelByKind[kind];
      if (!label) continue;
      push(c.pos, label, c.isMapped);
    }
    return { markers, showPlayer };
  }

  // src/core/reducer.ts
  var { onEnterTileByKind } = MECHANIC_INDEX;
  var { enterFoodCostByKind } = MECHANIC_INDEX;
  var { reduceEncounterActionByEncounterKind } = MECHANIC_INDEX;
  function tickClock(ui) {
    return {
      message: ui.message,
      leftPanel: ui.leftPanel,
      clock: { frame: ui.clock.frame + 1 },
      anim: ui.anim
    };
  }
  function pruneExpiredAnims(ui) {
    const frame = ui.clock.frame;
    const active = ui.anim.active;
    const kept = [];
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const startFrame = a.startFrame;
      const durationFrames = a.durationFrames;
      const endFrame = startFrame + Math.max(0, durationFrames);
      if (frame < endFrame) kept.push(a);
    }
    if (kept.length === active.length) return ui;
    return {
      message: ui.message,
      leftPanel: ui.leftPanel,
      clock: ui.clock,
      anim: { nextId: ui.anim.nextId, active: kept }
    };
  }
  function hasBlockingAnim(ui) {
    const active = ui.anim.active;
    for (let i = 0; i < active.length; i++) {
      if (active[i].blocksInput) return true;
    }
    return false;
  }
  function clearSpriteFocusIfAny(ui) {
    if (ui.leftPanel.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO };
    return ui.leftPanel;
  }
  function initialMessageForStart() {
    return GOAL_NARRATIVE;
  }
  function reduceGoal(s) {
    const prevUi = s.ui;
    const prevLeftPanel = prevUi.leftPanel;
    const nextLeftPanel = prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? prevLeftPanel : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPRITES.buttons.goal };
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: GOAL_NARRATIVE,
        leftPanel: nextLeftPanel
      }
    };
  }
  function reduceToggleMinimap(s) {
    const prevUi = s.ui;
    const prevLeftPanel = prevUi.leftPanel;
    if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
      const nextMessage = prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message;
      return {
        world: s.world,
        player: s.player,
        run: s.run,
        resources: s.resources,
        encounter: s.encounter,
        ui: {
          clock: prevUi.clock,
          anim: prevUi.anim,
          message: nextMessage,
          leftPanel: { kind: LEFT_PANEL_KIND_MINIMAP }
        }
      };
    }
    const nextLeftPanel = prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? { kind: LEFT_PANEL_KIND_AUTO } : { kind: LEFT_PANEL_KIND_MINIMAP };
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: prevUi.message,
        leftPanel: nextLeftPanel
      }
    };
  }
  function reduceToggleMap(s) {
    const prevUi = s.ui;
    const prevLeftPanel = prevUi.leftPanel;
    if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
      const restoreMessage = prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message;
      return {
        world: s.world,
        player: s.player,
        run: s.run,
        resources: s.resources,
        encounter: s.encounter,
        ui: {
          clock: prevUi.clock,
          anim: prevUi.anim,
          message: restoreMessage,
          leftPanel: prevLeftPanel.restoreLeftPanel
        }
      };
    }
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: MAP_HINT_MESSAGE,
        leftPanel: { kind: LEFT_PANEL_KIND_MAP, restoreLeftPanel: prevLeftPanel, restoreMessage: prevUi.message }
      }
    };
  }
  function reduceMove(prevState, dx, dy) {
    if (prevState.run.isGameOver || prevState.run.hasWon) return prevState;
    if (prevState.encounter) return prevState;
    const world = prevState.world;
    const prevPos = prevState.player.position;
    const nextPos = {
      x: (prevPos.x + dx + world.width) % world.width,
      y: (prevPos.y + dy + world.height) % world.height
    };
    const cell = world.cells[nextPos.y][nextPos.x];
    const nextStepCount = prevState.run.stepCount + 1;
    const prevRes = prevState.resources;
    const prevFood = prevRes.food;
    const cost = enterFoodCostByKind[cell.kind] ?? FOOD_COST_DEFAULT;
    const foodDeltas = [];
    const armyDeltas = [];
    let food;
    let armySize;
    if (prevFood >= cost) {
      food = prevFood - cost;
      foodDeltas.push(-cost);
      armySize = prevRes.armySize;
    } else {
      food = 0;
      if (prevFood > 0) foodDeltas.push(-prevFood);
      armySize = prevRes.armySize - 1;
      armyDeltas.push(-1);
    }
    const baseResources = { ...prevRes, food, armySize };
    const wouldGameOver = baseResources.armySize <= 0;
    const ctx = { cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources };
    const outcome = wouldGameOver ? {} : (onEnterTileByKind[cell.kind] ?? onEnterDefaultTerrain)(ctx);
    const nextWorld = outcome.world ?? world;
    const nextResources = resourcesWithClampedFoodIfNeeded(outcome.resources ?? baseResources);
    const appliedFoodDelta = nextResources.food - baseResources.food;
    if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta);
    const nextHasWon = prevState.run.hasWon || !!outcome.hasWon;
    const isGameOver = nextResources.armySize <= 0;
    const nextEncounter = outcome.encounter ?? null;
    const teleported = outcome.teleportTo != null;
    const landingPos = teleported ? outcome.teleportTo : nextPos;
    const finalKnowsPosition = teleported ? false : prevState.run.knowsPosition || !!outcome.knowsPosition;
    const message = isGameOver ? gameOverMessage(nextWorld.seed, nextStepCount) : outcome.message ?? onEnterDefaultTerrain(ctx).message;
    const prevUi = prevState.ui;
    const baseUi = {
      message,
      leftPanel: clearSpriteFocusIfAny(prevUi),
      clock: prevUi.clock,
      anim: prevUi.anim
    };
    const mem = updateRunPathMemoryAfterMove({
      prevPath: prevState.run.path,
      prevLostBufferStartIndex: prevState.run.lostBufferStartIndex,
      nextPos: landingPos,
      nextKnowsPosition: finalKnowsPosition,
      teleported
    });
    const baseState = {
      world: nextWorld,
      player: { position: landingPos },
      run: {
        ...prevState.run,
        stepCount: nextStepCount,
        hasWon: nextHasWon,
        isGameOver,
        knowsPosition: finalKnowsPosition,
        path: mem.path,
        lostBufferStartIndex: mem.lostBufferStartIndex
      },
      resources: nextResources,
      encounter: nextEncounter,
      ui: baseUi
    };
    if (!ENABLE_ANIMATIONS) return baseState;
    const startFrame = baseUi.clock.frame;
    let uiWith = baseState.ui;
    uiWith = enqueueDeltas(uiWith, { target: "food", deltas: foodDeltas, startFrame });
    uiWith = enqueueDeltas(uiWith, { target: "army", deltas: armyDeltas, startFrame });
    if (outcome.enterAnims && outcome.enterAnims.length) {
      uiWith = applyEnterAnims(uiWith, outcome.enterAnims, startFrame + MOVE_SLIDE_FRAMES);
    }
    if (teleported) {
      uiWith = enqueueGridTransition(uiWith, { startFrame, from: "blank", to: "overworld" });
    } else {
      uiWith = enqueueAnim(uiWith, {
        kind: "moveSlide",
        startFrame,
        durationFrames: MOVE_SLIDE_FRAMES,
        blocksInput: true,
        params: { fromPos: { x: prevPos.x, y: prevPos.y }, toPos: { x: nextPos.x, y: nextPos.y }, dx, dy }
      });
    }
    return { ...baseState, ui: uiWith };
  }
  function reduceRestart(s) {
    const next = processAction(null, { type: ACTION_NEW_RUN, seed: s.world.seed + 1 });
    return next || s;
  }
  function processAction(prevState, action) {
    if (prevState == null) {
      if (action.type !== ACTION_NEW_RUN) return null;
    }
    if (action.type === ACTION_NEW_RUN) {
      const seed = Math.trunc(action.seed);
      const generated = generateWorld(seed);
      const world = generated.world;
      const playerPos = generated.startPosition;
      const hasWon = false;
      const baseUi = {
        message: initialMessageForStart(),
        leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
        clock: { frame: 0 },
        anim: { nextId: 1, active: [] }
      };
      const ui = ENABLE_ANIMATIONS ? enqueueGridTransition(baseUi, { startFrame: 0, from: "blank", to: "overworld" }) : baseUi;
      return {
        world,
        player: { position: { x: playerPos.x, y: playerPos.y } },
        run: {
          stepCount: 0,
          hasWon,
          isGameOver: false,
          knowsPosition: false,
          path: [],
          lostBufferStartIndex: null,
          copyCursors: {}
        },
        resources: {
          food: INITIAL_FOOD,
          gold: INITIAL_GOLD,
          armySize: INITIAL_ARMY_SIZE,
          hasBronzeKey: false,
          hasScout: false,
          hasTameBeast: false
        },
        encounter: null,
        ui
      };
    }
    if (prevState == null) return null;
    if (action.type === ACTION_TICK) return reduceTick(prevState);
    if (action.type === ACTION_RESTART) return reduceRestart(prevState);
    if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState);
    if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState);
    if (action.type === ACTION_TOGGLE_MAP) return reduceToggleMap(prevState);
    if (prevState.encounter && !prevState.run.isGameOver && !prevState.run.hasWon) {
      const handler = reduceEncounterActionByEncounterKind[prevState.encounter.kind];
      if (handler) {
        const next = handler(prevState, action);
        if (next != null) return next;
      }
    }
    if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx, action.dy);
    return prevState;
  }
  function reduceTick(prevState) {
    const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(prevState.ui)) : prevState.ui;
    return { ...prevState, ui: tickedUi };
  }

  // src/core/rightGrid.ts
  var { rightGridByEncounterKind } = MECHANIC_INDEX;
  function getRightGridCellDef(s, row, col) {
    if (row === 0 && col === 0) return { spriteId: SPRITES.buttons.goal, action: { type: ACTION_SHOW_GOAL } };
    if (row === 2 && col === 0) return { spriteId: SPRITES.buttons.minimap, action: { type: ACTION_TOGGLE_MINIMAP } };
    if (row === 2 && col === 2) return { spriteId: SPRITES.buttons.restart, action: { type: ACTION_RESTART } };
    if (row === 0 && col === 2) {
      return { spriteId: SPRITES.buttons.map, action: { type: ACTION_TOGGLE_MAP } };
    }
    const isRunOver = !!(s.run.isGameOver || s.run.hasWon);
    if (s.encounter) {
      const p = rightGridByEncounterKind[s.encounter.kind];
      return p ? p(s, row, col) : { action: null };
    }
    if (row === 0 && col === 1) return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: -1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: -1 } };
    if (row === 1 && col === 0) return { tilePreview: { kind: "relativeToPlayer", dx: -1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: -1, dy: 0 } };
    if (row === 1 && col === 1) return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: 0 }, action: null };
    if (row === 1 && col === 2) return { tilePreview: { kind: "relativeToPlayer", dx: 1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 1, dy: 0 } };
    if (row === 2 && col === 1) return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: 1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: 1 } };
    return { action: null };
  }

  // src/platform/tic80/layout.ts
  var SCREEN_WIDTH = 240;
  var SCREEN_HEIGHT = 136;
  var PANEL_LEFT_WIDTH = 120;
  var PANEL_RIGHT_WIDTH = SCREEN_WIDTH - PANEL_LEFT_WIDTH;
  var GRID_COLS = 3;
  var GRID_ROWS = 3;
  var CELL_SIZE_PX = 32;
  var CELL_GAP_PX = 4;
  var GRID_WIDTH_PX = GRID_COLS * CELL_SIZE_PX + (GRID_COLS - 1) * CELL_GAP_PX;
  var GRID_HEIGHT_PX = GRID_ROWS * CELL_SIZE_PX + (GRID_ROWS - 1) * CELL_GAP_PX;
  var GRID_ORIGIN_X = PANEL_LEFT_WIDTH + Math.floor((PANEL_RIGHT_WIDTH - GRID_WIDTH_PX) / 2);
  var RIGHT_PANEL_HEADER_H = 18;
  var GRID_ORIGIN_Y = RIGHT_PANEL_HEADER_H + 4;
  function hitTestGridCell(mouseX, mouseY) {
    if (mouseX < GRID_ORIGIN_X) return null;
    if (mouseX >= GRID_ORIGIN_X + GRID_WIDTH_PX) return null;
    if (mouseY < GRID_ORIGIN_Y) return null;
    if (mouseY >= GRID_ORIGIN_Y + GRID_HEIGHT_PX) return null;
    const relX = mouseX - GRID_ORIGIN_X;
    const relY = mouseY - GRID_ORIGIN_Y;
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    const col = Math.floor(relX / pitch);
    const row = Math.floor(relY / pitch);
    const inCellX = relX - col * pitch;
    const inCellY = relY - row * pitch;
    if (inCellX >= CELL_SIZE_PX) return null;
    if (inCellY >= CELL_SIZE_PX) return null;
    return { row, col };
  }

  // src/platform/tic80/input.ts
  function sampleMouse() {
    const m = mouse();
    const out = { mouseX: m[0], mouseY: m[1], mouseLeftDown: !!m[2] };
    return out;
  }
  function deriveRenderHints(state2, mouseX, mouseY) {
    const cell = hitTestGridCell(mouseX, mouseY);
    if (!cell) return { rightGridHoverCell: null };
    const def = getRightGridCellDef(state2, cell.row, cell.col);
    if (!def.action) return { rightGridHoverCell: null };
    return { rightGridHoverCell: cell };
  }
  function actionForClick(state2, mouseX, mouseY) {
    const cell = hitTestGridCell(mouseX, mouseY);
    if (!cell) return null;
    const { row, col } = cell;
    const def = getRightGridCellDef(state2, row, col);
    const a = def.action;
    return a || null;
  }

  // src/platform/tic80/uiConstants.ts
  var UI_COLOR_BG = 0;
  var UI_COLOR_TEXT = 12;
  var UI_COLOR_DIM = 15;
  var UI_COLOR_GOOD = 5;
  var UI_COLOR_WARN = 4;
  var UI_COLOR_BAD = 2;
  var UI_COLOR_POI_NAME = 11;
  var UI_COLOR_POI_DESC = 13;
  var UI_COLOR_GRID_HOVER_TINT = 15;
  var UI_ILLUSTRATION_SCALE = 4;
  var UI_TEXTURE_TILE_PX = 8;
  var UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR = 8;
  var UI_MAP_VIEWPORT_CELLS = 9;
  var UI_MAP_CELL_PITCH_PX = 6;
  var UI_MAP_POI_TEXT_COLOR = 13;
  var UI_MAP_POI_UNCOMMITTED_TEXT_COLOR = UI_COLOR_BG;
  var UI_MAP_POI_TEXT_OFFSET_X_PX = 1;
  var UI_PREVIEW_PLATE_PAD = 2;
  var UI_PREVIEW_PLATE_W = 42;
  var UI_PREVIEW_PLATE_INSET = 2;
  var UI_RIGHT_GRID_SPRITE_SCALE = 2;
  var UI_RIGHT_GRID_SPRITE_W = 2;
  var UI_RIGHT_GRID_SPRITE_H = 2;
  var UI_RIGHT_GRID_COLORKEY = 0;
  var UI_LEFT_PANEL_PADDING = 7;
  var UI_LEFT_PANEL_INNER_GAP = 6;
  var UI_STATUS_ICON_SIZE = 8;
  var UI_HERO_RESOURCE_GAP_PX = 2;
  var UI_AFTER_RESOURCES_GAP_PX = 2;
  var UI_ARMY_ICON_W_PX = 16;
  var UI_ARMY_ICON_H_PX = 16;
  var UI_ARMY_VALUE_OFFSET_X = UI_ARMY_ICON_W_PX + 3;
  var UI_ARMY_VALUE_OFFSET_Y = 5;
  var UI_DELTA_OFFSET_X = 2;
  var UI_DELTA_OFFSET_Y = 2;
  var UI_DELTA_RISE_PX = 6;
  var UI_DELTA_GAP_PX = -4;
  var UI_FOOD_ICON_W_PX = 16;
  var UI_FOOD_ICON_H_PX = 16;
  var UI_ICON_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3;
  var UI_ICON_VALUE_OFFSET_Y = 5;
  var UI_GOLD_ICON_W_PX = 16;
  var UI_GOLD_ICON_H_PX = 16;
  var UI_GOLD_VALUE_OFFSET_X = UI_GOLD_ICON_W_PX + 3;
  var UI_GOLD_VALUE_OFFSET_Y = 5;
  var UI_SMALL_STATS_START_OFFSET_Y = UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX + UI_FOOD_ICON_H_PX + UI_AFTER_RESOURCES_GAP_PX;

  // src/platform/tic80/nineSlice.ts
  function int(n) {
    return Math.floor(n);
  }
  function clampInt(n, min) {
    return Math.max(min, int(n));
  }
  function withClip(x, y, w, h, draw) {
    clip(x, y, w, h);
    draw();
    clip();
  }
  function drawTiledHoriz(spriteId, x, y, w, stepPx, colorkey, scale) {
    for (let dx = 0; dx < w; dx += stepPx) spr(spriteId, x + dx, y, colorkey, scale);
  }
  function drawTiledVert(spriteId, x, y, h, stepPx, colorkey, scale) {
    for (let dy = 0; dy < h; dy += stepPx) spr(spriteId, x, y + dy, colorkey, scale);
  }
  function drawNineSliceFrame(x, y, w, h, sprites, opts = {}) {
    const tilePx = clampInt(opts.tilePx ?? 8, 1);
    const scale = clampInt(opts.scale ?? 1, 1);
    const colorkey = opts.colorkey ?? 0;
    const wPx = int(w);
    const hPx = int(h);
    if (wPx <= 0) return;
    if (hPx <= 0) return;
    const tileScreenPx = tilePx * scale;
    if (wPx < tileScreenPx * 2 || hPx < tileScreenPx * 2) {
      const c = opts.fallbackBorderColor;
      if (c != null) rectb(x, y, wPx, hPx, c);
      return;
    }
    const x0 = int(x);
    const y0 = int(y);
    const x1 = x0 + wPx - tileScreenPx;
    const y1 = y0 + hPx - tileScreenPx;
    const innerW = wPx - tileScreenPx * 2;
    const innerH = hPx - tileScreenPx * 2;
    spr(sprites.tl, x0, y0, colorkey, scale);
    spr(sprites.tr, x1, y0, colorkey, scale);
    spr(sprites.bl, x0, y1, colorkey, scale);
    spr(sprites.br, x1, y1, colorkey, scale);
    withClip(x0 + tileScreenPx, y0, innerW, tileScreenPx, () => {
      drawTiledHoriz(sprites.t, x0 + tileScreenPx, y0, innerW, tileScreenPx, colorkey, scale);
    });
    withClip(x0 + tileScreenPx, y1, innerW, tileScreenPx, () => {
      drawTiledHoriz(sprites.b, x0 + tileScreenPx, y1, innerW, tileScreenPx, colorkey, scale);
    });
    withClip(x0, y0 + tileScreenPx, tileScreenPx, innerH, () => {
      drawTiledVert(sprites.l, x0, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale);
    });
    withClip(x1, y0 + tileScreenPx, tileScreenPx, innerH, () => {
      drawTiledVert(sprites.r, x1, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale);
    });
  }

  // src/platform/tic80/rightGridRenderPlan.ts
  function crossRevealIndex(row, col) {
    if (row === 0 && col === 1) return 0;
    if (row === 1 && col === 0) return 1;
    if (row === 2 && col === 1) return 2;
    if (row === 1 && col === 2) return 3;
    if (row === 1 && col === 1) return 4;
    return -1;
  }
  function spriteIdForModeCrossCell(s, mode, row, col) {
    if (mode === "blank") return null;
    const pos = s.player.position;
    const provider = mode === "overworld" ? null : MECHANIC_INDEX.previewEncounterByEncounterKind[mode];
    const s2 = { ...s, encounter: provider ? provider() : null };
    const def = getRightGridCellDef(s2, row, col);
    if (def.spriteId != null) return def.spriteId;
    if (def.tilePreview && def.tilePreview.kind === "relativeToPlayer") {
      return getSpriteIdAt(s.world, pos.x + def.tilePreview.dx, pos.y + def.tilePreview.dy);
    }
    return null;
  }
  function previewSpriteIdForCell(s, row, col) {
    let transition = null;
    if (ENABLE_ANIMATIONS) {
      const anims = s.ui.anim.active;
      for (let i = 0; i < anims.length; i++) {
        const a = anims[i];
        if (a.kind === "gridTransition") {
          transition = a;
          break;
        }
      }
    }
    if (transition) {
      const frame = s.ui.clock.frame | 0;
      const start = transition.startFrame | 0;
      if (frame >= start) {
        const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0);
        const t = Math.max(0, frame - start);
        const phase = Math.floor(t / stepFrames);
        const idx = crossRevealIndex(row, col);
        if (idx >= 0) {
          const mode = phase >= idx ? transition.params.to : transition.params.from;
          return spriteIdForModeCrossCell(s, mode, row, col);
        }
      }
    }
    const def = getRightGridCellDef(s, row, col);
    if (def.spriteId != null) return def.spriteId;
    if (def.tilePreview && def.tilePreview.kind === "relativeToPlayer") {
      const p = s.player.position;
      return getSpriteIdAt(s.world, p.x + def.tilePreview.dx, p.y + def.tilePreview.dy);
    }
    return null;
  }
  function cellOriginPx(row, col) {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    return { x: GRID_ORIGIN_X + col * pitch, y: GRID_ORIGIN_Y + row * pitch };
  }
  function spriteOriginInCellPx(row, col) {
    const spriteSize = 16 * UI_RIGHT_GRID_SPRITE_SCALE;
    const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2);
    const o = cellOriginPx(row, col);
    return { x: o.x + spriteOffset, y: o.y + spriteOffset };
  }
  function rectOp(x, y, w, h, color) {
    return { kind: "rect", x, y, w, h, color };
  }
  function sprOp(spriteId, x, y) {
    return {
      kind: "spr",
      spriteId,
      x,
      y,
      colorkey: UI_RIGHT_GRID_COLORKEY,
      scale: UI_RIGHT_GRID_SPRITE_SCALE,
      w: UI_RIGHT_GRID_SPRITE_W,
      h: UI_RIGHT_GRID_SPRITE_H,
      flip: 0,
      rotate: 0
    };
  }
  function drawHoverTintOps(cell) {
    const o = cellOriginPx(cell.row, cell.col);
    return [rectOp(o.x, o.y, CELL_SIZE_PX, CELL_SIZE_PX, UI_COLOR_GRID_HOVER_TINT)];
  }
  function hoverCellFromHints(hints) {
    return hints.rightGridHoverCell;
  }
  function findMoveSlideAnim(s) {
    if (!ENABLE_ANIMATIONS) return null;
    const anims = s.ui.anim.active;
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (a.kind === "moveSlide") return a;
    }
    return null;
  }
  function isMetaCornerCell(cell) {
    return cell.row === 0 && cell.col === 0 || // goal
    cell.row === 0 && cell.col === 2 || // map
    cell.row === 2 && cell.col === 0 || // minimap
    cell.row === 2 && cell.col === 2;
  }
  function rightPanelBoundsPx() {
    return {
      x: PANEL_LEFT_WIDTH,
      y: 0,
      w: PANEL_RIGHT_WIDTH,
      h: SCREEN_HEIGHT
    };
  }
  function gridBoundsPx() {
    return {
      x: GRID_ORIGIN_X,
      y: GRID_ORIGIN_Y,
      w: GRID_WIDTH_PX,
      h: CELL_SIZE_PX * GRID_ROWS + CELL_GAP_PX * (GRID_ROWS - 1)
    };
  }
  function maskOutsideGridOps() {
    const panel = rightPanelBoundsPx();
    const grid = gridBoundsPx();
    const ops = [];
    if (grid.y > panel.y) ops.push(rectOp(panel.x, panel.y, panel.w, grid.y - panel.y, UI_COLOR_BG));
    const bottomY = grid.y + grid.h;
    const panelBottomY = panel.y + panel.h;
    if (panelBottomY > bottomY) ops.push(rectOp(panel.x, bottomY, panel.w, panelBottomY - bottomY, UI_COLOR_BG));
    if (grid.x > panel.x) ops.push(rectOp(panel.x, grid.y, grid.x - panel.x, grid.h, UI_COLOR_BG));
    const rightX = grid.x + grid.w;
    const panelRightX = panel.x + panel.w;
    if (panelRightX > rightX) ops.push(rectOp(rightX, grid.y, panelRightX - rightX, grid.h, UI_COLOR_BG));
    return ops;
  }
  function maskGridGapsOps() {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    const gx0 = GRID_ORIGIN_X + CELL_SIZE_PX;
    const gx1 = GRID_ORIGIN_X + pitch + CELL_SIZE_PX;
    const gy0 = GRID_ORIGIN_Y + CELL_SIZE_PX;
    const gy1 = GRID_ORIGIN_Y + pitch + CELL_SIZE_PX;
    const row0Y = GRID_ORIGIN_Y + 0 * pitch;
    const row2Y = GRID_ORIGIN_Y + 2 * pitch;
    const col0X = GRID_ORIGIN_X + 0 * pitch;
    const col2X = GRID_ORIGIN_X + 2 * pitch;
    return [
      // Vertical gap segments (4): only rows 0 and 2.
      rectOp(gx0, row0Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      rectOp(gx0, row2Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      rectOp(gx1, row0Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      rectOp(gx1, row2Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      // Horizontal gap segments (4): only cols 0 and 2.
      rectOp(col0X, gy0, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG),
      rectOp(col2X, gy0, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG),
      rectOp(col0X, gy1, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG),
      rectOp(col2X, gy1, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG)
    ];
  }
  function buildStaticPlan(s, hover) {
    const ops = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (hover && hover.row === row && hover.col === col) ops.push(...drawHoverTintOps({ row, col }));
        const spriteId = previewSpriteIdForCell(s, row, col);
        if (spriteId == null) continue;
        const o = spriteOriginInCellPx(row, col);
        ops.push(sprOp(spriteId, o.x, o.y));
      }
    }
    return { ops };
  }
  function buildMoveSlidePlan(s, anim, hover) {
    const frame = s.ui.clock.frame | 0;
    const startFrame = anim.startFrame | 0;
    const durationFrames = Math.max(1, anim.durationFrames | 0);
    const t = Math.max(0, Math.min(durationFrames, frame - startFrame));
    const pX = CELL_SIZE_PX + CELL_GAP_PX;
    const dx = anim.params.dx | 0;
    const dy = anim.params.dy | 0;
    const shiftX = -dx * pX;
    const shiftY = -dy * pX;
    const offX = Math.floor(shiftX * t / durationFrames);
    const offY = Math.floor(shiftY * t / durationFrames);
    const fromPos = anim.params.fromPos;
    const toPos = anim.params.toPos;
    const ops = [];
    const cross = [
      { row: 0, col: 1, ox: 0, oy: -1 },
      { row: 1, col: 0, ox: -1, oy: 0 },
      { row: 1, col: 1, ox: 0, oy: 0 },
      { row: 1, col: 2, ox: 1, oy: 0 },
      { row: 2, col: 1, ox: 0, oy: 1 }
    ];
    if (hover && !isMetaCornerCell(hover)) ops.push(...drawHoverTintOps(hover));
    for (let i = 0; i < cross.length; i++) {
      const c = cross[i];
      const spriteId = getSpriteIdAt(s.world, fromPos.x + c.ox, fromPos.y + c.oy);
      const o = spriteOriginInCellPx(c.row, c.col);
      ops.push(sprOp(spriteId, o.x + offX, o.y + offY));
    }
    for (let i = 0; i < cross.length; i++) {
      const c = cross[i];
      const spriteId = getSpriteIdAt(s.world, toPos.x + c.ox, toPos.y + c.oy);
      const o = spriteOriginInCellPx(c.row, c.col);
      ops.push(sprOp(spriteId, o.x + offX - shiftX, o.y + offY - shiftY));
    }
    ops.push(...maskOutsideGridOps(), ...maskGridGapsOps());
    const corners = [
      { row: 0, col: 0, spriteId: SPRITES.buttons.goal },
      { row: 2, col: 0, spriteId: SPRITES.buttons.minimap },
      { row: 2, col: 2, spriteId: SPRITES.buttons.restart },
      { row: 0, col: 2, spriteId: SPRITES.buttons.map }
    ];
    for (let i = 0; i < corners.length; i++) {
      const c = corners[i];
      const cellO = cellOriginPx(c.row, c.col);
      ops.push(rectOp(cellO.x, cellO.y, CELL_SIZE_PX, CELL_SIZE_PX, UI_COLOR_BG));
      if (hover && hover.row === c.row && hover.col === c.col) ops.push(...drawHoverTintOps({ row: c.row, col: c.col }));
      if (c.spriteId != null) {
        const o = spriteOriginInCellPx(c.row, c.col);
        ops.push(sprOp(c.spriteId, o.x, o.y));
      }
    }
    return { ops };
  }
  function buildRightGridRenderPlan(s, hints) {
    const hover = hoverCellFromHints(hints);
    const moveSlide = findMoveSlideAnim(s);
    if (!moveSlide) return buildStaticPlan(s, hover);
    return buildMoveSlidePlan(s, moveSlide, hover);
  }

  // src/platform/tic80/render.ts
  function renderFrame(s, hints) {
    cls(UI_COLOR_BG);
    drawRightPanel(s, hints);
    drawLeftPanel(s);
  }
  function formatA1(position) {
    const col = String.fromCharCode("A".charCodeAt(0) + position.x);
    const row = String(position.y + 1);
    return col + row;
  }
  function formatPositionLabel(s) {
    return s.run.knowsPosition ? formatA1(s.player.position) : LOST_COORD_LABEL;
  }
  function wrapText(text, maxChars) {
    const paragraphs = String(text || "").split("\n");
    const out = [];
    for (let p = 0; p < paragraphs.length; p++) {
      const words = String(paragraphs[p] || "").split(/\s+/).filter(Boolean);
      let line = "";
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (next.length > maxChars && line) {
          out.push(line);
          line = w;
        } else {
          line = next;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }
  function loreLinesForMessage(message, maxChars) {
    const rawMessage = String(message || "");
    const firstNl = rawMessage.indexOf("\n");
    const title = firstNl >= 0 ? rawMessage.slice(0, firstNl) : "";
    const body = firstNl >= 0 ? rawMessage.slice(firstNl + 1) : rawMessage;
    const out = [];
    const titleLines = title ? wrapText(title, maxChars) : [];
    const bodyLines = body ? wrapText(body, maxChars) : [];
    for (let i = 0; i < titleLines.length; i++) out.push({ text: titleLines[i], color: UI_COLOR_POI_NAME });
    for (let i = 0; i < bodyLines.length; i++) out.push({ text: bodyLines[i], color: UI_COLOR_POI_DESC });
    return out;
  }
  function drawIllustrationWithTextureOverlay(spriteId, x, y) {
    spr(spriteId, x, y, -1, UI_ILLUSTRATION_SCALE, 0, 0, 2, 2);
    const illPx = 16 * UI_ILLUSTRATION_SCALE;
    for (let oy = 0; oy < illPx; oy += UI_TEXTURE_TILE_PX) {
      for (let ox = 0; ox < illPx; ox += UI_TEXTURE_TILE_PX) {
        spr(SPRITES.ui8x8.previewGrain, x + ox, y + oy, UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR, 1);
      }
    }
  }
  function drawPreviewPlateChrome(lines, illX, illY, illSize) {
    const platePad = UI_PREVIEW_PLATE_PAD;
    const plateW = UI_PREVIEW_PLATE_W;
    const plateH = 16 * lines.length + platePad * 2;
    const plateX = illX + illSize - plateW - UI_PREVIEW_PLATE_INSET;
    const plateY = illY + UI_PREVIEW_PLATE_INSET;
    rect(plateX, plateY, plateW, plateH, UI_COLOR_BG);
    rectb(plateX, plateY, plateW, plateH, UI_COLOR_DIM);
    const firstIconX = plateX + platePad;
    const firstIconY = plateY + platePad;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const iconX = firstIconX;
      const iconY = firstIconY + i * 16;
      spr(ln.spriteId, iconX, iconY, 0, 1, 0, 0, 2, 2);
      const valueX = iconX + UI_ICON_VALUE_OFFSET_X;
      const valueY = iconY + UI_ICON_VALUE_OFFSET_Y;
      print(ln.text, valueX, valueY, UI_COLOR_TEXT);
    }
    return { firstIconX, firstIconY };
  }
  function plateAnchorsFromSpecs(specs, geom) {
    const anchors = {};
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const anchor = {
        x: geom.firstIconX,
        y: geom.firstIconY + spec.lineIndex * 16
      };
      if (spec.goodSign != null) anchor.goodSign = spec.goodSign;
      anchors[spec.target] = anchor;
    }
    return anchors;
  }
  function drawDeltaOverlays(s, anchors) {
    if (!ENABLE_ANIMATIONS) return;
    const anims = s.ui.anim.active;
    const frame = s.ui.clock.frame;
    const cursorByTarget = {};
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (a.kind !== "delta") continue;
      const anchor = anchors[a.params.target];
      if (!anchor) continue;
      const delta = a.params.delta;
      if (!delta) continue;
      const dur = Math.max(1, a.durationFrames);
      const t = Math.max(0, Math.min(dur, frame - a.startFrame));
      const p = t / dur;
      const label = delta > 0 ? `+${delta}` : `${delta}`;
      const goodSign = anchor.goodSign ?? 1;
      const color = delta * goodSign > 0 ? UI_COLOR_GOOD : UI_COLOR_BAD;
      const dy = UI_DELTA_OFFSET_Y - Math.floor(p * UI_DELTA_RISE_PX);
      const xCursor = cursorByTarget[a.params.target] ?? anchor.x + UI_DELTA_OFFSET_X;
      print(label, xCursor, anchor.y + dy, color);
      cursorByTarget[a.params.target] = xCursor + label.length * 6 + UI_DELTA_GAP_PX;
    }
  }
  function drawMap(s, x, y, sizePx) {
    const { markers } = computeGameMapView(s);
    const w = Math.max(1, s.world.width);
    const h = Math.max(1, s.world.height);
    const viewport = Math.max(1, UI_MAP_VIEWPORT_CELLS);
    const pitch = Math.max(1, UI_MAP_CELL_PITCH_PX);
    const radius = Math.floor(viewport / 2);
    const gridX = x + Math.floor((sizePx - pitch * viewport) / 2);
    const gridY = y + Math.floor((sizePx - pitch * viewport) / 2);
    const centerX = gridX + radius * pitch;
    const centerY = gridY + radius * pitch;
    const px = s.player.position.x;
    const py = s.player.position.y;
    for (let vy = -radius; vy <= radius; vy++) {
      for (let vx = -radius; vx <= radius; vx++) {
        spr(SPRITES.ui8x8.mapBackground, centerX + vx * pitch, centerY + vy * pitch, 0);
      }
    }
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const dx = torusDelta(px, m.pos.x, w);
      const dy = torusDelta(py, m.pos.y, h);
      if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue;
      const color = m.isMapped ? UI_MAP_POI_TEXT_COLOR : UI_MAP_POI_UNCOMMITTED_TEXT_COLOR;
      print(m.label, centerX + dx * pitch + UI_MAP_POI_TEXT_OFFSET_X_PX, centerY + dy * pitch, color);
    }
    spr(SPRITES.ui8x8.mapHereMarker, centerX - 1, centerY - 1, 0);
  }
  function drawLeftPanel(s) {
    rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI_COLOR_BG);
    const frame = s.resources.hasBronzeKey ? SPRITES.ui8x8.panelBorderBronze : SPRITES.ui8x8.panelBorder;
    drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, frame, {
      tilePx: 8,
      scale: 1,
      colorkey: 0,
      fallbackBorderColor: UI_COLOR_DIM
    });
    const encounterKind = s.encounter?.kind ?? null;
    const pos = s.player.position;
    const spriteIdAtPos = getSpriteIdAt(s.world, pos.x, pos.y);
    const leftPanel = s.ui.leftPanel;
    const illSize = 16 * UI_ILLUSTRATION_SCALE;
    const illX = UI_LEFT_PANEL_PADDING;
    const illY = UI_LEFT_PANEL_PADDING;
    if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
      drawMinimap(s);
    } else if (leftPanel.kind === LEFT_PANEL_KIND_MAP) {
      drawMap(s, illX, illY, illSize);
    } else if (leftPanel.kind === LEFT_PANEL_KIND_SPRITE) {
      drawIllustrationWithTextureOverlay(leftPanel.spriteId, illX, illY);
    } else if (s.run.isGameOver) {
      drawIllustrationWithTextureOverlay(SPRITES.cosmetics.tombstoneIllustration, illX, illY);
    } else {
      drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY);
      if (encounterKind) {
        const provider = MECHANIC_INDEX.previewPlateByEncounterKind[encounterKind];
        const lines = provider?.(s) ?? null;
        if (lines && lines.length) {
          const geom = drawPreviewPlateChrome(lines, illX, illY, illSize);
          const anchorSpecs = MECHANIC_INDEX.previewPlateDeltaAnchorsByEncounterKind[encounterKind];
          if (anchorSpecs && anchorSpecs.length) {
            drawDeltaOverlays(s, plateAnchorsFromSpecs(anchorSpecs, geom));
          }
        }
      }
    }
    const statusX = illX + illSize + UI_LEFT_PANEL_INNER_GAP;
    const statusY = illY;
    const fontH = 6;
    const messageLineH = fontH + 1;
    const armyX = statusX;
    const armyY = statusY;
    spr(SPRITES.stats.troop, armyX, armyY, -1, 1, 0, 0, 2, 2);
    const armyValueX = armyX + UI_ARMY_VALUE_OFFSET_X;
    const armyValueY = armyY + UI_ARMY_VALUE_OFFSET_Y;
    const armyColor = s.resources.armySize < 6 ? UI_COLOR_WARN : UI_COLOR_TEXT;
    print(`${s.resources.armySize}`, armyValueX, armyValueY, armyColor);
    const foodX = statusX;
    const foodY = armyY + UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX;
    spr(SPRITES.stats.food, foodX, foodY, -1, 1, 0, 0, 2, 2);
    const foodValueX = foodX + UI_ICON_VALUE_OFFSET_X;
    const foodValueY = foodY + UI_ICON_VALUE_OFFSET_Y;
    const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? UI_COLOR_WARN : UI_COLOR_TEXT;
    print(`${s.resources.food}`, foodValueX, foodValueY, foodColor);
    const goldX = statusX;
    const goldY = foodY + UI_FOOD_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX;
    spr(SPRITES.stats.gold, goldX, goldY, -1, 1, 0, 0, 2, 2);
    const goldValueX = goldX + UI_GOLD_VALUE_OFFSET_X;
    const goldValueY = goldY + UI_GOLD_VALUE_OFFSET_Y;
    print(`${s.resources.gold}`, goldValueX, goldValueY, UI_COLOR_TEXT);
    drawDeltaOverlays(s, {
      army: { x: armyX, y: armyY },
      food: { x: foodX, y: foodY },
      gold: { x: goldX, y: goldY }
    });
    const statusBottomY = goldY + UI_GOLD_ICON_H_PX + UI_AFTER_RESOURCES_GAP_PX;
    const headerBottomY = Math.max(illY + illSize, statusBottomY);
    const msgY = headerBottomY + 4;
    const headline = s.run.isGameOver ? { text: "GAME OVER", color: UI_COLOR_BAD } : s.run.hasWon ? { text: "YOU WIN", color: UI_COLOR_GOOD } : null;
    const headlineRows = headline ? 1 : 0;
    const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH) - headlineRows);
    const lore = loreLinesForMessage(s.ui.message, LORE_MAX_CHARS_PER_LINE);
    const textStartY = headline ? msgY + messageLineH : msgY;
    if (headline) print(headline.text, UI_LEFT_PANEL_PADDING, msgY, headline.color);
    let printed = 0;
    for (let i = 0; i < lore.length && printed < maxLines; i++) {
      const line = lore[i];
      print(line.text, UI_LEFT_PANEL_PADDING, textStartY + printed * messageLineH, line.color);
      printed++;
    }
  }
  function drawRightPanel(s, hints) {
    const plan = buildRightGridRenderPlan(s, hints);
    drawRightGridOps(plan.ops);
    drawRightTopBar(s);
  }
  function drawRightTopBar(s) {
    const x0 = GRID_ORIGIN_X;
    const y0 = 0;
    const w = GRID_WIDTH_PX;
    const h = RIGHT_PANEL_HEADER_H;
    rect(x0, y0, w, h, UI_COLOR_BG);
    rectb(x0, y0, w, h, UI_COLOR_DIM);
    const padX = 2;
    const iconY = y0 + 2;
    const valueY = y0 + 11;
    const iconGap = 2;
    let rightInset = 0;
    if (s.resources.hasBronzeKey) rightInset += 16 + iconGap;
    if (s.resources.hasScout) rightInset += 16 + iconGap;
    if (s.resources.hasTameBeast) rightInset += 16 + iconGap;
    if (rightInset) rightInset -= iconGap;
    const statsMaxX = x0 + w - padX - rightInset;
    const itemW = 18;
    const itemGap = 2;
    const valueMaxChars = 3;
    const formatValue = (raw) => {
      const s2 = String(raw || "");
      if (s2.length <= valueMaxChars) return s2;
      return s2.slice(-valueMaxChars);
    };
    const drawStatItem = (idx, iconSpriteId, rawValue) => {
      const xItem = x0 + padX + idx * (itemW + itemGap);
      if (xItem + itemW > statsMaxX) return;
      const value = formatValue(rawValue);
      const valueW = value.length * 6;
      const xRight = xItem + itemW;
      const valueX = xRight - valueW;
      const iconX = xRight - UI_STATUS_ICON_SIZE;
      spr(iconSpriteId, iconX, iconY, -1);
      print(value, valueX, valueY, UI_COLOR_TEXT);
    };
    drawStatItem(0, SPRITES.smallStats8x8.seed, `${s.world.seed}`);
    drawStatItem(1, SPRITES.smallStats8x8.position, formatPositionLabel(s));
    drawStatItem(2, SPRITES.smallStats8x8.steps, `${s.run.stepCount}`);
    let xr = x0 + w - padX - 16;
    const bigIconY = y0 + 1;
    if (s.resources.hasBronzeKey) {
      spr(SPRITES.stats.key, xr, bigIconY, 0, 1, 0, 0, 2, 2);
      xr -= 16 + 2;
    }
    if (s.resources.hasScout) {
      spr(SPRITES.stats.scout, xr, bigIconY, 0, 1, 0, 0, 2, 2);
      xr -= 16 + 2;
    }
    if (s.resources.hasTameBeast) {
      spr(SPRITES.cosmetics.beastIllustration, xr, bigIconY, 0, 1, 0, 0, 2, 2);
      xr -= 16 + 2;
    }
  }
  function drawRightGridOps(ops) {
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.kind === "rect") rect(op.x, op.y, op.w, op.h, op.color);
      else spr(op.spriteId, op.x, op.y, op.colorkey, op.scale, op.flip, op.rotate, op.w, op.h);
    }
  }
  var MINIMAP_CELL_PX = 6;
  var MINIMAP_TILE_CACHE = {};
  function getMinimapTilePixels(tileId) {
    const k = tileId | 0;
    const cached = MINIMAP_TILE_CACHE[k];
    if (cached) return cached;
    const scratchX = UI_LEFT_PANEL_PADDING;
    const scratchY = UI_LEFT_PANEL_PADDING;
    spr(k, scratchX, scratchY, -1, 1, 0, 0, 2, 2);
    const out = [];
    for (let py = 0; py < MINIMAP_CELL_PX; py++) {
      for (let px = 0; px < MINIMAP_CELL_PX; px++) {
        const off = (16 - MINIMAP_CELL_PX) / 2 | 0;
        const sx = scratchX + off + px;
        const sy = scratchY + off + py;
        out.push(pix(sx, sy));
      }
    }
    rect(scratchX, scratchY, 16, 16, UI_COLOR_BG);
    MINIMAP_TILE_CACHE[k] = out;
    return out;
  }
  function drawMinimap(s) {
    const world = s.world;
    const illX = UI_LEFT_PANEL_PADDING;
    const illY = UI_LEFT_PANEL_PADDING;
    const margin = 2;
    const cellPx = MINIMAP_CELL_PX;
    const originX = illX + margin;
    const originY = illY + margin;
    const present = {};
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        present[getSpriteIdAt(world, x, y) | 0] = true;
      }
    }
    for (const k in present) getMinimapTilePixels(Number(k));
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const spriteId = getSpriteIdAt(world, x, y);
        const mini = getMinimapTilePixels(spriteId);
        const dx = originX + x * cellPx;
        const dy = originY + y * cellPx;
        let i = 0;
        for (let py = 0; py < cellPx; py++) {
          for (let px = 0; px < cellPx; px++) {
            pix(dx + px, dy + py, mini[i++]);
          }
        }
      }
    }
    const p = s.player.position;
    rectb(originX + p.x * cellPx, originY + p.y * cellPx, cellPx, cellPx, UI_COLOR_TEXT);
  }

  // src/platform/tic80/entry.ts
  var state = null;
  var prevMouseLeftDown = false;
  function TIC() {
    const { mouseX, mouseY, mouseLeftDown } = sampleMouse();
    const justPressed = mouseLeftDown && !prevMouseLeftDown;
    prevMouseLeftDown = mouseLeftDown;
    if (state == null) state = processAction(null, { type: ACTION_NEW_RUN, seed: INITIAL_SEED });
    if (state == null) return;
    state = processAction(state, { type: ACTION_TICK });
    if (state == null) return;
    if (justPressed && !hasBlockingAnim(state.ui)) {
      const action = actionForClick(state, mouseX, mouseY);
      if (action) {
        const next = processAction(state, action);
        if (next) state = next;
      }
    }
    const hints = deriveRenderHints(state, mouseX, mouseY);
    renderFrame(state, hints);
  }
  globalThis.TIC = TIC;
})();

// title:  The Unbound (prototype 0.4.0)
// author: haulin
// desc:   Prototype 0.4.0 toward the North Star
// script: js
// input:  mouse

