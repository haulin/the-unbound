// title:  The Unbound (prototype)
// author: haulin
// desc:   Prototype toward the North Star
// script: js
// input:  mouse

// ----------------------------
// Constants (v1)
// ----------------------------
const SCREEN_WIDTH = 240
const SCREEN_HEIGHT = 136

const PANEL_LEFT_WIDTH = 120
const PANEL_RIGHT_WIDTH = SCREEN_WIDTH - PANEL_LEFT_WIDTH

const GRID_COLS = 3
const GRID_ROWS = 3
const CELL_SIZE_PX = 32
const CELL_GAP_PX = 4

const GRID_WIDTH_PX = GRID_COLS * CELL_SIZE_PX + (GRID_COLS - 1) * CELL_GAP_PX
const GRID_HEIGHT_PX = GRID_ROWS * CELL_SIZE_PX + (GRID_ROWS - 1) * CELL_GAP_PX

const GRID_ORIGIN_X = PANEL_LEFT_WIDTH + Math.floor((PANEL_RIGHT_WIDTH - GRID_WIDTH_PX) / 2)
const GRID_ORIGIN_Y = Math.floor((SCREEN_HEIGHT - GRID_HEIGHT_PX) / 2)

const BUTTON_SPRITE_SCALE = 2 // 16->32
const ILLUSTRATION_SCALE = 4 // 16->64

const SPR_BUTTON_GOAL = 44
const SPR_BUTTON_RESTART = 46
const SPR_BUTTON_MINIMAP = 78

const LEFT_PANEL_KIND_AUTO = 'auto' // show current tile sprite
const LEFT_PANEL_KIND_SPRITE = 'sprite' // show a specific sprite id
const LEFT_PANEL_KIND_MINIMAP = 'minimap' // show minimap grid

const SPR_STATUS_STEPS = 130
const SPR_STATUS_POS = 131
const SPR_STATUS_SEED = 132

// Colors (palette indices)
const COLOR_BG = 0
const COLOR_TEXT = 12
const COLOR_DIM = 15
const COLOR_FAIL = 6
const COLOR_PASS = 11

// World + tiles
const WORLD_WIDTH = 10
const WORLD_HEIGHT = 10

const SIGNPOST_COUNT = 6

const TILE_CASTLE = 8
const TILE_SIGNPOST = 42

const WALKABLE_COSMETIC_TILE_IDS = [2, 4, 6, 10, 12, 14, 34, 36, 38]
const WALKABLE_TILE_COUNT = WALKABLE_COSMETIC_TILE_IDS.length

// Map generation (prototype v2): fixed to NOISE
const MAP_GEN_NOISE = 'NOISE'
const MAP_GEN_ALGORITHM = MAP_GEN_NOISE

const NOISE_SMOOTH_PASSES = 2
const NOISE_VALUE_MAX = 10000

const GOAL_NARRATIVE =
  'Another soul sets out across the Unbound. Somewhere in these lands stands a castle older than memory. Find it.'

const CASTLE_FOUND_MESSAGE = 'The Castle looms before you. You are home.'

const TERRAIN_MESSAGE_BY_TILE_ID = {
  2:  'The grass bends with your passing.',           // grass
  4:  'The road here remembers other feet.',          // road / gravel
  6:  'The peaks ahead do not look closer.',          // mountains
  10: 'The water is still. Something moves beneath.', // lake
  12: 'The ground gives underfoot. It keeps giving.', // swamp
  14: "A path that isn't quite a path.",              // woods
  34: 'The light here bends wrong.',                  // rainbow's end
  36: 'The ash is cold. Has been for some time.',     // camp
  38: 'Furrows run to the horizon. No one tends them.', // farm
}

const ACTION_NEW_RUN = 'NEW_RUN'
const ACTION_RESTART = 'RESTART'
const ACTION_MOVE = 'MOVE'
const ACTION_SHOW_GOAL = 'SHOW_GOAL'
const ACTION_TICK = 'TICK'

// Boot
const INITIAL_SEED = 1
const RUN_TESTS = false
const ENABLE_ANIMATIONS = true

// Animations
const MOVE_SLIDE_FRAMES = 15

// Rendering helpers (v1)
const LORE_MAX_CHARS_PER_LINE = 19

// ----------------------------
// State (single source of truth)
// ----------------------------
let state = null

function makeFilledTiles(width, height, tileId) {
  const tiles = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) row.push(tileId)
    tiles.push(row)
  }
  return tiles
}

function processAction(prevState, action) {
  const a = action || {}

  if (prevState == null) {
    if (a.type !== ACTION_NEW_RUN) return null
  }

  if (a.type === ACTION_NEW_RUN) {
    const seed = a.seed
    const generated = generateWorld(seed)
    const world = generated.world
    const playerPos = generated.startPosition

    const startTileId = world.tiles[playerPos.y][playerPos.x]
    const hasFoundCastle = startTileId === TILE_CASTLE

    return {
      world,
      player: { position: { x: playerPos.x, y: playerPos.y } },
      run: { stepCount: 0, hasFoundCastle },
      ui: {
        message: initialMessageForStart(startTileId, playerPos, world),
        leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
        clock: { frame: 0 },
        anim: { nextId: 1, active: [] },
      },
      input: { mouseLeftDown: false },
    }
  }

  if (a.type === ACTION_RESTART) {
    return processAction(null, { type: ACTION_NEW_RUN, seed: prevState.world.seed + 1 })
  }

  if (a.type === ACTION_SHOW_GOAL) {
    return reduceGoal(prevState)
  }

  if (a.type === ACTION_MOVE) {
    return reduceMove(prevState, a.dx, a.dy)
  }

  if (a.type === ACTION_TICK) {
    const prevDown = !!prevState.input.mouseLeftDown
    const currentDown = !!a.mouseLeftDown
    const justPressed = currentDown && !prevDown

    const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(getUi(prevState.ui))) : getUi(prevState.ui)

    const baseNext = {
      world: prevState.world,
      player: prevState.player,
      run: prevState.run,
      ui: tickedUi,
      input: { mouseLeftDown: currentDown },
    }

    if (!justPressed) return baseNext

    if (ENABLE_ANIMATIONS && hasBlockingAnim(tickedUi)) return baseNext

    const cell = hitTestGridCell(a.mouseX, a.mouseY)
    if (!cell) return baseNext

    const buttonDef = getButtonDef(cell.row, cell.col)
    if (!buttonDef) return baseNext

    const reduced = buttonDef.onPress(baseNext)
    if (!reduced) return baseNext

    // `TICK` owns input sampling; preserve it even if the reduced action resets fields (e.g. NEW_RUN via RESTART).
    return {
      world: reduced.world,
      player: reduced.player,
      run: reduced.run,
      ui: reduced.ui,
      input: { mouseLeftDown: currentDown },
    }
  }

  return prevState
}

