// title:  The Unbound (prototype 0.0.5)
// author: haulin
// desc:   Prototype 0.0.5 toward the North Star
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
  var SIGNPOST_COUNT = 6;
  var TILE_CASTLE = 8;
  var TILE_SIGNPOST = 42;
  var TILE_FARM = 38;
  var WALKABLE_COSMETIC_TILE_IDS = [2, 4, 6, 10, 12, 14, 34, 36];
  var WALKABLE_TILE_COUNT = WALKABLE_COSMETIC_TILE_IDS.length;
  var MAP_GEN_NOISE = "NOISE";
  var MAP_GEN_ALGORITHM = MAP_GEN_NOISE;
  var NOISE_SMOOTH_PASSES = 2;
  var NOISE_VALUE_MAX = 1e4;
  var GOAL_NARRATIVE = "Another soul sets out across the Unbound. Somewhere in these lands stands a castle older than memory. Find it.";
  var CASTLE_FOUND_MESSAGE = "The Castle looms before you. You are home.";
  var TERRAIN_MESSAGE_BY_TILE_ID = {
    2: "The grass bends with your passing.",
    // grass
    4: "The road here remembers other feet.",
    // road / gravel
    6: "The peaks ahead do not look closer.",
    // mountains
    10: "The water is still. Something moves beneath.",
    // lake
    12: "The ground gives underfoot. It keeps giving.",
    // swamp
    14: "A path that isn't quite a path.",
    // woods
    34: "The light here bends wrong.",
    // rainbow's end
    36: "The ash is cold. Has been for some time."
    // camp
  };
  var INITIAL_FOOD = 10;
  var FOOD_MOVE_COST = 1;
  var FOOD_WARNING_THRESHOLD = 5;
  var FARM_COUNT = 3;
  var FARM_COOLDOWN_MOVES = 3;
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
  var ACTION_NEW_RUN = "NEW_RUN";
  var ACTION_RESTART = "RESTART";
  var ACTION_MOVE = "MOVE";
  var ACTION_SHOW_GOAL = "SHOW_GOAL";
  var ACTION_TOGGLE_MINIMAP = "TOGGLE_MINIMAP";
  var ACTION_TICK = "TICK";
  var INITIAL_SEED = 6;
  var ENABLE_ANIMATIONS = true;
  var MOVE_SLIDE_FRAMES = 15;
  var LORE_MAX_CHARS_PER_LINE = 19;
  var SPR_BUTTON_GOAL = 44;
  var SPR_BUTTON_RESTART = 46;
  var SPR_BUTTON_MINIMAP = 78;

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

  // src/core/signpost.ts
  function formatNearestPoiSignpostMessage(playerPos, world) {
    const candidates = [
      { kind: "castle", name: "The Castle", pos: world.castlePosition },
      ...world.farms.map((f) => ({ kind: "farm", name: `${f.name} Farm`, pos: f.position }))
    ];
    let best = candidates[0];
    let bestDx = torusDelta(playerPos.x, best.pos.x, world.width);
    let bestDy = torusDelta(playerPos.y, best.pos.y, world.height);
    let bestD = manhattan(bestDx, bestDy);
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const dx = torusDelta(playerPos.x, c.pos.x, world.width);
      const dy = torusDelta(playerPos.y, c.pos.y, world.height);
      const d = manhattan(dx, dy);
      if (d < bestD) {
        best = c;
        bestDx = dx;
        bestDy = dy;
        bestD = d;
        continue;
      }
      if (d === bestD) {
        if (best.kind !== "castle" && c.kind === "castle") {
          best = c;
          bestDx = dx;
          bestDy = dy;
          bestD = d;
        }
      }
    }
    const dir = dirLabel(bestDx, bestDy);
    return `${best.name}
${dir}, ${bestD} leagues away.`;
  }

  // src/core/prng.ts
  function xorshift32(x) {
    x = x >>> 0;
    x ^= x << 13 >>> 0;
    x ^= x >>> 17;
    x ^= x << 5 >>> 0;
    return x >>> 0;
  }
  function seedToRngState(seed) {
    let s = (seed ^ 2779096485) >>> 0;
    if (s === 0) s = 1;
    return s;
  }
  function randInt(rngState, maxExclusive) {
    const next = xorshift32(rngState);
    return { rngState: next, value: next % maxExclusive };
  }

  // src/core/world.ts
  function clone2dTiles(tiles) {
    const out = [];
    for (let y = 0; y < tiles.length; y++) out.push(tiles[y].slice());
    return out;
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
        row.push(sum / 9 | 0);
      }
      out.push(row);
    }
    return out;
  }
  function generateBaseTerrain(rngState) {
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
    const qtile = WALKABLE_COSMETIC_TILE_IDS;
    const bucketCount = WALKABLE_TILE_COUNT;
    const tiles = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        let bucket = bucketCount * (V[y][x] - minV) / span | 0;
        if (bucket < 0) bucket = 0;
        if (bucket >= bucketCount) bucket = bucketCount - 1;
        row.push(qtile[bucket]);
      }
      tiles.push(row);
    }
    return { tiles, rngState };
  }
  function placeSpecials({ tiles, rngState }) {
    const t = clone2dTiles(tiles);
    let castlePosition = { x: 0, y: 0 };
    const farms = [];
    {
      const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT);
      rngState = r.rngState;
      const x = r.value % WORLD_WIDTH;
      const y = Math.floor(r.value / WORLD_WIDTH);
      t[y][x] = TILE_CASTLE;
      castlePosition = { x, y };
    }
    const remainingNames = [...FARM_NAME_POOL];
    let placedFarms = 0;
    while (placedFarms < FARM_COUNT) {
      const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT);
      rngState = r.rngState;
      const x = r.value % WORLD_WIDTH;
      const y = Math.floor(r.value / WORLD_WIDTH);
      if (x === castlePosition.x && y === castlePosition.y) continue;
      if (t[y][x] === TILE_FARM) continue;
      if (t[y][x] === TILE_SIGNPOST) continue;
      t[y][x] = TILE_FARM;
      let name = "A Farm";
      if (remainingNames.length > 0) {
        const pick = randInt(rngState, remainingNames.length);
        rngState = pick.rngState;
        name = remainingNames.splice(pick.value, 1)[0];
      }
      farms.push({ position: { x, y }, name });
      placedFarms++;
    }
    let placed = 0;
    while (placed < SIGNPOST_COUNT) {
      const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT);
      rngState = r.rngState;
      const x = r.value % WORLD_WIDTH;
      const y = Math.floor(r.value / WORLD_WIDTH);
      if (x === castlePosition.x && y === castlePosition.y) continue;
      if (t[y][x] === TILE_FARM) continue;
      if (t[y][x] === TILE_SIGNPOST) continue;
      t[y][x] = TILE_SIGNPOST;
      placed++;
    }
    return { tiles: t, castlePosition, farms, rngState };
  }
  function pickStart({ rngState }) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT);
    rngState = r.rngState;
    const x = r.value % WORLD_WIDTH;
    const y = Math.floor(r.value / WORLD_WIDTH);
    return { startPosition: { x, y }, rngState };
  }
  function getTileIdAt(world, x, y) {
    const tx = wrapIndex(x, world.width);
    const ty = wrapIndex(y, world.height);
    return world.tiles[ty][tx];
  }
  function generateWorld(seed) {
    let rngState = seedToRngState(seed);
    const base = generateBaseTerrain(rngState);
    rngState = base.rngState;
    const withSpecials = placeSpecials({ tiles: base.tiles, rngState });
    rngState = withSpecials.rngState;
    const startPick = pickStart({ rngState });
    rngState = startPick.rngState;
    const world = {
      seed,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      mapGenAlgorithm: MAP_GEN_ALGORITHM,
      tiles: withSpecials.tiles,
      castlePosition: withSpecials.castlePosition,
      farms: withSpecials.farms,
      rngState
    };
    return { world, startPosition: startPick.startPosition };
  }

  // src/core/tiles/onEnterCastle.ts
  var onEnterCastle = () => ({
    message: CASTLE_FOUND_MESSAGE,
    hasFoundCastle: true
  });

  // src/core/tiles/onEnterDefaultTerrain.ts
  var onEnterDefaultTerrain = ({ tileId }) => ({
    message: TERRAIN_MESSAGE_BY_TILE_ID[tileId] || ""
  });

  // src/core/tiles/onEnterFarm.ts
  function findFarmIndexAt(world, pos) {
    for (let i = 0; i < world.farms.length; i++) {
      const f = world.farms[i];
      if (f.position.x === pos.x && f.position.y === pos.y) return i;
    }
    return -1;
  }
  function pickRevisitLine(world, farmIndex, stepCount) {
    const lines = FARM_REVISIT_LINES;
    const m = lines.length;
    const k = (world.seed | 0) + (farmIndex | 0) * 7 + (stepCount | 0) | 0;
    const idx = (k % m + m) % m;
    return lines[idx] || lines[0] || "";
  }
  var onEnterFarm = ({ tileId, world, pos, stepCount, resources }) => {
    if (tileId !== TILE_FARM) return { message: "" };
    const farmIndex = findFarmIndexAt(world, pos);
    if (farmIndex < 0) return { message: "" };
    const farmName = world.farms[farmIndex].name || "A Farm";
    const readyAt = (resources.farmNextReadyStep[farmIndex] ?? 0) | 0 || 0;
    if (stepCount < readyAt) {
      return { message: `${farmName} Farm
${pickRevisitLine(world, farmIndex, stepCount)}` };
    }
    let rngState = (world.rngState | 0) >>> 0;
    const rGain = randInt(rngState, 8);
    rngState = rGain.rngState;
    const gain = (rGain.value | 0) + 3;
    const rLine = randInt(rngState, FARM_HARVEST_LINES.length);
    rngState = rLine.rngState;
    const harvestLine = FARM_HARVEST_LINES[rLine.value | 0] || FARM_HARVEST_LINES[0] || "";
    const nextFarmNextReadyStep = resources.farmNextReadyStep.slice();
    nextFarmNextReadyStep[farmIndex] = (stepCount | 0) + FARM_COOLDOWN_MOVES;
    return {
      world: { ...world, rngState },
      resources: { food: (resources.food | 0) + gain, farmNextReadyStep: nextFarmNextReadyStep },
      foodDeltas: [gain],
      message: `${farmName} Farm
${harvestLine}`
    };
  };

  // src/core/tiles/onEnterSignpost.ts
  var onEnterSignpost = ({ world, pos }) => ({
    message: formatNearestPoiSignpostMessage(pos, world)
  });

  // src/core/tiles/registry.ts
  var onEnterByTileId = {
    [TILE_FARM]: onEnterFarm,
    [TILE_SIGNPOST]: onEnterSignpost,
    [TILE_CASTLE]: onEnterCastle
  };
  function getOnEnterHandler(tileId) {
    return onEnterByTileId[tileId] || onEnterDefaultTerrain;
  }

  // src/core/types.ts
  var LEFT_PANEL_KIND_AUTO = "auto";
  var LEFT_PANEL_KIND_SPRITE = "sprite";
  var LEFT_PANEL_KIND_MINIMAP = "minimap";

  // src/core/reducer.ts
  function getLeftPanel(ui) {
    if (!ui || typeof ui !== "object") return { kind: LEFT_PANEL_KIND_AUTO };
    const root = ui;
    const lp = root.leftPanel;
    if (!lp || typeof lp !== "object") return { kind: LEFT_PANEL_KIND_AUTO };
    const o = lp;
    const kind = o.kind;
    if (kind === LEFT_PANEL_KIND_AUTO) return { kind: LEFT_PANEL_KIND_AUTO };
    if (kind === LEFT_PANEL_KIND_MINIMAP) return { kind: LEFT_PANEL_KIND_MINIMAP };
    if (kind === LEFT_PANEL_KIND_SPRITE) {
      const spriteId = o.spriteId;
      if (typeof spriteId === "number") return { kind: LEFT_PANEL_KIND_SPRITE, spriteId: spriteId | 0 };
    }
    return { kind: LEFT_PANEL_KIND_AUTO };
  }
  function getUi(ui) {
    if (!ui || typeof ui !== "object") {
      return {
        message: "",
        leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
        clock: { frame: 0 },
        anim: { nextId: 1, active: [] }
      };
    }
    const u = ui;
    const message = typeof u.message === "string" ? u.message : "";
    const leftPanel = getLeftPanel(u);
    const clockObj = u.clock && typeof u.clock === "object" ? u.clock : null;
    const clockFrame = clockObj && typeof clockObj.frame === "number" ? clockObj.frame | 0 : 0;
    const clock = { frame: clockFrame };
    const animObj = u.anim && typeof u.anim === "object" ? u.anim : null;
    const active = animObj && Array.isArray(animObj.active) ? animObj.active : [];
    const nextId = animObj && typeof animObj.nextId === "number" ? animObj.nextId | 0 : 1;
    return {
      message,
      leftPanel,
      clock,
      anim: { nextId: nextId > 0 ? nextId : 1, active }
    };
  }
  function tickClock(ui) {
    const u = getUi(ui);
    return {
      message: u.message,
      leftPanel: u.leftPanel,
      clock: { frame: (u.clock.frame | 0) + 1 },
      anim: u.anim
    };
  }
  function pruneExpiredAnims(ui) {
    const u = getUi(ui);
    const frame = u.clock.frame | 0;
    const active = u.anim.active;
    const kept = [];
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const startFrame = a.startFrame | 0;
      const durationFrames = a.durationFrames | 0;
      const endFrame = startFrame + Math.max(0, durationFrames);
      if (frame < endFrame) kept.push(a);
    }
    if (kept.length === active.length) return u;
    return {
      message: u.message,
      leftPanel: u.leftPanel,
      clock: u.clock,
      anim: { nextId: u.anim.nextId, active: kept }
    };
  }
  function hasBlockingAnim(ui) {
    const u = getUi(ui);
    const active = u.anim.active;
    for (let i = 0; i < active.length; i++) {
      if (active[i].blocksInput) return true;
    }
    return false;
  }
  function enqueueAnim(ui, anim) {
    const u = getUi(ui);
    const id = u.anim.nextId | 0;
    const a = { id, ...anim };
    const nextActive = u.anim.active.concat([a]);
    return {
      message: u.message,
      leftPanel: u.leftPanel,
      clock: u.clock,
      anim: { nextId: id + 1, active: nextActive }
    };
  }
  function clearSpriteFocusIfAny(ui) {
    const lp = getLeftPanel(ui);
    if (lp.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO };
    return lp;
  }
  function initialMessageForStart(tileId, playerPos, world) {
    let msg = GOAL_NARRATIVE;
    if (tileId === TILE_SIGNPOST) {
      msg += "\n" + formatNearestPoiSignpostMessage(playerPos, world);
    } else if (tileId === TILE_CASTLE) {
      msg += "\n" + CASTLE_FOUND_MESSAGE;
    }
    return msg;
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
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: prevUi.message,
        leftPanel: nextLeftPanel
      }
    };
  }
  function reduceMove(prevState, dx, dy) {
    const world = prevState.world;
    const prevPos = prevState.player.position;
    const nextPos = {
      x: (prevPos.x + dx + world.width) % world.width,
      y: (prevPos.y + dy + world.height) % world.height
    };
    const tileId = world.tiles[nextPos.y][nextPos.x];
    const nextStepCount = (prevState.run.stepCount | 0) + 1;
    const prevRes = prevState.resources || { food: INITIAL_FOOD, farmNextReadyStep: [] };
    const prevFood = typeof prevRes.food === "number" ? prevRes.food | 0 : 0;
    const paidMoveCost = prevFood > 0 && FOOD_MOVE_COST > 0;
    let food = paidMoveCost ? Math.max(0, prevFood - FOOD_MOVE_COST) : prevFood;
    const farmNextReadyStep = Array.isArray(prevRes.farmNextReadyStep) ? prevRes.farmNextReadyStep.slice() : [];
    const farmCount = world.farms && world.farms.length || 0;
    while (farmNextReadyStep.length < farmCount) farmNextReadyStep.push(0);
    const baseResources = { food, farmNextReadyStep };
    const foodDeltas = paidMoveCost ? [-FOOD_MOVE_COST] : [];
    const handler = getOnEnterHandler(tileId);
    const outcome = handler({ tileId, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources });
    const nextWorld = outcome.world || world;
    const nextResources = outcome.resources || baseResources;
    const message = outcome.message;
    if (outcome.foodDeltas && outcome.foodDeltas.length) foodDeltas.push(...outcome.foodDeltas);
    const nextHasFoundCastle = prevState.run.hasFoundCastle || tileId === TILE_CASTLE || !!outcome.hasFoundCastle;
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
      run: { stepCount: nextStepCount, hasFoundCastle: nextHasFoundCastle },
      resources: nextResources,
      ui: baseUi
    };
    if (!ENABLE_ANIMATIONS) return baseState;
    const startFrame = (baseUi.clock && typeof baseUi.clock.frame === "number" ? baseUi.clock.frame : 0) | 0;
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
    return {
      world: baseState.world,
      player: baseState.player,
      run: baseState.run,
      resources: baseState.resources,
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
      const seed = action.seed | 0;
      const generated = generateWorld(seed);
      const world = generated.world;
      const playerPos = generated.startPosition;
      const startTileId = world.tiles[playerPos.y][playerPos.x];
      const hasFoundCastle = startTileId === TILE_CASTLE;
      return {
        world,
        player: { position: { x: playerPos.x, y: playerPos.y } },
        run: { stepCount: 0, hasFoundCastle },
        resources: { food: INITIAL_FOOD, farmNextReadyStep: new Array(world.farms.length).fill(0) },
        ui: {
          message: initialMessageForStart(startTileId, playerPos, world),
          leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
          clock: { frame: 0 },
          anim: { nextId: 1, active: [] }
        }
      };
    }
    if (prevState == null) return null;
    if (action.type === ACTION_RESTART) return reduceRestart(prevState);
    if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState);
    if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState);
    if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx | 0, action.dy | 0);
    if (action.type === ACTION_TICK) {
      const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(getUi(prevState.ui))) : getUi(prevState.ui);
      return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, ui: tickedUi };
    }
    return prevState;
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
    return { mouseX: m[0], mouseY: m[1], mouseLeftDown: !!m[2] };
  }
  function actionForClick(_state, mouseX, mouseY) {
    const cell = hitTestGridCell(mouseX, mouseY);
    if (!cell) return null;
    const { row, col } = cell;
    const isDisabledCorner = row === 0 && col === 2;
    if (isDisabledCorner) return null;
    if (row === 0 && col === 0) return { type: ACTION_SHOW_GOAL };
    if (row === 2 && col === 0) return { type: ACTION_TOGGLE_MINIMAP };
    if (row === 2 && col === 2) return { type: ACTION_RESTART };
    if (row === 0 && col === 1) return { type: ACTION_MOVE, dx: 0, dy: -1 };
    if (row === 1 && col === 0) return { type: ACTION_MOVE, dx: -1, dy: 0 };
    if (row === 1 && col === 2) return { type: ACTION_MOVE, dx: 1, dy: 0 };
    if (row === 2 && col === 1) return { type: ACTION_MOVE, dx: 0, dy: 1 };
    return null;
  }

  // src/platform/tic80/uiConstants.ts
  var UI_COLOR_BG = 0;
  var UI_COLOR_TEXT = 12;
  var UI_COLOR_DIM = 15;
  var UI_COLOR_GOOD = 5;
  var UI_COLOR_WARN = 4;
  var UI_COLOR_BAD = 2;
  var UI_LEFT_PANEL_PADDING = 6;
  var UI_LEFT_PANEL_INNER_GAP = 6;
  var UI_STATUS_ICON_SIZE = 8;
  var UI_STATUS_ICON_GAP = 3;
  var UI_STATUS_LINE_GAP = 3;
  var UI_STATUS_TEXT_OFFSET_Y = 1;
  var UI_FOOD_ICON_W_PX = 16;
  var UI_FOOD_ICON_H_PX = 16;
  var UI_FOOD_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3;
  var UI_FOOD_VALUE_OFFSET_Y = 5;
  var UI_FOOD_DELTA_OFFSET_X = 2;
  var UI_FOOD_DELTA_OFFSET_Y = -2;
  var UI_FOOD_DELTA_RISE_PX = 6;
  var UI_FOOD_DELTA_GAP_PX = -4;

  // src/platform/tic80/render.ts
  var COLOR_BG = UI_COLOR_BG;
  var COLOR_TEXT = UI_COLOR_TEXT;
  var COLOR_DIM = UI_COLOR_DIM;
  var COLOR_GOOD = UI_COLOR_GOOD;
  var COLOR_WARN = UI_COLOR_WARN;
  var COLOR_BAD = UI_COLOR_BAD;
  function renderFrame(s) {
    cls(COLOR_BG);
    drawRightPanel(s);
    drawLeftPanel(s);
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
  var BUTTON_SPRITE_SCALE = 2;
  var ILLUSTRATION_SCALE = 4;
  var SPR_STATUS_STEPS = 130;
  var SPR_STATUS_POS = 131;
  var SPR_STATUS_SEED = 132;
  function drawLeftPanel(s) {
    rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, COLOR_BG);
    rectb(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, COLOR_DIM);
    const pos = s.player.position;
    const tileId = getTileIdAt(s.world, pos.x, pos.y);
    const leftPanel = s.ui.leftPanel;
    const illSize = 16 * ILLUSTRATION_SCALE;
    const illX = UI_LEFT_PANEL_PADDING;
    const illY = UI_LEFT_PANEL_PADDING;
    if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
      drawMinimap(s);
    } else {
      const illustrationId = leftPanel.kind === LEFT_PANEL_KIND_SPRITE ? leftPanel.spriteId : tileId;
      spr(illustrationId, illX, illY, -1, ILLUSTRATION_SCALE, 0, 0, 2, 2);
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
    const foodX = statusX;
    const foodY = statusY;
    spr(FOOD_SPRITE_ID, foodX, foodY, -1, 1, 0, 0, 2, 2);
    const foodValueX = foodX + UI_FOOD_VALUE_OFFSET_X;
    const foodValueY = foodY + UI_FOOD_VALUE_OFFSET_Y;
    const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? COLOR_WARN : COLOR_TEXT;
    print(`${s.resources.food}`, foodValueX, foodValueY, foodColor);
    const smallStartY = foodY + UI_FOOD_ICON_H_PX + 4;
    const seedY = smallStartY + 0 * statusLineH;
    const posY = smallStartY + 1 * statusLineH;
    const stepsY = smallStartY + 2 * statusLineH;
    spr(SPR_STATUS_SEED, statusX, seedY, -1);
    print(`${s.world.seed}`, statusX + statusIconSize + statusIconGap, seedY + textOffsetY, COLOR_TEXT);
    spr(SPR_STATUS_POS, statusX, posY, -1);
    print(formatA1(pos), statusX + statusIconSize + statusIconGap, posY + textOffsetY, COLOR_TEXT);
    spr(SPR_STATUS_STEPS, statusX, stepsY, -1);
    print(`${s.run.stepCount}`, statusX + statusIconSize + statusIconGap, stepsY + textOffsetY, COLOR_TEXT);
    {
      const anims = s.ui.anim.active;
      const frame = s.ui.clock.frame | 0;
      let xCursor = foodX + UI_FOOD_DELTA_OFFSET_X;
      for (let i = 0; i < anims.length; i++) {
        const a = anims[i];
        if (a.kind !== "foodDelta") continue;
        const fa = a;
        const start = fa.startFrame | 0;
        const dur = Math.max(1, fa.durationFrames | 0);
        const t = Math.max(0, Math.min(dur, frame - start));
        const p = t / dur;
        const delta = fa.params.delta | 0;
        if (!delta) continue;
        const label = delta > 0 ? `+${delta}` : `${delta}`;
        const color = delta > 0 ? COLOR_GOOD : COLOR_BAD;
        const dy = UI_FOOD_DELTA_OFFSET_Y - Math.floor(p * UI_FOOD_DELTA_RISE_PX);
        print(label, xCursor, foodY + dy, color);
        xCursor += label.length * 6 + UI_FOOD_DELTA_GAP_PX;
      }
    }
    const foundY = stepsY + statusLineH;
    if (s.run.hasFoundCastle) print("FOUND", statusX, foundY + textOffsetY, COLOR_TEXT);
    const statusBottomY = s.run.hasFoundCastle ? foundY + statusLineH : stepsY + statusLineH;
    const headerBottomY = Math.max(illY + illSize, statusBottomY);
    const msgY = headerBottomY + 4;
    const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH));
    const lines = wrapText(s.ui.message, LORE_MAX_CHARS_PER_LINE);
    for (let i = 0; i < lines.length && i < maxLines; i++) {
      print(lines[i], UI_LEFT_PANEL_PADDING, msgY + i * messageLineH, COLOR_TEXT);
    }
  }
  function drawRightPanel(s) {
    if (!ENABLE_ANIMATIONS) return drawRightPanelStatic(s);
    const anims = s.ui.anim.active;
    let moveSlide = null;
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (a.kind === "moveSlide") {
        moveSlide = a;
        break;
      }
    }
    if (!moveSlide) return drawRightPanelStatic(s);
    return drawRightPanelMoveSlideCross(s, moveSlide);
  }
  function previewSpriteIdForCell(s, row, col) {
    if (row === 0 && col === 0) return SPR_BUTTON_GOAL;
    if (row === 2 && col === 0) return SPR_BUTTON_MINIMAP;
    if (row === 2 && col === 2) return SPR_BUTTON_RESTART;
    if (row === 0 && col === 2) return null;
    const p = s.player.position;
    if (row === 0 && col === 1) return getTileIdAt(s.world, p.x, p.y - 1);
    if (row === 1 && col === 0) return getTileIdAt(s.world, p.x - 1, p.y);
    if (row === 1 && col === 1) return getTileIdAt(s.world, p.x, p.y);
    if (row === 1 && col === 2) return getTileIdAt(s.world, p.x + 1, p.y);
    if (row === 2 && col === 1) return getTileIdAt(s.world, p.x, p.y + 1);
    return null;
  }
  function drawRightPanelStatic(s) {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    const spriteSize = 16 * BUTTON_SPRITE_SCALE;
    const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2);
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = GRID_ORIGIN_X + col * pitch;
        const y = GRID_ORIGIN_Y + row * pitch;
        const spriteId = previewSpriteIdForCell(s, row, col);
        if (spriteId != null) spr(spriteId, x + spriteOffset, y + spriteOffset, -1, BUTTON_SPRITE_SCALE, 0, 0, 2, 2);
      }
    }
  }
  function cellOriginPx(row, col) {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    return { x: GRID_ORIGIN_X + col * pitch, y: GRID_ORIGIN_Y + row * pitch };
  }
  function drawSpriteInCell(row, col, spriteId, offsetX, offsetY) {
    const spriteSize = 16 * BUTTON_SPRITE_SCALE;
    const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2);
    const o = cellOriginPx(row, col);
    spr(
      spriteId,
      o.x + spriteOffset + (offsetX | 0),
      o.y + spriteOffset + (offsetY | 0),
      -1,
      BUTTON_SPRITE_SCALE,
      0,
      0,
      2,
      2
    );
  }
  function clearCell(row, col) {
    const o = cellOriginPx(row, col);
    rect(o.x, o.y, CELL_SIZE_PX, CELL_SIZE_PX, COLOR_BG);
  }
  function maskOutsideGridInRightPanel() {
    const panelX = PANEL_LEFT_WIDTH;
    const panelY = 0;
    const panelW = PANEL_RIGHT_WIDTH;
    const panelH = SCREEN_HEIGHT;
    const gridX = GRID_ORIGIN_X;
    const gridY = GRID_ORIGIN_Y;
    const gridW = GRID_WIDTH_PX;
    const gridH = CELL_SIZE_PX * GRID_ROWS + CELL_GAP_PX * (GRID_ROWS - 1);
    if (gridY > panelY) rect(panelX, panelY, panelW, gridY - panelY, COLOR_BG);
    const bottomY = gridY + gridH;
    const panelBottomY = panelY + panelH;
    if (panelBottomY > bottomY) rect(panelX, bottomY, panelW, panelBottomY - bottomY, COLOR_BG);
    if (gridX > panelX) rect(panelX, gridY, gridX - panelX, gridH, COLOR_BG);
    const rightX = gridX + gridW;
    const panelRightX = panelX + panelW;
    if (panelRightX > rightX) rect(rightX, gridY, panelRightX - rightX, gridH, COLOR_BG);
  }
  function maskGridGaps() {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    const gx0 = GRID_ORIGIN_X + CELL_SIZE_PX;
    const gx1 = GRID_ORIGIN_X + pitch + CELL_SIZE_PX;
    const gy0 = GRID_ORIGIN_Y + CELL_SIZE_PX;
    const gy1 = GRID_ORIGIN_Y + pitch + CELL_SIZE_PX;
    const row0Y = GRID_ORIGIN_Y + 0 * pitch;
    const row2Y = GRID_ORIGIN_Y + 2 * pitch;
    const col0X = GRID_ORIGIN_X + 0 * pitch;
    const col2X = GRID_ORIGIN_X + 2 * pitch;
    rect(gx0, row0Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG);
    rect(gx0, row2Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG);
    rect(gx1, row0Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG);
    rect(gx1, row2Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG);
    rect(col0X, gy0, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG);
    rect(col2X, gy0, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG);
    rect(col0X, gy1, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG);
    rect(col2X, gy1, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG);
  }
  function drawRightPanelMoveSlideCross(s, anim) {
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
    const cross = [
      { row: 0, col: 1, ox: 0, oy: -1 },
      { row: 1, col: 0, ox: -1, oy: 0 },
      { row: 1, col: 1, ox: 0, oy: 0 },
      { row: 1, col: 2, ox: 1, oy: 0 },
      { row: 2, col: 1, ox: 0, oy: 1 }
    ];
    for (let i = 0; i < cross.length; i++) {
      const c = cross[i];
      const tileId = getTileIdAt(s.world, fromPos.x + c.ox, fromPos.y + c.oy);
      drawSpriteInCell(c.row, c.col, tileId, offX, offY);
    }
    for (let i = 0; i < cross.length; i++) {
      const c = cross[i];
      const tileId = getTileIdAt(s.world, toPos.x + c.ox, toPos.y + c.oy);
      drawSpriteInCell(c.row, c.col, tileId, offX - shiftX, offY - shiftY);
    }
    maskOutsideGridInRightPanel();
    maskGridGaps();
    clearCell(0, 0);
    clearCell(2, 0);
    clearCell(2, 2);
    clearCell(0, 2);
    drawSpriteInCell(0, 0, SPR_BUTTON_GOAL, 0, 0);
    drawSpriteInCell(2, 0, SPR_BUTTON_MINIMAP, 0, 0);
    drawSpriteInCell(2, 2, SPR_BUTTON_RESTART, 0, 0);
  }
  var MINIMAP_CELL_PX = 6;
  var MINIMAP_TILE_CACHE = {};
  function getMinimapTilePixels(tileId) {
    const k = tileId | 0;
    const cached = MINIMAP_TILE_CACHE[k];
    if (cached) return cached;
    const scratchX = 6;
    const scratchY = 6;
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
    rect(scratchX, scratchY, 16, 16, COLOR_BG);
    MINIMAP_TILE_CACHE[k] = out;
    return out;
  }
  function drawMinimap(s) {
    const world = s.world;
    const illX = 6;
    const illY = 6;
    const margin = 2;
    const cellPx = MINIMAP_CELL_PX;
    const originX = illX + margin;
    const originY = illY + margin;
    const present = {};
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        present[world.tiles[y][x] | 0] = true;
      }
    }
    for (const k in present) getMinimapTilePixels(Number(k));
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tid = world.tiles[y][x];
        const mini = getMinimapTilePixels(tid);
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
    rectb(originX + p.x * cellPx, originY + p.y * cellPx, cellPx, cellPx, COLOR_TEXT);
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
    renderFrame(state);
  }
  globalThis.TIC = TIC;
})();

// title:  The Unbound (prototype 0.0.5)
// author: haulin
// desc:   Prototype 0.0.5 toward the North Star
// script: js
// input:  mouse

