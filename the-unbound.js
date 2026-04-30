// title:  The Unbound (prototype 0.0.9)
// author: haulin
// desc:   Prototype 0.0.9 toward the North Star
// script: js
// input:  mouse

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 haulin
// See LICENSE for full text.


"use strict";
(() => {
  // src/core/constants.ts
  var WORLD_WIDTH = 10;
  var WORLD_HEIGHT = 10;
  var INITIAL_SEED = 14;
  var ENABLE_ANIMATIONS = true;
  var TILE_GATE = 68;
  var TILE_GATE_OPEN = 70;
  var TILE_LOCKSMITH = 72;
  var TILE_SIGNPOST = 42;
  var TILE_FARM = 38;
  var TILE_CAMP = 36;
  var TILE_HENGE = 66;
  var TILE_MOUNTAIN = 6;
  var TILE_SWAMP = 12;
  var SIGNPOST_COUNT = 6;
  var GATE_LOCKSMITH_MIN_DISTANCE = 7;
  var CAMP_COUNT = 3;
  var CAMP_COOLDOWN_MOVES = 3;
  var CAMP_FOOD_GAIN = 2;
  var HENGE_COUNT = 3;
  var INITIAL_ARMY_SIZE = 10;
  var ARMY_SPRITE_ID = 100;
  var MAP_GEN_NOISE = "NOISE";
  var MAP_GEN_ALGORITHM = MAP_GEN_NOISE;
  var NOISE_SMOOTH_PASSES = 2;
  var NOISE_VALUE_MAX = 1e4;
  var GOAL_NARRATIVE = "The road never ends. It only returns.\nThey say there is a bronze gate that breaks the circle.\nYou mean to find out.";
  var BRONZE_KEY_FOOD_COST = 10;
  var GATE_NAME = "The Gate";
  var LOCKSMITH_NAME = "Locksmith of the Unbound";
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
    "They take what you offer and give you what you came for."
  ];
  var LOCKSMITH_VISITED_LINES = ["The forge is cold. The work is done.", "Nothing left to make for you here."];
  var LOCKSMITH_NO_FOOD_LINES = [
    "No heat, no key.",
    "Come back with enough. The fire needs feeding first.",
    "Others have paid for this before you. Most of them got further than you'd think."
  ];
  var TERRAIN_MESSAGE_BY_TILE_ID = {
    2: "The grass bends with your passing.",
    // grass
    4: "The road here remembers other feet.",
    // road / gravel
    6: "The peaks ahead do not look closer. Stone and thin air. Your supplies will feel it.",
    // mountains
    10: "The water is still. Something moves beneath.",
    // lake
    12: "Crossing the bog is harder than it looks. You'll need to eat well tonight.",
    // swamp
    14: "A path that isn't quite a path.",
    // woods
    34: "The light here bends wrong."
    // rainbow's end
  };
  var INITIAL_FOOD = 15;
  var FOOD_COST_DEFAULT = 1;
  var FOOD_COST_MOUNTAIN = 2;
  var FOOD_COST_SWAMP = 2;
  var FOOD_WARNING_THRESHOLD = 5;
  var FARM_COUNT = 3;
  var FARM_COOLDOWN_MOVES = 3;
  var TERRAIN_KINDS = ["grass", "road", "mountain", "lake", "swamp", "woods", "rainbow"];
  var TERRAIN = {
    grass: { spriteId: 2, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[2] || "" },
    road: { spriteId: 4, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[4] || "" },
    mountain: {
      spriteId: TILE_MOUNTAIN,
      enterFoodCost: FOOD_COST_MOUNTAIN,
      message: TERRAIN_MESSAGE_BY_TILE_ID[TILE_MOUNTAIN] || ""
    },
    lake: { spriteId: 10, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[10] || "" },
    swamp: { spriteId: TILE_SWAMP, enterFoodCost: FOOD_COST_SWAMP, message: TERRAIN_MESSAGE_BY_TILE_ID[TILE_SWAMP] || "" },
    woods: { spriteId: 14, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[14] || "" },
    rainbow: { spriteId: 34, enterFoodCost: FOOD_COST_DEFAULT, message: TERRAIN_MESSAGE_BY_TILE_ID[34] || "" }
  };
  var FEATURES = {
    gate: { spriteId: TILE_GATE, enterFoodCost: FOOD_COST_DEFAULT },
    gateOpen: { spriteId: TILE_GATE_OPEN, enterFoodCost: FOOD_COST_DEFAULT },
    locksmith: { spriteId: TILE_LOCKSMITH, enterFoodCost: FOOD_COST_DEFAULT },
    signpost: { spriteId: TILE_SIGNPOST, enterFoodCost: FOOD_COST_DEFAULT, count: SIGNPOST_COUNT },
    farm: { spriteId: TILE_FARM, enterFoodCost: FOOD_COST_DEFAULT, count: FARM_COUNT, cooldownMoves: FARM_COOLDOWN_MOVES },
    camp: {
      spriteId: TILE_CAMP,
      enterFoodCost: FOOD_COST_DEFAULT,
      count: CAMP_COUNT,
      cooldownMoves: CAMP_COOLDOWN_MOVES,
      foodGain: CAMP_FOOD_GAIN
    },
    henge: { spriteId: TILE_HENGE, enterFoodCost: FOOD_COST_DEFAULT, count: HENGE_COUNT }
  };
  function spriteIdForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "lake":
      case "swamp":
      case "woods":
      case "rainbow":
        return TERRAIN[kind].spriteId;
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
        return FEATURES[kind].spriteId;
    }
  }
  function enterFoodCostForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "lake":
      case "swamp":
      case "woods":
      case "rainbow":
        return TERRAIN[kind].enterFoodCost;
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
        return FEATURES[kind].enterFoodCost;
    }
  }
  function terrainMessageForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "lake":
      case "swamp":
      case "woods":
      case "rainbow":
        return TERRAIN[kind].message;
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
        return "";
    }
  }
  var FOOD_SPRITE_ID = 98;
  var FOOD_DELTA_FRAMES = 24;
  var FARM_NAME_POOL = [
    "The Oast",
    "Burnt Acre",
    "Greyfield",
    "Hob's Reach",
    "The Stemming",
    "Fallow End",
    "Cotter's Rise"
  ];
  var FARM_HARVEST_LINES = [
    "Someone left in a hurry. The stores are still full.",
    "The cellar is cold and deep. You help yourself.",
    "Enough here to keep moving. You take what you need.",
    "Unharvested, but not unwelcome. You gather what you can.",
    "The farmer is long gone. The food remains."
  ];
  var FARM_REVISIT_LINES = [
    "You already took what there was.",
    "The stores are empty now. Come back later.",
    "Nothing left here. It will regrow in time."
  ];
  var CAMP_NAME_POOL = [
    "The Wayrest",
    "Ember Cross",
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
    "Weather Cross"
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
  var GAME_OVER_LINES = [
    "The last of them fell somewhere you won't remember. The world keeps turning.",
    "You came with an army. You leave with nothing.\nThe gate remains closed.",
    "Alone now. The road goes on without you."
  ];
  var COMBAT_AMBUSH_PERCENT = 20;
  var COMBAT_REWARD_MIN = 5;
  var COMBAT_REWARD_MAX = 15;
  var GRID_TRANSITION_STEP_FRAMES = 5;
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
  var COMBAT_VICTORY_EXIT_LINES = ["To the victor go the spoils.", "You took what you could and moved on.", "They will not follow you again."];
  var HENGE_ENCOUNTER_LINE = "You walked into something that was already happening.";
  var HENGE_COOLDOWN_MOVES = 3;
  var ACTION_NEW_RUN = "NEW_RUN";
  var ACTION_RESTART = "RESTART";
  var ACTION_MOVE = "MOVE";
  var ACTION_SHOW_GOAL = "SHOW_GOAL";
  var ACTION_TOGGLE_MINIMAP = "TOGGLE_MINIMAP";
  var ACTION_FIGHT = "FIGHT";
  var ACTION_RETURN = "RETURN";
  var ACTION_TICK = "TICK";
  var MOVE_SLIDE_FRAMES = 15;
  var LORE_MAX_CHARS_PER_LINE = 19;
  var SPR_BUTTON_GOAL = 44;
  var SPR_BUTTON_RESTART = 46;
  var SPR_BUTTON_MINIMAP = 78;

  // src/core/prng.ts
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
  function hashSeedStepCell(opts) {
    const base = seedToRngState(opts.seed | 0);
    const stepMix = u32(Math.imul(opts.stepCount | 0, 2654435761));
    const cellId2 = u32(opts.cellId | 0);
    const salt = u32(opts.salt == null ? 0 : opts.salt | 0);
    return xorshift32(u32(base ^ stepMix ^ cellId2 ^ salt));
  }
  function pickIndex(hash, length) {
    const m = length | 0;
    if (m <= 0) return 0;
    return u32(hash) % m;
  }
  function pickFromPool(pool, hash) {
    if (!pool.length) return void 0;
    return pool[pickIndex(hash, pool.length)];
  }

  // src/core/combat.ts
  function cellIdForPos(world, pos) {
    return pos.y * world.width + pos.x;
  }
  function shouldStartAmbush(opts) {
    const percent = opts.percent;
    if (!Number.isFinite(percent) || percent <= 0) return false;
    const h = hashSeedStepCell({ seed: opts.seed, stepCount: opts.stepCount, cellId: opts.cellId });
    return h % 100 < percent;
  }
  function encounterFlavorIndex(opts) {
    const h = hashSeedStepCell({ seed: opts.seed, stepCount: opts.stepCount, cellId: opts.cellId });
    return pickIndex(h, COMBAT_ENCOUNTER_LINES.length);
  }
  function pickCombatEncounterLine(opts) {
    const idx = encounterFlavorIndex(opts);
    return COMBAT_ENCOUNTER_LINES[idx] || COMBAT_ENCOUNTER_LINES[0] || "";
  }
  function pickCombatExitLine(opts) {
    const pool = opts.outcome === "victory" ? COMBAT_VICTORY_EXIT_LINES : COMBAT_FLEE_EXIT_LINES;
    const salt = opts.outcome === "victory" ? 2654435769 : 2246822507;
    const h = hashSeedStepCell({ seed: opts.seed, stepCount: opts.stepCount, cellId: opts.cellId, salt });
    return pickFromPool(pool, h) || pool[0] || "";
  }
  function spawnEnemyArmy(opts) {
    const playerArmy = Math.max(0, Math.trunc(opts.playerArmy));
    const maxExclusive = playerArmy + 1;
    const r = randInt(opts.rngState, maxExclusive);
    return { rngState: r.rngState, enemyArmy: playerArmy + r.value };
  }
  function resolveFightRound(opts) {
    const playerArmy = Math.max(0, Math.trunc(opts.playerArmy));
    const enemyArmy = Math.max(0, Math.trunc(opts.enemyArmy));
    const w = randInt(opts.rngState, playerArmy + 5);
    const b = randInt(w.rngState, enemyArmy + 5);
    if (w.value >= b.value) {
      const nextEnemyArmy = Math.floor(enemyArmy / 2);
      const killed = enemyArmy - nextEnemyArmy;
      return {
        rngState: b.rngState,
        outcome: "playerHit",
        nextEnemyArmy,
        enemyDelta: nextEnemyArmy - enemyArmy,
        killed
      };
    }
    return {
      rngState: b.rngState,
      outcome: "enemyHit",
      nextEnemyArmy: enemyArmy,
      enemyDelta: 0,
      killed: 0
    };
  }

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

  // src/core/world.ts
  function cellId(x, y) {
    return y * WORLD_WIDTH + x;
  }
  var TERRAIN_KIND_SET = new Set(TERRAIN_KINDS);
  function isTerrainCell(cell) {
    return TERRAIN_KIND_SET.has(cell.kind);
  }
  function torusManhattanDistance(a, b) {
    const dx = torusDelta(a.x, b.x, WORLD_WIDTH);
    const dy = torusDelta(a.y, b.y, WORLD_HEIGHT);
    return manhattan(dx, dy);
  }
  function placeFeature(cells, rngState, opts) {
    const placed = [];
    while (placed.length < opts.count) {
      const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT);
      rngState = r.rngState;
      const x = r.value % WORLD_WIDTH;
      const y = Math.floor(r.value / WORLD_WIDTH);
      const here = cells[y][x];
      if (!opts.canPlaceAt(x, y, here)) continue;
      const built = opts.buildCell(x, y, rngState);
      rngState = built.rngState;
      cells[y][x] = built.cell;
      placed.push({ x, y });
    }
    return { placed, rngState };
  }
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
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const r = randInt(rngState, NOISE_VALUE_MAX);
        rngState = r.rngState;
        row.push(r.value);
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
    return { cells, rngState };
  }
  function placeGate(cells, rngState) {
    const res = placeFeature(cells, rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: (_x, _y, nextRng) => ({ cell: { kind: "gate" }, rngState: nextRng })
    });
    return { gatePos: res.placed[0], rngState: res.rngState };
  }
  function placeLocksmith(cells, rngState, gatePos) {
    const maxPossible = Math.floor(WORLD_WIDTH / 2) + Math.floor(WORLD_HEIGHT / 2);
    const minD = Math.max(0, Math.min(GATE_LOCKSMITH_MIN_DISTANCE | 0, maxPossible));
    const res = placeFeature(cells, rngState, {
      count: 1,
      canPlaceAt: (x, y, here) => isTerrainCell(here) && torusManhattanDistance({ x, y }, gatePos) >= minD,
      buildCell: (_x, _y, nextRng) => ({ cell: { kind: "locksmith" }, rngState: nextRng })
    });
    return { locksmithPos: res.placed[0], rngState: res.rngState };
  }
  function placeNamedFeature(cells, rngState, opts) {
    const remainingNames = [...opts.namePool];
    const res = placeFeature(cells, rngState, {
      count: opts.count,
      canPlaceAt: opts.canPlaceAt,
      buildCell: (x, y, nextRng) => {
        let name = opts.fallbackName;
        if (remainingNames.length > 0) {
          const pick = randInt(nextRng, remainingNames.length);
          nextRng = pick.rngState;
          name = remainingNames.splice(pick.value, 1)[0] || opts.fallbackName;
        }
        return { cell: opts.buildCell(x, y, name), rngState: nextRng };
      }
    });
    return res.rngState;
  }
  function placeNamedFarms(cells, rngState) {
    return placeNamedFeature(cells, rngState, {
      count: FARM_COUNT,
      namePool: FARM_NAME_POOL,
      fallbackName: "A Farm",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: (x, y, name) => ({ kind: "farm", id: cellId(x, y), name, nextReadyStep: 0 })
    });
  }
  function placeNamedCamps(cells, rngState) {
    return placeNamedFeature(cells, rngState, {
      count: CAMP_COUNT,
      namePool: CAMP_NAME_POOL,
      fallbackName: "A Camp",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: (x, y, name) => ({ kind: "camp", id: cellId(x, y), name, nextReadyStep: 0 })
    });
  }
  function placeHenges(cells, rngState) {
    return placeNamedFeature(cells, rngState, {
      count: HENGE_COUNT,
      namePool: HENGE_NAME_POOL,
      fallbackName: "A Henge",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: (x, y, name) => ({ kind: "henge", id: cellId(x, y), name, nextReadyStep: 0 })
    });
  }
  function placeSignposts(cells, rngState) {
    const res = placeFeature(cells, rngState, {
      count: SIGNPOST_COUNT,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: (_x, _y, nextRng) => ({ cell: { kind: "signpost" }, rngState: nextRng })
    });
    return res.rngState;
  }
  function pickStart({ rngState }) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT);
    rngState = r.rngState;
    const x = r.value % WORLD_WIDTH;
    const y = Math.floor(r.value / WORLD_WIDTH);
    return { startPosition: { x, y }, rngState };
  }
  function getSpriteIdAt(world, x, y) {
    const tx = wrapIndex(x, world.width);
    const ty = wrapIndex(y, world.height);
    const cell = world.cells[ty][tx];
    return spriteIdForKind(cell.kind);
  }
  function generateWorld(seed) {
    let rngState = seedToRngState(seed);
    const base = generateBaseTerrainCells(rngState);
    rngState = base.rngState;
    const cells = base.cells;
    const gate = placeGate(cells, rngState);
    rngState = gate.rngState;
    const locksmith = placeLocksmith(cells, rngState, gate.gatePos);
    rngState = locksmith.rngState;
    rngState = placeNamedFarms(cells, rngState);
    rngState = placeNamedCamps(cells, rngState);
    rngState = placeHenges(cells, rngState);
    rngState = placeSignposts(cells, rngState);
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

  // src/core/cells.ts
  function getCellAt(world, pos) {
    return world.cells[pos.y][pos.x];
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

  // src/core/tiles/poiUtils.ts
  function pickDeterministicLine(lines, seed, poiIndex, stepCount) {
    if (!lines.length) return "";
    const h = hashSeedStepCell({ seed, stepCount, cellId: poiIndex });
    return pickFromPool(lines, h) || lines[0] || "";
  }

  // src/core/tiles/onEnterCamp.ts
  var onEnterCamp = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "camp") return { message: "" };
    const campCell = getCellAt(world, pos);
    if (!campCell || campCell.kind !== "camp") return { message: "" };
    const campName = campCell.name || "A Camp";
    const readyAt = campCell.nextReadyStep ?? 0;
    if (stepCount < readyAt) {
      return {
        message: `${campName} Camp
${pickDeterministicLine(CAMP_EMPTY_LINES, world.seed, campCell.id, stepCount)}`
      };
    }
    let rngState = world.rngState;
    const rGain = randInt(rngState, 2);
    rngState = rGain.rngState;
    const gain = rGain.value + 1;
    const rLine = randInt(rngState, CAMP_RECRUIT_LINES.length);
    rngState = rLine.rngState;
    const line = CAMP_RECRUIT_LINES[rLine.value] || CAMP_RECRUIT_LINES[0] || "";
    const nextCampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES };
    const nextWorld = setCellAt({ ...world, rngState }, pos, nextCampCell);
    return {
      world: nextWorld,
      resources: {
        ...resources,
        food: resources.food + CAMP_FOOD_GAIN,
        armySize: resources.armySize + gain
      },
      armyDeltas: [gain],
      foodDeltas: [CAMP_FOOD_GAIN],
      message: `${campName} Camp
${line}`
    };
  };

  // src/core/tiles/onEnterDefaultTerrain.ts
  var onEnterDefaultTerrain = ({ cell }) => ({
    message: terrainMessageForKind(cell.kind)
  });

  // src/core/tiles/onEnterFarm.ts
  var onEnterFarm = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "farm") return { message: "" };
    const farmCell = getCellAt(world, pos);
    if (!farmCell || farmCell.kind !== "farm") return { message: "" };
    const farmName = farmCell.name || "A Farm";
    const readyAt = farmCell.nextReadyStep ?? 0;
    if (stepCount < readyAt) {
      return {
        message: `${farmName} Farm
${pickDeterministicLine(FARM_REVISIT_LINES, world.seed, farmCell.id, stepCount)}`
      };
    }
    let rngState = world.rngState;
    const rGain = randInt(rngState, 8);
    rngState = rGain.rngState;
    const gain = rGain.value + 3;
    const rLine = randInt(rngState, FARM_HARVEST_LINES.length);
    rngState = rLine.rngState;
    const harvestLine = FARM_HARVEST_LINES[rLine.value] || FARM_HARVEST_LINES[0] || "";
    const nextFarmCell = { ...farmCell, nextReadyStep: stepCount + FARM_COOLDOWN_MOVES };
    const nextWorld = setCellAt({ ...world, rngState }, pos, nextFarmCell);
    return {
      world: nextWorld,
      resources: {
        ...resources,
        food: resources.food + gain
      },
      foodDeltas: [gain],
      message: `${farmName} Farm
${harvestLine}`
    };
  };

  // src/core/tiles/onEnterGate.ts
  var onEnterGate = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "gate" && cell.kind !== "gateOpen") return { message: "" };
    const cellId2 = pos.y * world.width + pos.x;
    if (!resources.hasBronzeKey) {
      const line2 = pickDeterministicLine(GATE_LOCKED_LINES, world.seed, cellId2, stepCount);
      return { message: `${GATE_NAME}
${line2}` };
    }
    const nextWorld = cell.kind === "gateOpen" ? world : setCellAt(world, pos, { kind: "gateOpen" });
    const line = pickDeterministicLine(GATE_OPEN_LINES, world.seed, cellId2, stepCount);
    return { world: nextWorld, hasWon: true, message: `${GATE_NAME}
${line}` };
  };

  // src/core/tiles/onEnterHenge.ts
  var onEnterHenge = ({ cell, world, pos, stepCount }) => {
    if (cell.kind !== "henge") return { message: "" };
    const hengeCell = getCellAt(world, pos);
    if (!hengeCell || hengeCell.kind !== "henge") return { message: "" };
    const name = hengeCell.name || "A Henge";
    const readyAt = hengeCell.nextReadyStep ?? 0;
    const isReady = stepCount >= readyAt;
    const line = isReady ? pickDeterministicLine(HENGE_LORE_LINES, world.seed, hengeCell.id, stepCount) : pickDeterministicLine(HENGE_EMPTY_LINES, world.seed, hengeCell.id, stepCount);
    return { message: `${name} Henge
${line}` };
  };

  // src/core/tiles/onEnterLocksmith.ts
  var onEnterLocksmith = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "locksmith") return { message: "" };
    const cellId2 = pos.y * world.width + pos.x;
    if (resources.hasBronzeKey) {
      const line2 = pickDeterministicLine(LOCKSMITH_VISITED_LINES, world.seed, cellId2, stepCount);
      return { message: `${LOCKSMITH_NAME}
${line2}` };
    }
    if (resources.food >= BRONZE_KEY_FOOD_COST) {
      const line2 = pickDeterministicLine(LOCKSMITH_PURCHASE_LINES, world.seed, cellId2, stepCount);
      return {
        resources: {
          ...resources,
          food: resources.food - BRONZE_KEY_FOOD_COST,
          hasBronzeKey: true
        },
        foodDeltas: [-BRONZE_KEY_FOOD_COST],
        message: `${LOCKSMITH_NAME}
${line2}`
      };
    }
    const line = pickDeterministicLine(LOCKSMITH_NO_FOOD_LINES, world.seed, cellId2, stepCount);
    return { message: `${LOCKSMITH_NAME}
${line}` };
  };

  // src/core/signpost.ts
  function formatNearestPoiSignpostMessage(playerPos, world) {
    const SIGNPOST_MIN_TARGET_DISTANCE = 2;
    const kindRank = (k) => k === "gate" || k === "gateOpen" ? 0 : k === "locksmith" ? 1 : k === "farm" ? 2 : k === "camp" ? 3 : 4;
    function candidateId(x, y) {
      return y * world.width + x;
    }
    const candidates = [];
    function pushNamedCandidate(kind, id, baseName, suffix, x, y) {
      const name = `${baseName} ${suffix}`;
      candidates.push({ kind, id, name, pos: { x, y } });
    }
    const cells = world.cells;
    for (let y = 0; y < cells.length; y++) {
      const row = cells[y];
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        switch (cell.kind) {
          case "gate":
            candidates.push({ kind: "gate", id: candidateId(x, y), name: GATE_NAME, pos: { x, y } });
            break;
          case "gateOpen":
            candidates.push({ kind: "gateOpen", id: candidateId(x, y), name: GATE_NAME, pos: { x, y } });
            break;
          case "locksmith":
            candidates.push({ kind: "locksmith", id: candidateId(x, y), name: LOCKSMITH_NAME, pos: { x, y } });
            break;
          case "farm":
            pushNamedCandidate("farm", cell.id, cell.name || "A Farm", "Farm", x, y);
            break;
          case "camp":
            pushNamedCandidate("camp", cell.id, cell.name || "A Camp", "Camp", x, y);
            break;
          case "henge":
            pushNamedCandidate("henge", cell.id, cell.name || "A Henge", "Henge", x, y);
            break;
        }
      }
    }
    if (candidates.length === 0) return "";
    function evalCandidate(c) {
      const dx = torusDelta(playerPos.x, c.pos.x, world.width);
      const dy = torusDelta(playerPos.y, c.pos.y, world.height);
      const d = manhattan(dx, dy);
      const rank = kindRank(c.kind);
      return { ...c, dx, dy, d, rank };
    }
    function isBetter(a, b) {
      if (a.d !== b.d) return a.d < b.d;
      if (a.rank !== b.rank) return a.rank < b.rank;
      return a.id < b.id;
    }
    let bestAny = null;
    let bestFar = null;
    for (let i = 0; i < candidates.length; i++) {
      const e = evalCandidate(candidates[i]);
      if (!bestAny || isBetter(e, bestAny)) bestAny = e;
      if (e.d > SIGNPOST_MIN_TARGET_DISTANCE) {
        if (!bestFar || isBetter(e, bestFar)) bestFar = e;
      }
    }
    const chosen = bestFar || bestAny;
    if (!chosen) return "";
    const dir = dirLabel(chosen.dx, chosen.dy);
    return `${chosen.name}
${dir}, ${chosen.d} leagues away.`;
  }

  // src/core/tiles/onEnterSignpost.ts
  var onEnterSignpost = ({ world, pos }) => ({
    message: formatNearestPoiSignpostMessage(pos, world)
  });

  // src/core/tiles/registry.ts
  var onEnterByKind = {
    camp: onEnterCamp,
    farm: onEnterFarm,
    gate: onEnterGate,
    gateOpen: onEnterGate,
    henge: onEnterHenge,
    locksmith: onEnterLocksmith,
    signpost: onEnterSignpost
  };
  function getOnEnterHandler(kind) {
    return onEnterByKind[kind] || onEnterDefaultTerrain;
  }

  // src/core/types.ts
  var LEFT_PANEL_KIND_AUTO = "auto";
  var LEFT_PANEL_KIND_SPRITE = "sprite";
  var LEFT_PANEL_KIND_MINIMAP = "minimap";

  // src/core/reducer.ts
  function getLeftPanel(ui) {
    return ui.leftPanel;
  }
  function getUi(ui) {
    return ui;
  }
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
  function gridTransitionDurationFrames() {
    return Math.max(1, Math.trunc(GRID_TRANSITION_STEP_FRAMES)) * 5;
  }
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
  function clearSpriteFocusIfAny(ui) {
    const lp = getLeftPanel(ui);
    if (lp.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO };
    return lp;
  }
  function normalizeResources(_world, raw) {
    if (!raw) return { food: INITIAL_FOOD, armySize: INITIAL_ARMY_SIZE, hasBronzeKey: false };
    return { food: raw.food, armySize: raw.armySize, hasBronzeKey: !!raw.hasBronzeKey };
  }
  function gameOverMessage(seed, stepCount) {
    const k = Math.trunc(seed) + Math.trunc(stepCount);
    const m = GAME_OVER_LINES.length;
    const idx = (k % m + m) % m;
    return GAME_OVER_LINES[idx] || "";
  }
  function initialMessageForStart() {
    return GOAL_NARRATIVE;
  }
  function reduceGoal(s) {
    const prevUi = getUi(s.ui);
    const prevLeftPanel = getLeftPanel(prevUi);
    const nextLeftPanel = prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? prevLeftPanel : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPR_BUTTON_GOAL };
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
    const prevUi = getUi(s.ui);
    const prevLeftPanel = getLeftPanel(prevUi);
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
  function reduceMove(prevState, dx, dy) {
    if (prevState.run.isGameOver || prevState.run.hasWon) return prevState;
    if (prevState.encounter && prevState.encounter.kind === "combat") return prevState;
    const world = prevState.world;
    const prevPos = prevState.player.position;
    const nextPos = {
      x: (prevPos.x + dx + world.width) % world.width,
      y: (prevPos.y + dy + world.height) % world.height
    };
    const cell = world.cells[nextPos.y][nextPos.x];
    const nextStepCount = prevState.run.stepCount + 1;
    const prevRes = normalizeResources(world, prevState.resources);
    const prevFood = prevRes.food;
    const cost = enterFoodCostForKind(cell.kind);
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
    const handler = getOnEnterHandler(cell.kind);
    const outcome = handler({ cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources });
    let nextWorld = outcome.world || world;
    let nextResources = outcome.resources || baseResources;
    if (outcome.foodDeltas && outcome.foodDeltas.length) foodDeltas.push(...outcome.foodDeltas);
    if (outcome.armyDeltas && outcome.armyDeltas.length) armyDeltas.push(...outcome.armyDeltas);
    const nextHasWon = prevState.run.hasWon || !!outcome.hasWon;
    const isGameOver = nextResources.armySize <= 0;
    let message = outcome.message;
    if (isGameOver) {
      message = gameOverMessage(nextWorld.seed, nextStepCount);
    }
    let nextEncounter = prevState.encounter;
    let didStartCombat = false;
    if (!isGameOver && !prevState.encounter) {
      const destCell = nextWorld.cells[nextPos.y][nextPos.x];
      const destKind = destCell.kind;
      const destCellId = cellIdForPos(nextWorld, nextPos);
      const isGuaranteed = destKind === "henge";
      const isAmbushTerrain = destKind === "woods" || destKind === "mountain";
      const ambush = isAmbushTerrain && shouldStartAmbush({
        seed: nextWorld.seed,
        stepCount: nextStepCount,
        cellId: destCellId,
        percent: COMBAT_AMBUSH_PERCENT
      });
      let hengeReady = true;
      if (destKind === "henge") {
        const hc = destCell;
        const readyAt = hc.nextReadyStep ?? 0;
        hengeReady = nextStepCount >= readyAt;
      }
      const preEncounterMessage = message;
      if (hengeReady && (isGuaranteed || ambush)) {
        const spawned = spawnEnemyArmy({ rngState: nextWorld.rngState, playerArmy: nextResources.armySize });
        nextWorld = { ...nextWorld, rngState: spawned.rngState };
        nextEncounter = {
          kind: "combat",
          enemyArmySize: spawned.enemyArmy,
          sourceKind: destKind,
          sourceCellId: destCellId,
          restoreMessage: preEncounterMessage
        };
        didStartCombat = true;
        if (destKind === "henge") {
          const hc = destCell;
          const nextHenge = { ...hc, nextReadyStep: nextStepCount + HENGE_COOLDOWN_MOVES };
          nextWorld = setCellAt(nextWorld, nextPos, nextHenge);
        }
        message = destKind === "henge" ? HENGE_ENCOUNTER_LINE : pickCombatEncounterLine({ seed: nextWorld.seed, stepCount: nextStepCount, cellId: destCellId });
      }
    }
    const prevUi = getUi(prevState.ui);
    const baseUi = {
      message,
      leftPanel: clearSpriteFocusIfAny(prevUi),
      clock: prevUi.clock,
      anim: prevUi.anim
    };
    const baseState = {
      world: nextWorld,
      player: { position: nextPos },
      run: {
        stepCount: nextStepCount,
        hasWon: nextHasWon,
        isGameOver
      },
      resources: nextResources,
      encounter: nextEncounter,
      ui: baseUi
    };
    if (!ENABLE_ANIMATIONS) return baseState;
    const startFrame = baseUi.clock.frame;
    let uiWith = baseState.ui;
    for (let i = 0; i < foodDeltas.length; i++) {
      const delta = foodDeltas[i];
      if (!delta) continue;
      uiWith = enqueueAnim(uiWith, {
        kind: "foodDelta",
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { delta }
      });
    }
    for (let i = 0; i < armyDeltas.length; i++) {
      const delta = armyDeltas[i];
      if (!delta) continue;
      uiWith = enqueueAnim(uiWith, {
        kind: "armyDelta",
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { delta }
      });
    }
    if (didStartCombat) {
      const revealStart = startFrame + MOVE_SLIDE_FRAMES;
      uiWith = enqueueAnim(uiWith, {
        kind: "gridTransition",
        startFrame: revealStart,
        durationFrames: gridTransitionDurationFrames(),
        blocksInput: true,
        params: { from: "overworld", to: "combat" }
      });
    }
    return {
      world: baseState.world,
      player: baseState.player,
      run: baseState.run,
      resources: baseState.resources,
      encounter: baseState.encounter,
      ui: enqueueAnim(uiWith, {
        kind: "moveSlide",
        startFrame,
        durationFrames: MOVE_SLIDE_FRAMES,
        blocksInput: true,
        params: { fromPos: { x: prevPos.x, y: prevPos.y }, toPos: { x: nextPos.x, y: nextPos.y }, dx, dy }
      })
    };
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
      const ui = ENABLE_ANIMATIONS ? enqueueAnim(baseUi, {
        kind: "gridTransition",
        startFrame: 0,
        durationFrames: gridTransitionDurationFrames(),
        blocksInput: true,
        params: { from: "blank", to: "overworld" }
      }) : baseUi;
      return {
        world,
        player: { position: { x: playerPos.x, y: playerPos.y } },
        run: { stepCount: 0, hasWon, isGameOver: false },
        resources: {
          food: INITIAL_FOOD,
          armySize: INITIAL_ARMY_SIZE,
          hasBronzeKey: false
        },
        encounter: null,
        ui
      };
    }
    if (prevState == null) return null;
    if (action.type === ACTION_RESTART) return reduceRestart(prevState);
    if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState);
    if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState);
    if (action.type === ACTION_RETURN) {
      if (!prevState.encounter) return prevState;
      const prevUi = getUi(prevState.ui);
      if (prevState.run.isGameOver || prevState.run.hasWon) return prevState;
      const prevRes = normalizeResources(prevState.world, prevState.resources);
      const nextArmy = prevRes.armySize - 1;
      const isGameOver = nextArmy <= 0;
      const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : prevState.run;
      const nextResources = { ...prevRes, armySize: Math.max(0, nextArmy) };
      const nextMessage = isGameOver ? gameOverMessage(prevState.world.seed, prevState.run.stepCount) : pickCombatExitLine({
        seed: prevState.world.seed,
        stepCount: prevState.run.stepCount,
        cellId: prevState.encounter.sourceCellId,
        outcome: "flee"
      }) || prevUi.message;
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
      const startFrame = baseUi.clock.frame;
      let uiWith = baseUi;
      uiWith = enqueueAnim(uiWith, {
        kind: "armyDelta",
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { delta: -1 }
      });
      return {
        world: prevState.world,
        player: prevState.player,
        run: nextRun,
        resources: nextResources,
        encounter: null,
        ui: isGameOver ? uiWith : enqueueAnim(uiWith, {
          kind: "gridTransition",
          startFrame,
          durationFrames: gridTransitionDurationFrames(),
          blocksInput: true,
          params: { from: "combat", to: "overworld" }
        })
      };
    }
    if (action.type === ACTION_FIGHT) {
      if (prevState.run.isGameOver || prevState.run.hasWon) return prevState;
      const enc = prevState.encounter;
      if (!enc || enc.kind !== "combat") return prevState;
      const prevEnemy = enc.enemyArmySize;
      if (prevEnemy <= 0) {
        return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, encounter: null, ui: prevState.ui };
      }
      const prevRes = normalizeResources(prevState.world, prevState.resources);
      const prevUi = getUi(prevState.ui);
      const round = resolveFightRound({
        rngState: prevState.world.rngState,
        playerArmy: prevRes.armySize,
        enemyArmy: prevEnemy
      });
      const foodDeltas = [];
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
      if (round.outcome === "playerHit" && nextEncounter == null && !prevState.run.isGameOver && !prevState.run.hasWon) {
        const span = COMBAT_REWARD_MAX - COMBAT_REWARD_MIN + 1;
        const r = randInt(nextWorld.rngState, span);
        nextWorld = { ...nextWorld, rngState: r.rngState };
        const reward = COMBAT_REWARD_MIN + r.value;
        nextResources = { ...nextResources, food: nextResources.food + reward };
        foodDeltas.push(reward);
      }
      const isGameOver = nextResources.armySize <= 0;
      const nextRun = isGameOver ? { ...prevState.run, isGameOver: true } : prevState.run;
      const nextMessage = isGameOver ? gameOverMessage(nextWorld.seed, prevState.run.stepCount) : nextEncounter == null ? pickCombatExitLine({
        seed: nextWorld.seed,
        stepCount: prevState.run.stepCount,
        cellId: enc.sourceCellId,
        outcome: "victory"
      }) || prevUi.message : prevUi.message;
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
      const startFrame = baseUi.clock.frame;
      let uiWith = baseUi;
      for (let i = 0; i < foodDeltas.length; i++) {
        const delta = foodDeltas[i];
        if (!delta) continue;
        uiWith = enqueueAnim(uiWith, {
          kind: "foodDelta",
          startFrame,
          durationFrames: FOOD_DELTA_FRAMES,
          blocksInput: false,
          params: { delta }
        });
      }
      for (let i = 0; i < armyDeltas.length; i++) {
        const delta = armyDeltas[i];
        if (!delta) continue;
        uiWith = enqueueAnim(uiWith, {
          kind: "armyDelta",
          startFrame,
          durationFrames: FOOD_DELTA_FRAMES,
          blocksInput: false,
          params: { delta }
        });
      }
      for (let i = 0; i < enemyDeltas.length; i++) {
        const delta = enemyDeltas[i];
        if (!delta) continue;
        uiWith = enqueueAnim(uiWith, {
          kind: "enemyArmyDelta",
          startFrame,
          durationFrames: FOOD_DELTA_FRAMES,
          blocksInput: false,
          params: { delta }
        });
      }
      if (!isGameOver && nextEncounter == null) {
        uiWith = enqueueAnim(uiWith, {
          kind: "gridTransition",
          startFrame,
          durationFrames: gridTransitionDurationFrames(),
          blocksInput: true,
          params: { from: "combat", to: "overworld" }
        });
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
    if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx, action.dy);
    if (action.type === ACTION_TICK) {
      const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(getUi(prevState.ui))) : getUi(prevState.ui);
      return {
        world: prevState.world,
        player: prevState.player,
        run: prevState.run,
        resources: prevState.resources,
        encounter: prevState.encounter,
        ui: tickedUi
      };
    }
    return prevState;
  }

  // src/core/rightGrid.ts
  function getRightGridCellDef(s, row, col) {
    if (row === 0 && col === 0) return { iconKey: "goal", action: { type: ACTION_SHOW_GOAL } };
    if (row === 2 && col === 0) return { iconKey: "minimap", action: { type: ACTION_TOGGLE_MINIMAP } };
    if (row === 2 && col === 2) return { iconKey: "restart", action: { type: ACTION_RESTART } };
    if (row === 0 && col === 2) return { action: null };
    const isRunOver = !!(s.run.isGameOver || s.run.hasWon);
    if (s.encounter && s.encounter.kind === "combat") {
      if (row === 1 && col === 0) return { iconKey: "fight", action: { type: ACTION_FIGHT } };
      if (row === 1 && col === 2) return { iconKey: "return", action: { type: ACTION_RETURN } };
      if (row === 1 && col === 1) return { iconKey: "enemy", action: null };
      return { action: null };
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
  var GRID_ORIGIN_Y = Math.floor((SCREEN_HEIGHT - GRID_HEIGHT_PX) / 2);
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
  var UI_SPR_STATUS_STEPS = 130;
  var UI_SPR_STATUS_POS = 131;
  var UI_SPR_STATUS_SEED = 132;
  var UI_SPR_TEXTURE_OVERLAY = 133;
  var UI_SPR_ENEMY = 102;
  var UI_SPR_FIGHT = 74;
  var UI_SPR_RETURN = 76;
  var UI_ILLUSTRATION_SCALE = 4;
  var UI_TEXTURE_TILE_PX = 8;
  var UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR = 8;
  var UI_COMBAT_PREVIEW_PLATE_PAD = 2;
  var UI_COMBAT_PREVIEW_PLATE_W = 42;
  var UI_COMBAT_PREVIEW_PLATE_INSET = 2;
  var UI_RIGHT_GRID_SPRITE_SCALE = 2;
  var UI_RIGHT_GRID_SPRITE_W = 2;
  var UI_RIGHT_GRID_SPRITE_H = 2;
  var UI_RIGHT_GRID_COLORKEY = 0;
  var UI_LEFT_PANEL_PADDING = 7;
  var UI_LEFT_PANEL_INNER_GAP = 6;
  var UI_STATUS_ICON_SIZE = 8;
  var UI_STATUS_ICON_GAP = 3;
  var UI_STATUS_LINE_GAP = 3;
  var UI_STATUS_TEXT_OFFSET_Y = 1;
  var UI_HERO_RESOURCE_GAP_PX = 2;
  var UI_AFTER_RESOURCES_GAP_PX = 2;
  var UI_ARMY_ICON_W_PX = 16;
  var UI_ARMY_ICON_H_PX = 16;
  var UI_ARMY_VALUE_OFFSET_X = UI_ARMY_ICON_W_PX + 3;
  var UI_ARMY_VALUE_OFFSET_Y = 5;
  var UI_ARMY_DELTA_OFFSET_X = 2;
  var UI_ARMY_DELTA_OFFSET_Y = 2;
  var UI_ARMY_DELTA_RISE_PX = 6;
  var UI_ARMY_DELTA_GAP_PX = -4;
  var UI_FOOD_ICON_W_PX = 16;
  var UI_FOOD_ICON_H_PX = 16;
  var UI_FOOD_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3;
  var UI_FOOD_VALUE_OFFSET_Y = 5;
  var UI_FOOD_DELTA_OFFSET_X = 2;
  var UI_FOOD_DELTA_OFFSET_Y = 2;
  var UI_FOOD_DELTA_RISE_PX = 6;
  var UI_FOOD_DELTA_GAP_PX = -4;
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
  var RIGHT_GRID_SPRITE_ID = {
    goal: SPR_BUTTON_GOAL,
    minimap: SPR_BUTTON_MINIMAP,
    restart: SPR_BUTTON_RESTART,
    fight: UI_SPR_FIGHT,
    return: UI_SPR_RETURN,
    enemy: UI_SPR_ENEMY
  };
  function spriteIdForIconKey(iconKey) {
    return RIGHT_GRID_SPRITE_ID[iconKey];
  }
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
    if (mode === "combat") {
      if (row === 1 && col === 0) return RIGHT_GRID_SPRITE_ID.fight;
      if (row === 1 && col === 2) return RIGHT_GRID_SPRITE_ID.return;
      if (row === 1 && col === 1) return RIGHT_GRID_SPRITE_ID.enemy;
      return null;
    }
    const p = s.player.position;
    if (row === 0 && col === 1) return getSpriteIdAt(s.world, p.x, p.y - 1);
    if (row === 1 && col === 0) return getSpriteIdAt(s.world, p.x - 1, p.y);
    if (row === 2 && col === 1) return getSpriteIdAt(s.world, p.x, p.y + 1);
    if (row === 1 && col === 2) return getSpriteIdAt(s.world, p.x + 1, p.y);
    if (row === 1 && col === 1) return getSpriteIdAt(s.world, p.x, p.y);
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
    if (def.iconKey) return spriteIdForIconKey(def.iconKey) ?? null;
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
      { row: 0, col: 0, spriteId: SPR_BUTTON_GOAL },
      { row: 2, col: 0, spriteId: SPR_BUTTON_MINIMAP },
      { row: 2, col: 2, spriteId: SPR_BUTTON_RESTART },
      { row: 0, col: 2, spriteId: null }
      // disabled
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
  var SPR_HUD_FRAME = {
    tl: 146,
    t: 147,
    tr: 148,
    l: 162,
    c: 163,
    r: 164,
    bl: 178,
    b: 179,
    br: 180
  };
  var SPR_HUD_FRAME_BRONZE = {
    tl: 149,
    t: 150,
    tr: 151,
    l: 165,
    c: 166,
    r: 167,
    bl: 181,
    b: 182,
    br: 183
  };
  function renderFrame(s, hints) {
    cls(UI_COLOR_BG);
    drawRightPanel(s, hints);
    drawLeftPanel(s);
    if (s.resources.hasBronzeKey) {
      const margin = 2;
      spr(106, SCREEN_WIDTH - 16 - margin, margin, 0, 1, 0, 0, 2, 2);
    }
  }
  function formatA1(position) {
    const col = String.fromCharCode("A".charCodeAt(0) + position.x);
    const row = String(position.y + 1);
    return col + row;
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
        spr(UI_SPR_TEXTURE_OVERLAY, x + ox, y + oy, UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR, 1);
      }
    }
  }
  function drawLeftPanel(s) {
    rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI_COLOR_BG);
    const frame = s.resources.hasBronzeKey ? SPR_HUD_FRAME_BRONZE : SPR_HUD_FRAME;
    drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, frame, {
      tilePx: 8,
      scale: 1,
      colorkey: 0,
      fallbackBorderColor: UI_COLOR_DIM
    });
    const isCombat = !!(s.encounter && s.encounter.kind === "combat");
    const pos = s.player.position;
    const spriteIdAtPos = getSpriteIdAt(s.world, pos.x, pos.y);
    const leftPanel = s.ui.leftPanel;
    const illSize = 16 * UI_ILLUSTRATION_SCALE;
    const illX = UI_LEFT_PANEL_PADDING;
    const illY = UI_LEFT_PANEL_PADDING;
    if (s.run.isGameOver) {
      drawIllustrationWithTextureOverlay(40, illX, illY);
    } else if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
      drawMinimap(s);
    } else if (leftPanel.kind === LEFT_PANEL_KIND_SPRITE) {
      drawIllustrationWithTextureOverlay(leftPanel.spriteId, illX, illY);
    } else {
      if (!isCombat) {
        drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY);
      } else {
        drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY);
        const platePad = UI_COMBAT_PREVIEW_PLATE_PAD;
        const plateW = UI_COMBAT_PREVIEW_PLATE_W;
        const plateH = 16 + platePad * 2;
        const plateX = illX + illSize - plateW - UI_COMBAT_PREVIEW_PLATE_INSET;
        const plateY = illY + UI_COMBAT_PREVIEW_PLATE_INSET;
        rect(plateX, plateY, plateW, plateH, UI_COLOR_BG);
        rectb(plateX, plateY, plateW, plateH, UI_COLOR_DIM);
        const enemyIconX = plateX + platePad;
        const enemyIconY = plateY + platePad;
        spr(UI_SPR_ENEMY, enemyIconX, enemyIconY, 0, 1, 0, 0, 2, 2);
        const enemyArmy = s.encounter && s.encounter.kind === "combat" ? s.encounter.enemyArmySize | 0 : 0;
        const enemyCountX = enemyIconX + UI_FOOD_VALUE_OFFSET_X;
        const enemyCountY = enemyIconY + UI_FOOD_VALUE_OFFSET_Y;
        print(`${enemyArmy}`, enemyCountX, enemyCountY, UI_COLOR_TEXT);
        if (ENABLE_ANIMATIONS) {
          const anims = s.ui.anim.active;
          const frame2 = s.ui.clock.frame | 0;
          let xCursor = enemyIconX + UI_FOOD_DELTA_OFFSET_X;
          for (let i = 0; i < anims.length; i++) {
            const a = anims[i];
            if (a.kind !== "enemyArmyDelta") continue;
            const ea = a;
            const start = ea.startFrame | 0;
            const dur = Math.max(1, ea.durationFrames | 0);
            const t = Math.max(0, Math.min(dur, frame2 - start));
            const p = t / dur;
            const delta = ea.params.delta | 0;
            if (!delta) continue;
            const label = delta > 0 ? `+${delta}` : `${delta}`;
            const color = delta < 0 ? UI_COLOR_GOOD : UI_COLOR_BAD;
            const dy = UI_FOOD_DELTA_OFFSET_Y - Math.floor(p * UI_FOOD_DELTA_RISE_PX);
            print(label, xCursor, enemyIconY + dy, color);
            xCursor += label.length * 6 + UI_FOOD_DELTA_GAP_PX;
          }
        }
      }
    }
    const statusX = illX + illSize + UI_LEFT_PANEL_INNER_GAP;
    const statusY = illY;
    const statusIconSize = UI_STATUS_ICON_SIZE;
    const statusIconGap = UI_STATUS_ICON_GAP;
    const fontH = 6;
    const statusLineGap = UI_STATUS_LINE_GAP;
    const statusLineH = fontH + statusLineGap;
    const messageLineH = fontH + 1;
    const textOffsetY = UI_STATUS_TEXT_OFFSET_Y;
    const armyX = statusX;
    const armyY = statusY;
    spr(ARMY_SPRITE_ID, armyX, armyY, -1, 1, 0, 0, 2, 2);
    const armyValueX = armyX + UI_ARMY_VALUE_OFFSET_X;
    const armyValueY = armyY + UI_ARMY_VALUE_OFFSET_Y;
    const armyColor = s.resources.armySize < 6 ? UI_COLOR_WARN : UI_COLOR_TEXT;
    print(`${s.resources.armySize}`, armyValueX, armyValueY, armyColor);
    const foodX = statusX;
    const foodY = armyY + UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX;
    spr(FOOD_SPRITE_ID, foodX, foodY, -1, 1, 0, 0, 2, 2);
    const foodValueX = foodX + UI_FOOD_VALUE_OFFSET_X;
    const foodValueY = foodY + UI_FOOD_VALUE_OFFSET_Y;
    const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? UI_COLOR_WARN : UI_COLOR_TEXT;
    print(`${s.resources.food}`, foodValueX, foodValueY, foodColor);
    const smallStartY = statusY + UI_SMALL_STATS_START_OFFSET_Y;
    const seedY = smallStartY + 0 * statusLineH;
    const posY = smallStartY + 1 * statusLineH;
    const stepsY = smallStartY + 2 * statusLineH;
    spr(UI_SPR_STATUS_SEED, statusX, seedY, -1);
    print(`${s.world.seed}`, statusX + statusIconSize + statusIconGap, seedY + textOffsetY, UI_COLOR_TEXT);
    spr(UI_SPR_STATUS_POS, statusX, posY, -1);
    print(formatA1(pos), statusX + statusIconSize + statusIconGap, posY + textOffsetY, UI_COLOR_TEXT);
    spr(UI_SPR_STATUS_STEPS, statusX, stepsY, -1);
    print(`${s.run.stepCount}`, statusX + statusIconSize + statusIconGap, stepsY + textOffsetY, UI_COLOR_TEXT);
    {
      const anims = s.ui.anim.active;
      const frame2 = s.ui.clock.frame | 0;
      let xCursor = armyX + UI_ARMY_DELTA_OFFSET_X;
      for (let i = 0; i < anims.length; i++) {
        const a = anims[i];
        if (a.kind !== "armyDelta") continue;
        const aa = a;
        const start = aa.startFrame | 0;
        const dur = Math.max(1, aa.durationFrames | 0);
        const t = Math.max(0, Math.min(dur, frame2 - start));
        const p = t / dur;
        const delta = aa.params.delta | 0;
        if (!delta) continue;
        const label = delta > 0 ? `+${delta}` : `${delta}`;
        const color = delta > 0 ? UI_COLOR_GOOD : UI_COLOR_BAD;
        const dy = UI_ARMY_DELTA_OFFSET_Y - Math.floor(p * UI_ARMY_DELTA_RISE_PX);
        print(label, xCursor, armyY + dy, color);
        xCursor += label.length * 6 + UI_ARMY_DELTA_GAP_PX;
      }
    }
    {
      const anims = s.ui.anim.active;
      const frame2 = s.ui.clock.frame | 0;
      let xCursor = foodX + UI_FOOD_DELTA_OFFSET_X;
      for (let i = 0; i < anims.length; i++) {
        const a = anims[i];
        if (a.kind !== "foodDelta") continue;
        const fa = a;
        const start = fa.startFrame | 0;
        const dur = Math.max(1, fa.durationFrames | 0);
        const t = Math.max(0, Math.min(dur, frame2 - start));
        const p = t / dur;
        const delta = fa.params.delta | 0;
        if (!delta) continue;
        const label = delta > 0 ? `+${delta}` : `${delta}`;
        const color = delta > 0 ? UI_COLOR_GOOD : UI_COLOR_BAD;
        const dy = UI_FOOD_DELTA_OFFSET_Y - Math.floor(p * UI_FOOD_DELTA_RISE_PX);
        print(label, xCursor, foodY + dy, color);
        xCursor += label.length * 6 + UI_FOOD_DELTA_GAP_PX;
      }
    }
    const statusBottomY = stepsY + statusLineH;
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

// title:  The Unbound (prototype 0.0.9)
// author: haulin
// desc:   Prototype 0.0.9 toward the North Star
// script: js
// input:  mouse