// ----------------------------
// In-cart test harness (v1)
// ----------------------------
function pushFailure(failures, maybeMsg) {
  if (maybeMsg) failures.push(maybeMsg)
}

function assertEq(name, actual, expected) {
  if (actual !== expected) return `FAIL ${name}: expected ${expected} got ${actual}`
  return null
}

function assertTrue(name, cond) {
  if (!cond) return `FAIL ${name}: expected true`
  return null
}

function assertFnExists(name, isFn) {
  if (!isFn) return `FAIL ${name}: expected function`
  return null
}

function runAllTests() {
  const failures = []

  // Pure math helpers
  const hasWrapIndex = typeof wrapIndex === 'function'
  pushFailure(failures, assertFnExists('wrapIndex', hasWrapIndex))
  if (hasWrapIndex) {
    pushFailure(failures, assertEq('wrapIndex(-1,10)=9', wrapIndex(-1, 10), 9))
    pushFailure(failures, assertEq('wrapIndex(10,10)=0', wrapIndex(10, 10), 0))
  }

  const hasTorusDelta = typeof torusDelta === 'function'
  pushFailure(failures, assertFnExists('torusDelta', hasTorusDelta))
  if (hasTorusDelta) {
    pushFailure(failures, assertEq('torusDelta(0->5,10)=+5', torusDelta(0, 5, 10), 5))
    pushFailure(failures, assertEq('torusDelta(5->0,10)=+5', torusDelta(5, 0, 10), 5))
    pushFailure(failures, assertEq('torusDelta(0->9,10)=-1', torusDelta(0, 9, 10), -1))
  }

  const hasManhattan = typeof manhattan === 'function'
  pushFailure(failures, assertFnExists('manhattan', hasManhattan))
  if (hasManhattan) {
    pushFailure(failures, assertEq('manhattan(3,-2)=5', manhattan(3, -2), 5))
  }

  const hasDirLabel = typeof dirLabel === 'function'
  pushFailure(failures, assertFnExists('dirLabel', hasDirLabel))
  if (hasDirLabel) {
    pushFailure(failures, assertEq('dirLabel(2,-3)=NE', dirLabel(2, -3), 'NE'))
  }

  // PRNG + seeding
  const hasXorshift32 = typeof xorshift32 === 'function'
  pushFailure(failures, assertFnExists('xorshift32', hasXorshift32))
  if (hasXorshift32) {
    pushFailure(failures, assertEq('xorshift32(1)=270369', xorshift32(1), 270369))
  }

  const hasSeedToRngState = typeof seedToRngState === 'function'
  pushFailure(failures, assertFnExists('seedToRngState', hasSeedToRngState))
  if (hasSeedToRngState) {
    pushFailure(failures, assertEq('seedToRngState(1)=2779096484', seedToRngState(1), 2779096484))
  }

  const hasRandInt = typeof randInt === 'function'
  pushFailure(failures, assertFnExists('randInt', hasRandInt))
  if (hasRandInt) {
    const r = randInt(1, 10)
    pushFailure(failures, assertEq('randInt mod 10 value=9', r.value, 9))
  }

  // Signpost clue string
  const hasFormatSignpostMessage = typeof formatSignpostMessage === 'function'
  pushFailure(failures, assertFnExists('formatSignpostMessage', hasFormatSignpostMessage))
  if (hasFormatSignpostMessage) {
    pushFailure(
      failures,
      assertEq(
        'formatSignpostMessage example',
        formatSignpostMessage({ x: 0, y: 0 }, { x: 3, y: 2 }, WORLD_WIDTH, WORLD_HEIGHT),
        'The Castle lies SE, 5 leagues away.'
      )
    )
  }

  // World generation
  const hasGenerateWorld = typeof generateWorld === 'function'
  pushFailure(failures, assertFnExists('generateWorld', hasGenerateWorld))
  if (hasGenerateWorld) {
    const compactWorldGen = (g) =>
      JSON.stringify({ tiles: g.world.tiles, c: g.world.castlePosition, s: g.startPosition })

    const g = generateWorld(1)
    pushFailure(failures, assertEq('world width', g.world.width, WORLD_WIDTH))
    pushFailure(failures, assertEq('world height', g.world.height, WORLD_HEIGHT))
    pushFailure(failures, assertTrue('tiles 10x10', g.world.tiles && g.world.tiles.length === WORLD_HEIGHT))
    if (g.world.tiles && g.world.tiles[0]) {
      pushFailure(failures, assertEq('tiles col count', g.world.tiles[0].length, WORLD_WIDTH))
    }
    pushFailure(failures, assertEq('castle count', countTiles(g.world.tiles, TILE_CASTLE), 1))
    pushFailure(failures, assertEq('signpost count', countTiles(g.world.tiles, TILE_SIGNPOST), SIGNPOST_COUNT))
    pushFailure(
      failures,
      assertEq(
        'castlePosition points to castle',
        g.world.tiles[g.world.castlePosition.y][g.world.castlePosition.x],
        TILE_CASTLE
      )
    )
    pushFailure(failures, assertEq('uses MAP_GEN_ALGORITHM', g.world.mapGenAlgorithm, MAP_GEN_ALGORITHM))

    const g2 = generateWorld(1)
    pushFailure(failures, assertTrue('determinism', compactWorldGen(g) === compactWorldGen(g2)))
  }

  // Hit-testing + reducer + TICK
  const hasHitTestGridCell = typeof hitTestGridCell === 'function'
  pushFailure(failures, assertFnExists('hitTestGridCell', hasHitTestGridCell))

  const hasGetButtonDef = typeof getButtonDef === 'function'
  pushFailure(failures, assertFnExists('getButtonDef', hasGetButtonDef))
  if (hasGetButtonDef) {
    pushFailure(failures, assertTrue('button def goal exists', !!getButtonDef(0, 0)))
    pushFailure(failures, assertTrue('button def center exists', !!getButtonDef(1, 1)))
    pushFailure(failures, assertTrue('button def restart exists', !!getButtonDef(2, 2)))
    pushFailure(failures, assertEq('button def disabled is null', getButtonDef(0, 2), null))
    pushFailure(failures, assertTrue('button def minimap exists', !!getButtonDef(2, 0)))
  }

  const hasInitialMessageForStart = typeof initialMessageForStart === 'function'
  pushFailure(failures, assertFnExists('initialMessageForStart', hasInitialMessageForStart))

  const hasTileMessage = typeof tileMessage === 'function'
  pushFailure(failures, assertFnExists('tileMessage', hasTileMessage))

  const hasProcessAction = typeof processAction === 'function'
  pushFailure(failures, assertFnExists('processAction', hasProcessAction))

  if (hasProcessAction) {
    // If reducer isn't implemented yet, don't crash the harness—report meaningful failures.
    {
      const s = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
      pushFailure(failures, assertTrue('NEW_RUN returns state', !!s))
      if (!s) return failures
      pushFailure(failures, assertEq('NEW_RUN seed', s.world.seed, 1))
      pushFailure(failures, assertEq('NEW_RUN stepCount=0', s.run.stepCount, 0))
      pushFailure(failures, assertTrue('NEW_RUN msg startsWith goal', s.ui.message.startsWith(GOAL_NARRATIVE)))
    }

    {
      const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
      const s = processAction(base, { type: ACTION_SHOW_GOAL })
      pushFailure(failures, assertEq('SHOW_GOAL msg', s.ui.message, GOAL_NARRATIVE))
      pushFailure(
        failures,
        assertEq('SHOW_GOAL left panel sprite', s.ui.leftPanel && s.ui.leftPanel.spriteId, SPR_BUTTON_GOAL)
      )
      pushFailure(failures, assertEq('SHOW_GOAL step unchanged', s.run.stepCount, base.run.stepCount))
    }

    {
      const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
      const s = processAction(base, { type: ACTION_RESTART })
      pushFailure(failures, assertEq('RESTART seed+1', s.world.seed, base.world.seed + 1))
      pushFailure(failures, assertEq('RESTART stepCount reset', s.run.stepCount, 0))
      pushFailure(failures, assertTrue('RESTART msg startsWith goal', s.ui.message.startsWith(GOAL_NARRATIVE)))
    }

    {
      // MOVE onto signpost
      const tiles = makeFilledTiles(10, 10, 2)
      tiles[0][1] = TILE_SIGNPOST
      const crafted = {
        world: { seed: 1, width: 10, height: 10, tiles, castlePosition: { x: 3, y: 2 }, rngState: 1 },
        player: { position: { x: 0, y: 0 } },
        run: { stepCount: 0, hasFoundCastle: false },
        ui: { message: '' },
        input: { mouseLeftDown: false },
      }

      const moved = processAction(crafted, { type: ACTION_MOVE, dx: 1, dy: 0 })
      const expected = formatSignpostMessage(moved.player.position, crafted.world.castlePosition, crafted.world.width, crafted.world.height)
      pushFailure(failures, assertEq('MOVE msg signpost', moved.ui.message, expected))
    }

    {
      // MOVE onto castle sets flag
      const tiles = makeFilledTiles(10, 10, 2)
      tiles[0][1] = TILE_CASTLE
      const crafted = {
        world: { seed: 1, width: 10, height: 10, tiles, castlePosition: { x: 1, y: 0 }, rngState: 1 },
        player: { position: { x: 0, y: 0 } },
        run: { stepCount: 0, hasFoundCastle: false },
        ui: { message: '' },
        input: { mouseLeftDown: false },
      }

      const moved = processAction(crafted, { type: ACTION_MOVE, dx: 1, dy: 0 })
      pushFailure(failures, assertEq('MOVE found flag', moved.run.hasFoundCastle, true))
      pushFailure(failures, assertEq('MOVE msg castle', moved.ui.message, CASTLE_FOUND_MESSAGE))
    }

    {
      // MOVE wrap edge
      const tiles = makeFilledTiles(10, 10, 2)
      const crafted = {
        world: { seed: 1, width: 10, height: 10, tiles, castlePosition: { x: 9, y: 9 }, rngState: 1 },
        player: { position: { x: 0, y: 0 } },
        run: { stepCount: 0, hasFoundCastle: false },
        ui: { message: '' },
        input: { mouseLeftDown: false },
      }

      const moved = processAction(crafted, { type: ACTION_MOVE, dx: -1, dy: 0 })
      pushFailure(failures, assertEq('wrap x to 9', moved.player.position.x, 9))
    }

    {
      // Animation layer: MOVE enqueues moveSlide, TICK locks input while active, then expires.
      const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
      const moved = processAction(base, { type: ACTION_MOVE, dx: 1, dy: 0 })

      pushFailure(failures, assertTrue('ui.clock exists', !!(moved.ui && moved.ui.clock && typeof moved.ui.clock.frame === 'number')))
      pushFailure(
        failures,
        assertTrue('MOVE enqueues anim', !!(moved.ui && moved.ui.anim && moved.ui.anim.active && moved.ui.anim.active.length >= 1))
      )
      if (moved.ui && moved.ui.anim && moved.ui.anim.active && moved.ui.anim.active[0]) {
        pushFailure(failures, assertEq('anim kind moveSlide', moved.ui.anim.active[0].kind, 'moveSlide'))
        pushFailure(failures, assertEq('anim blocks input', !!moved.ui.anim.active[0].blocksInput, true))
      }

      // Try to click East while anim active; stepCount should not change (input lock).
      const pitch = CELL_SIZE_PX + CELL_GAP_PX
      const clickX = GRID_ORIGIN_X + 2 * pitch + Math.floor(CELL_SIZE_PX / 2)
      const clickY = GRID_ORIGIN_Y + 1 * pitch + Math.floor(CELL_SIZE_PX / 2)
      const locked = processAction(moved, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
      pushFailure(failures, assertEq('TICK during anim locks step', locked.run.stepCount, moved.run.stepCount))

      // Advance ticks until the animation expires.
      let s = locked
      for (let i = 0; i < MOVE_SLIDE_FRAMES + 2; i++) {
        s = processAction(s, { type: ACTION_TICK, mouseX: 0, mouseY: 0, mouseLeftDown: false })
      }
      pushFailure(
        failures,
        assertEq('anim expires after duration', (s.ui && s.ui.anim && s.ui.anim.active && s.ui.anim.active.length) || 0, 0)
      )
    }

    {
      // TICK edge and no-op (Goal cell)
      const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
      const clickX = GRID_ORIGIN_X + Math.floor(CELL_SIZE_PX / 2)
      const clickY = GRID_ORIGIN_Y + Math.floor(CELL_SIZE_PX / 2)
      const s1 = processAction(base, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
      pushFailure(failures, assertEq('TICK goal msg', s1.ui.message, GOAL_NARRATIVE))
      const s2 = processAction(s1, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
      pushFailure(failures, assertEq('TICK held no step', s2.run.stepCount, s1.run.stepCount))
    }

    {
      // Holding restart should not trigger repeated restarts (edge detect must survive NEW_RUN reset fields).
      const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
      const pitch = CELL_SIZE_PX + CELL_GAP_PX
      const clickX = GRID_ORIGIN_X + 2 * pitch + Math.floor(CELL_SIZE_PX / 2)
      const clickY = GRID_ORIGIN_Y + 2 * pitch + Math.floor(CELL_SIZE_PX / 2)

      const s1 = processAction(base, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
      pushFailure(failures, assertEq('restart click bumps seed', s1.world.seed, 2))

      const s2 = processAction(s1, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
      pushFailure(failures, assertEq('holding restart does not bump seed again', s2.world.seed, 2))
    }
  }

  // Rendering helpers
  const hasFormatA1 = typeof formatA1 === 'function'
  pushFailure(failures, assertFnExists('formatA1', hasFormatA1))
  if (hasFormatA1) {
    pushFailure(failures, assertEq('formatA1 C7', formatA1({ x: 2, y: 6 }), 'C7'))
    pushFailure(failures, assertEq('formatA1 J10', formatA1({ x: 9, y: 9 }), 'J10'))
  }

  const hasWrapText = typeof wrapText === 'function'
  pushFailure(failures, assertFnExists('wrapText', hasWrapText))
  if (hasWrapText) {
    const lines = wrapText('one two three four', 7)
    pushFailure(failures, assertEq('wrapText line0', lines[0], 'one two'))
    pushFailure(failures, assertEq('wrapText line1', lines[1], 'three'))
    pushFailure(failures, assertEq('wrapText line2', lines[2], 'four'))
  }

  if (hasWrapText) {
    const lines = wrapText('alpha beta\ngamma delta', 6)
    pushFailure(failures, assertEq('wrapText newline line0', lines[0], 'alpha'))
    pushFailure(failures, assertEq('wrapText newline line1', lines[1], 'beta'))
    pushFailure(failures, assertEq('wrapText newline line2 blank', lines[2], ''))
    pushFailure(failures, assertEq('wrapText newline line3', lines[3], 'gamma'))
    pushFailure(failures, assertEq('wrapText newline line4', lines[4], 'delta'))
  }

  return failures
}

// Pure math helpers
function wrapIndex(i, size) {
  const r = i % size
  return r < 0 ? r + size : r
}

function torusDelta(from, to, size) {
  const raw = to - from
  const a = raw
  const b = raw - size
  const c = raw + size

  let best = a
  for (const cand of [b, c]) {
    if (Math.abs(cand) < Math.abs(best)) best = cand
    else if (Math.abs(cand) === Math.abs(best) && cand > best) best = cand
  }
  return best
}

function manhattan(dx, dy) {
  return Math.abs(dx) + Math.abs(dy)
}

function dirLabel(dx, dy) {
  let s = ''
  if (dy < 0) s += 'N'
  else if (dy > 0) s += 'S'

  if (dx < 0) s += 'W'
  else if (dx > 0) s += 'E'

  return s
}

// PRNG
function xorshift32(x) {
  x = x >>> 0
  x ^= (x << 13) >>> 0
  x ^= x >>> 17
  x ^= (x << 5) >>> 0
  return x >>> 0
}

function seedToRngState(seed) {
  let s = (seed ^ 0xA5A5A5A5) >>> 0
  if (s === 0) s = 1
  return s
}

function randInt(rngState, maxExclusive) {
  const next = xorshift32(rngState)
  return { rngState: next, value: next % maxExclusive }
}

// Signpost
function formatSignpostMessage(playerPos, castlePos, width, height) {
  const dx = torusDelta(playerPos.x, castlePos.x, width)
  const dy = torusDelta(playerPos.y, castlePos.y, height)
  const dir = dirLabel(dx, dy)
  const d = manhattan(dx, dy)
  return `The Castle lies ${dir}, ${d} leagues away.`
}

function countTiles(tiles, tileId) {
  let n = 0
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      if (tiles[y][x] === tileId) n++
    }
  }
  return n
}

function clone2dTiles(tiles) {
  const out = []
  for (let y = 0; y < tiles.length; y++) {
    out.push(tiles[y].slice())
  }
  return out
}

function boxBlurIntGridWrap(grid, w, h) {
  const out = []
  for (let y = 0; y < h; y++) {
    const row = []
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = wrapIndex(x + dx, w)
          const ny = wrapIndex(y + dy, h)
          sum += grid[ny][nx]
        }
      }
      row.push((sum / 9) | 0)
    }
    out.push(row)
  }
  return out
}

// World generation
function generateBaseTerrain(rngState) {
  // Prototype v2 decision: keep NOISE as the only algorithm (others removed).
  const vals = []
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const r = randInt(rngState, NOISE_VALUE_MAX)
      rngState = r.rngState
      row.push(r.value)
    }
    vals.push(row)
  }
  let V = vals
  for (let p = 0; p < NOISE_SMOOTH_PASSES; p++) {
    V = boxBlurIntGridWrap(V, WORLD_WIDTH, WORLD_HEIGHT)
  }
  let minV = V[0][0]
  let maxV = V[0][0]
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const v = V[y][x]
      if (v < minV) minV = v
      if (v > maxV) maxV = v
    }
  }
  const span = maxV - minV || 1
  const qtile = WALKABLE_COSMETIC_TILE_IDS
  const bucketCount = WALKABLE_TILE_COUNT
  const tiles = []
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      let bucket = ((bucketCount * (V[y][x] - minV)) / span) | 0
      if (bucket < 0) bucket = 0
      if (bucket >= bucketCount) bucket = bucketCount - 1
      row.push(qtile[bucket])
    }
    tiles.push(row)
  }
  return { tiles, rngState }
}

function placeSpecials({ tiles, rngState }) {
  const t = clone2dTiles(tiles)
  let castlePosition = { x: 0, y: 0 }
  {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)
    t[y][x] = TILE_CASTLE
    castlePosition = { x, y }
  }

  let placed = 0
  while (placed < SIGNPOST_COUNT) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)

    if (x === castlePosition.x && y === castlePosition.y) continue
    if (t[y][x] === TILE_SIGNPOST) continue

    t[y][x] = TILE_SIGNPOST
    placed++
  }

  return { tiles: t, castlePosition, rngState }
}

function pickStart({ rngState }) {
  const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
  rngState = r.rngState
  const x = r.value % WORLD_WIDTH
  const y = Math.floor(r.value / WORLD_WIDTH)
  return { startPosition: { x, y }, rngState }
}

function generateWorld(seed) {
  let rngState = seedToRngState(seed)
  const base = generateBaseTerrain(rngState)
  rngState = base.rngState
  const withSpecials = placeSpecials({ tiles: base.tiles, rngState })
  rngState = withSpecials.rngState
  const startPick = pickStart({ rngState })
  rngState = startPick.rngState

  const world = {
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    mapGenAlgorithm: MAP_GEN_ALGORITHM,
    tiles: withSpecials.tiles,
    castlePosition: withSpecials.castlePosition,
    rngState,
  }

  return { world, startPosition: startPick.startPosition }
}

function hitTestGridCell(mouseX, mouseY) {
  if (mouseX < GRID_ORIGIN_X) return null
  if (mouseX >= GRID_ORIGIN_X + GRID_WIDTH_PX) return null
  if (mouseY < GRID_ORIGIN_Y) return null
  if (mouseY >= GRID_ORIGIN_Y + GRID_HEIGHT_PX) return null

  const relX = mouseX - GRID_ORIGIN_X
  const relY = mouseY - GRID_ORIGIN_Y
  const pitch = CELL_SIZE_PX + CELL_GAP_PX

  const col = Math.floor(relX / pitch)
  const row = Math.floor(relY / pitch)

  const inCellX = relX - col * pitch
  const inCellY = relY - row * pitch

  if (inCellX >= CELL_SIZE_PX) return null
  if (inCellY >= CELL_SIZE_PX) return null

  return { row, col }
}

// cell → behavior is defined by `BUTTON_DEFS` via `getButtonDef(row, col)`

function initialMessageForStart(tileId, playerPos, world) {
  let msg = GOAL_NARRATIVE
  if (tileId === TILE_SIGNPOST) {
    msg += '\n' + formatSignpostMessage(playerPos, world.castlePosition, world.width, world.height)
  } else if (tileId === TILE_CASTLE) {
    msg += '\n' + CASTLE_FOUND_MESSAGE
  }
  return msg
}

function tileMessage(tileId, playerPos, world) {
  if (tileId === TILE_SIGNPOST) {
    return formatSignpostMessage(playerPos, world.castlePosition, world.width, world.height)
  }
  if (tileId === TILE_CASTLE) return CASTLE_FOUND_MESSAGE
  return TERRAIN_MESSAGE_BY_TILE_ID[tileId] || ''
}

function formatA1(position) {
  const col = String.fromCharCode('A'.charCodeAt(0) + position.x)
  const row = String(position.y + 1)
  return col + row
}

function wrapText(text, maxChars) {
  const paragraphs = String(text || '').split('\n')
  const out = []

  for (let p = 0; p < paragraphs.length; p++) {
    const words = String(paragraphs[p] || '').split(/\s+/).filter(Boolean)
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (next.length > maxChars && line) {
        out.push(line)
        line = w
      } else {
        line = next
      }
    }
    if (line) out.push(line)
    if (p !== paragraphs.length - 1) out.push('')
  }

  // trim trailing empty lines
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out
}

function getTileIdAt(world, x, y) {
  const tx = wrapIndex(x, world.width)
  const ty = wrapIndex(y, world.height)
  return world.tiles[ty][tx]
}

function getLeftPanel(ui) {
  const lp = ui && ui.leftPanel
  if (lp && typeof lp.kind === 'string') return lp
  return { kind: LEFT_PANEL_KIND_AUTO }
}

function getUi(ui) {
  if (!ui || typeof ui !== 'object') {
    return {
      message: '',
      leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
      clock: { frame: 0 },
      anim: { nextId: 1, active: [] },
    }
  }

  const message = typeof ui.message === 'string' ? ui.message : ''
  const leftPanel = getLeftPanel(ui)

  const hasClock = ui.clock && typeof ui.clock.frame === 'number'
  const clock = { frame: hasClock ? (ui.clock.frame | 0) : 0 }

  const hasAnim = ui.anim && typeof ui.anim === 'object'
  const active = hasAnim && Array.isArray(ui.anim.active) ? ui.anim.active : []
  const nextId = hasAnim && typeof ui.anim.nextId === 'number' ? ui.anim.nextId | 0 : 1

  return {
    message,
    leftPanel,
    clock,
    anim: { nextId: nextId > 0 ? nextId : 1, active },
  }
}

function tickClock(ui) {
  const u = getUi(ui)
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: { frame: (u.clock.frame | 0) + 1 },
    anim: u.anim,
  }
}

function pruneExpiredAnims(ui) {
  const u = getUi(ui)
  const frame = u.clock.frame | 0
  const active = u.anim.active || []
  const kept = []
  for (let i = 0; i < active.length; i++) {
    const a = active[i]
    if (!a || typeof a !== 'object') continue
    const startFrame = typeof a.startFrame === 'number' ? a.startFrame | 0 : 0
    const durationFrames = typeof a.durationFrames === 'number' ? a.durationFrames | 0 : 0
    const endFrame = startFrame + Math.max(0, durationFrames)
    if (frame < endFrame) kept.push(a)
  }
  if (kept.length === active.length) return u
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: u.clock,
    anim: { nextId: u.anim.nextId, active: kept },
  }
}

function hasBlockingAnim(ui) {
  const u = getUi(ui)
  const active = (u.anim && u.anim.active) || []
  for (let i = 0; i < active.length; i++) {
    const a = active[i]
    if (a && a.blocksInput) return true
  }
  return false
}

function enqueueAnim(ui, anim) {
  const u = getUi(ui)
  const id = u.anim.nextId | 0
  const a = { id }
  const src = anim && typeof anim === 'object' ? anim : {}
  for (const k in src) a[k] = src[k]
  const nextActive = (u.anim.active || []).concat([a])
  return {
    message: u.message,
    leftPanel: u.leftPanel,
    clock: u.clock,
    anim: { nextId: id + 1, active: nextActive },
  }
}

function clearSpriteFocusIfAny(ui) {
  const lp = getLeftPanel(ui)
  if (lp.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO }
  return lp
}

function reduceGoal(s) {
  const prevUi = getUi(s.ui)
  const prevLeftPanel = getLeftPanel(prevUi)
  const nextLeftPanel =
    prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP
      ? prevLeftPanel
      : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPR_BUTTON_GOAL }
  return {
    world: s.world,
    player: s.player,
    run: s.run,
    ui: {
      clock: prevUi.clock,
      anim: prevUi.anim,
      message: GOAL_NARRATIVE,
      leftPanel: nextLeftPanel,
    },
    input: s.input,
  }
}

function reduceMove(prevState, dx, dy) {
  const world = prevState.world
  const prevPos = prevState.player.position
  const nextPos = {
    x: wrapIndex(prevPos.x + dx, world.width),
    y: wrapIndex(prevPos.y + dy, world.height),
  }

  const tileId = world.tiles[nextPos.y][nextPos.x]
  const nextHasFoundCastle = prevState.run.hasFoundCastle || tileId === TILE_CASTLE
  const prevUi = getUi(prevState.ui)
  const baseUi = {
    message: tileMessage(tileId, nextPos, world),
    leftPanel: clearSpriteFocusIfAny(prevUi),
    clock: prevUi.clock,
    anim: prevUi.anim,
  }

  const baseState = {
    world,
    player: { position: nextPos },
    run: { stepCount: prevState.run.stepCount + 1, hasFoundCastle: nextHasFoundCastle },
    ui: baseUi,
    input: prevState.input,
  }

  if (!ENABLE_ANIMATIONS) return baseState

  const startFrame = (baseUi.clock && typeof baseUi.clock.frame === 'number' ? baseUi.clock.frame : 0) | 0
  return {
    world: baseState.world,
    player: baseState.player,
    run: baseState.run,
    ui: enqueueAnim(baseState.ui, {
      kind: 'moveSlide',
      startFrame,
      durationFrames: MOVE_SLIDE_FRAMES,
      blocksInput: true,
      params: { fromPos: { x: prevPos.x, y: prevPos.y }, toPos: { x: nextPos.x, y: nextPos.y }, dx, dy },
    }),
    input: baseState.input,
  }
}

function reduceRestart(s) {
  return processAction(null, { type: ACTION_NEW_RUN, seed: s.world.seed + 1 })
}

function makeButtonDef(previewSpriteId, onPress) {
  return { previewSpriteId, onPress }
}

const BUTTON_DEFS = {
  '0,0': makeButtonDef(
    (_) => SPR_BUTTON_GOAL,
    (s) => processAction(s, { type: ACTION_SHOW_GOAL })
  ),
  '0,1': makeButtonDef(
    (s) => getTileIdAt(s.world, s.player.position.x, s.player.position.y - 1),
    (s) => reduceMove(s, 0, -1)
  ),
  '1,0': makeButtonDef(
    (s) => getTileIdAt(s.world, s.player.position.x - 1, s.player.position.y),
    (s) => reduceMove(s, -1, 0)
  ),
  '1,1': makeButtonDef(
    (s) => getTileIdAt(s.world, s.player.position.x, s.player.position.y),
    (s) => s
  ),
  '1,2': makeButtonDef(
    (s) => getTileIdAt(s.world, s.player.position.x + 1, s.player.position.y),
    (s) => reduceMove(s, 1, 0)
  ),
  '2,1': makeButtonDef(
    (s) => getTileIdAt(s.world, s.player.position.x, s.player.position.y + 1),
    (s) => reduceMove(s, 0, 1)
  ),
  '2,0': makeButtonDef(
    (_) => SPR_BUTTON_MINIMAP,
    (s) => {
      const prevUi = getUi(s.ui)
      const prevLeftPanel = getLeftPanel(prevUi)
      const nextLeftPanel =
        prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP
          ? { kind: LEFT_PANEL_KIND_AUTO }
          : { kind: LEFT_PANEL_KIND_MINIMAP }
      return {
        world: s.world,
        player: s.player,
        run: s.run,
        ui: {
          clock: prevUi.clock,
          anim: prevUi.anim,
          message: prevUi.message,
          leftPanel: nextLeftPanel,
        },
        input: s.input,
      }
    }
  ),
  '2,2': makeButtonDef(
    (_) => SPR_BUTTON_RESTART,
    (s) => reduceRestart(s)
  ),
}

function getButtonDef(row, col) {
  return BUTTON_DEFS[`${row},${col}`] || null
}

const MINIMAP_CELL_PX = 6
const MINIMAP_TILE_CACHE = {}

function getMinimapTilePixels(tileId) {
  const k = tileId | 0
  const cached = MINIMAP_TILE_CACHE[k]
  if (cached) return cached

  // TIC-80 can't draw sprites at scale < 1, and JS builds don't expose `sget()`.
  // Instead, we temporarily draw the 16×16 sprite to a scratch area and sample it via `pix()`.
  //
  // IMPORTANT: callers should prime the cache BEFORE drawing the minimap grid, otherwise the scratch draw
  // could overwrite already-drawn minimap pixels.
  const scratchX = 6
  const scratchY = 6
  spr(k, scratchX, scratchY, -1, 1, 0, 0, 2, 2)

  const out = []
  for (let py = 0; py < MINIMAP_CELL_PX; py++) {
    for (let px = 0; px < MINIMAP_CELL_PX; px++) {
      // Center-crop: sample the middle 6×6 of the 16×16 sprite.
      const off = ((16 - MINIMAP_CELL_PX) / 2) | 0 // 5 when MINIMAP_CELL_PX=6
      const sx = scratchX + off + px
      const sy = scratchY + off + py
      out.push(pix(sx, sy))
    }
  }

  // Clear scratch (it sits inside the 64×64 block we redraw anyway).
  rect(scratchX, scratchY, 16, 16, COLOR_BG)

  MINIMAP_TILE_CACHE[k] = out
  return out
}

function drawMinimap(s) {
  const world = s.world
  const illX = 6
  const illY = 6
  const margin = 2
  const cellPx = MINIMAP_CELL_PX
  const originX = illX + margin
  const originY = illY + margin

  // Prime cache for all tile ids present so scratch sampling can't corrupt already-drawn minimap pixels.
  const present = {}
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      present[world.tiles[y][x] | 0] = true
    }
  }
  for (const k in present) getMinimapTilePixels(k | 0)

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const tid = world.tiles[y][x]
      const mini = getMinimapTilePixels(tid)
      const dx = originX + x * cellPx
      const dy = originY + y * cellPx
      let i = 0
      for (let py = 0; py < cellPx; py++) {
        for (let px = 0; px < cellPx; px++) {
          pix(dx + px, dy + py, mini[i++])
        }
      }
    }
  }
  const p = s.player.position
  rectb(originX + p.x * cellPx, originY + p.y * cellPx, cellPx, cellPx, COLOR_TEXT)
}

function drawLeftPanel(s) {
  rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, COLOR_BG)
  rectb(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, COLOR_DIM)

  const pos = s.player.position
  const tileId = getTileIdAt(s.world, pos.x, pos.y)
  const leftPanel = getLeftPanel(s.ui)

  const illSize = 16 * ILLUSTRATION_SCALE
  const illX = 6
  const illY = 6
  if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
    drawMinimap(s)
  } else {
    const illustrationId =
      leftPanel.kind === LEFT_PANEL_KIND_SPRITE && leftPanel.spriteId != null
        ? leftPanel.spriteId
        : tileId
    spr(illustrationId, illX, illY, -1, ILLUSTRATION_SCALE, 0, 0, 2, 2)
  }

  const statusX = illX + illSize + 6
  const statusY = illY
  const statusIconSize = 8
  const statusIconGap = 3
  const fontH = 6
  const statusLineGap = 3
  const statusLineH = fontH + statusLineGap
  const messageLineH = fontH + 1

  {
    const y = statusY + 0 * statusLineH
    spr(SPR_STATUS_SEED, statusX, y, -1)
    print(`${s.world.seed}`, statusX + statusIconSize + statusIconGap, y + 1, COLOR_TEXT)
  }
  {
    const y = statusY + 1 * statusLineH
    spr(SPR_STATUS_POS, statusX, y, -1)
    print(formatA1(pos), statusX + statusIconSize + statusIconGap, y + 1, COLOR_TEXT)
  }
  {
    const y = statusY + 2 * statusLineH
    spr(SPR_STATUS_STEPS, statusX, y, -1)
    print(`${s.run.stepCount}`, statusX + statusIconSize + statusIconGap, y + 1, COLOR_TEXT)
  }
  const statusLineCount = s.run.hasFoundCastle ? 4 : 3
  if (s.run.hasFoundCastle) print('FOUND', statusX, statusY + 3 * statusLineH, COLOR_TEXT)

  const headerBottomY = Math.max(illY + illSize, statusY + statusLineCount * statusLineH)
  const msgY = headerBottomY + 4
  const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH))
  const lines = wrapText(s.ui.message, LORE_MAX_CHARS_PER_LINE)
  for (let i = 0; i < lines.length && i < maxLines; i++) {
    print(lines[i], 6, msgY + i * messageLineH, COLOR_TEXT)
  }
}

function drawRightPanel(s) {
  if (!ENABLE_ANIMATIONS) return drawRightPanelStatic(s)

  const ui = getUi(s.ui)
  const anims = ui.anim && ui.anim.active
  let moveSlide = null
  if (anims && anims.length) {
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i]
      if (a && a.kind === 'moveSlide') {
        moveSlide = a
        break
      }
    }
  }
  if (!moveSlide) return drawRightPanelStatic(s)

  return drawRightPanelMoveSlideCross(s, ui, moveSlide)
}

function drawRightPanelStatic(s) {
  const pitch = CELL_SIZE_PX + CELL_GAP_PX
  const spriteSize = 16 * BUTTON_SPRITE_SCALE
  const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2)

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_ORIGIN_X + col * pitch
      const y = GRID_ORIGIN_Y + row * pitch

      const isDisabledCorner = row === 0 && col === 2
      if (isDisabledCorner) continue

      const def = getButtonDef(row, col)
      if (!def) continue
      const spriteId = def.previewSpriteId(s)

      if (spriteId != null && !isDisabledCorner) {
        spr(spriteId, x + spriteOffset, y + spriteOffset, -1, BUTTON_SPRITE_SCALE, 0, 0, 2, 2)
      }
    }
  }
}

function cellOriginPx(row, col) {
  const pitch = CELL_SIZE_PX + CELL_GAP_PX
  return { x: GRID_ORIGIN_X + col * pitch, y: GRID_ORIGIN_Y + row * pitch }
}

function drawSpriteInCell(row, col, spriteId, offsetX, offsetY) {
  const spriteSize = 16 * BUTTON_SPRITE_SCALE
  const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2)
  const o = cellOriginPx(row, col)
  spr(spriteId, o.x + spriteOffset + (offsetX | 0), o.y + spriteOffset + (offsetY | 0), -1, BUTTON_SPRITE_SCALE, 0, 0, 2, 2)
}

function clearCell(row, col) {
  const o = cellOriginPx(row, col)
  rect(o.x, o.y, CELL_SIZE_PX, CELL_SIZE_PX, COLOR_BG)
}

function maskOutsideGridInRightPanel() {
  const panelX = PANEL_LEFT_WIDTH
  const panelY = 0
  const panelW = PANEL_RIGHT_WIDTH
  const panelH = SCREEN_HEIGHT

  const gridX = GRID_ORIGIN_X
  const gridY = GRID_ORIGIN_Y
  const gridW = GRID_WIDTH_PX
  const gridH = GRID_HEIGHT_PX

  // Top and bottom strips
  if (gridY > panelY) rect(panelX, panelY, panelW, gridY - panelY, COLOR_BG)
  const bottomY = gridY + gridH
  const panelBottomY = panelY + panelH
  if (panelBottomY > bottomY) rect(panelX, bottomY, panelW, panelBottomY - bottomY, COLOR_BG)

  // Left and right strips adjacent to the grid
  if (gridX > panelX) rect(panelX, gridY, gridX - panelX, gridH, COLOR_BG)
  const rightX = gridX + gridW
  const panelRightX = panelX + panelW
  if (panelRightX > rightX) rect(rightX, gridY, panelRightX - rightX, gridH, COLOR_BG)
}

function maskGridGaps() {
  const pitch = CELL_SIZE_PX + CELL_GAP_PX

  // We only mask gaps adjacent to corner/meta cells (8 segments),
  // not the internal gaps between N/E/C/W/S, to preserve continuity.

  // Vertical gap x positions: between col0-col1 and col1-col2
  const gx0 = GRID_ORIGIN_X + CELL_SIZE_PX
  const gx1 = GRID_ORIGIN_X + pitch + CELL_SIZE_PX

  // Horizontal gap y positions: between row0-row1 and row1-row2
  const gy0 = GRID_ORIGIN_Y + CELL_SIZE_PX
  const gy1 = GRID_ORIGIN_Y + pitch + CELL_SIZE_PX

  // Row y origins for row0 and row2
  const row0Y = GRID_ORIGIN_Y + 0 * pitch
  const row2Y = GRID_ORIGIN_Y + 2 * pitch

  // Col x origins for col0 and col2
  const col0X = GRID_ORIGIN_X + 0 * pitch
  const col2X = GRID_ORIGIN_X + 2 * pitch

  // Vertical gap segments (4): only rows 0 and 2.
  rect(gx0, row0Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)
  rect(gx0, row2Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)
  rect(gx1, row0Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)
  rect(gx1, row2Y, CELL_GAP_PX, CELL_SIZE_PX, COLOR_BG)

  // Horizontal gap segments (4): only cols 0 and 2.
  rect(col0X, gy0, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
  rect(col2X, gy0, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
  rect(col0X, gy1, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
  rect(col2X, gy1, CELL_SIZE_PX, CELL_GAP_PX, COLOR_BG)
}

function drawRightPanelMoveSlideCross(s, ui, anim) {
  const frame = ui.clock.frame | 0
  const startFrame = typeof anim.startFrame === 'number' ? anim.startFrame | 0 : frame
  const durationFrames = typeof anim.durationFrames === 'number' ? Math.max(1, anim.durationFrames | 0) : 1
  const t = Math.max(0, Math.min(durationFrames, frame - startFrame))

  const pX = CELL_SIZE_PX + CELL_GAP_PX
  const dx = anim.params && typeof anim.params.dx === 'number' ? anim.params.dx | 0 : 0
  const dy = anim.params && typeof anim.params.dy === 'number' ? anim.params.dy | 0 : 0
  const shiftX = -dx * pX
  const shiftY = -dy * pX
  const offX = Math.floor((shiftX * t) / durationFrames)
  const offY = Math.floor((shiftY * t) / durationFrames)

  const fromPos = anim.params && anim.params.fromPos ? anim.params.fromPos : s.player.position
  const toPos = anim.params && anim.params.toPos ? anim.params.toPos : s.player.position

  // Cross cells: N, W, C, E, S (corners stay UI)
  const cross = [
    { row: 0, col: 1, ox: 0, oy: -1 },
    { row: 1, col: 0, ox: -1, oy: 0 },
    { row: 1, col: 1, ox: 0, oy: 0 },
    { row: 1, col: 2, ox: 1, oy: 0 },
    { row: 2, col: 1, ox: 0, oy: 1 },
  ]

  // Old view slides toward new view.
  for (let i = 0; i < cross.length; i++) {
    const c = cross[i]
    const tileId = getTileIdAt(s.world, fromPos.x + c.ox, fromPos.y + c.oy)
    drawSpriteInCell(c.row, c.col, tileId, offX, offY)
  }

  // New view slides in from the opposite side.
  for (let i = 0; i < cross.length; i++) {
    const c = cross[i]
    const tileId = getTileIdAt(s.world, toPos.x + c.ox, toPos.y + c.oy)
    drawSpriteInCell(c.row, c.col, tileId, offX - shiftX, offY - shiftY)
  }

  // Mask anything that slid outside the 3×3 grid, and keep gaps clean.
  maskOutsideGridInRightPanel()
  maskGridGaps()

  // Keep corners stable UI (mask + redraw icons).
  clearCell(0, 0) // goal
  clearCell(2, 0) // minimap
  clearCell(2, 2) // restart
  clearCell(0, 2) // disabled

  drawSpriteInCell(0, 0, SPR_BUTTON_GOAL, 0, 0)
  drawSpriteInCell(2, 0, SPR_BUTTON_MINIMAP, 0, 0)
  drawSpriteInCell(2, 2, SPR_BUTTON_RESTART, 0, 0)
}

function TIC() {
  if (RUN_TESTS) {
    cls(COLOR_BG)
    const failures = runAllTests()
    const passed = failures.length === 0
    print(passed ? 'TESTS: PASS' : 'TESTS: FAIL', 8, 8, passed ? COLOR_PASS : COLOR_FAIL)

    for (let i = 0; i < failures.length; i++) {
      print(failures[i], 8, 18 + i * 8, COLOR_FAIL)
    }
    return
  }

  if (state == null) {
    state = processAction(null, { type: ACTION_NEW_RUN, seed: INITIAL_SEED })
  }

  const m = mouse()
  const mouseX = m[0]
  const mouseY = m[1]
  const mouseLeftDown = !!m[2]

  state = processAction(state, { type: ACTION_TICK, mouseX, mouseY, mouseLeftDown })

  cls(COLOR_BG)
  drawRightPanel(state)
  // Draw left panel last so it masks any right-panel animation overflow into x < PANEL_LEFT_WIDTH.
  drawLeftPanel(state)
}

