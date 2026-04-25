# The Unbound Prototype v1 Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints.

## Context

**Prompt:** Build a throwaway TIC-80 game prototype in JavaScript to answer one question: does navigating a limited-visibility, wrapping grid using a contextual 3×3 choice UI feel like player agency or like a slot machine? Prototype v1 excludes economy/combat/quests and focuses on navigation feel.

**Reasoning:** We keep a single source of truth (`state`) updated only by `processAction(state, action) -> nextState`. v1 must be deterministic (seed + click sequence). UI geometry and hitboxes are fixed per the design so feel changes come from rules, not shifting layout.

---

**Goal:** A runnable TIC-80 JS cart (`the-unbound.js`) implementing v1 navigation, signposts, castle objective flag, and lore text, plus manual acceptance verification.

**Architecture:** One global binding `state` holds the entire game state. `processAction` is pure and returns new state objects (no in-place mutation). Rendering reads state only. World tiles are generated once per run and treated as immutable persistent data.

**Tech Stack:** TIC-80 JavaScript (QuickJS), `mouse()` input, `spr()` rendering, `print()` text.

**TDD during implementation:** enforce

---

## Testing approach (v1)

We are **not** importing the cartridge into an external VM for v1.

- **Unit-ish tests (pure logic + reducer):** run inside TIC-80 using `RUN_TESTS=true`. The cart prints PASS/FAIL and failure messages on screen.
- **Manual E2E:** follow the playtest checklist in Chunk 3 using a fixed seed and on-screen state (seed/position/steps/message).

This keeps the prototype single-file and deterministic. If we later want CI-style tests, we can extract pure logic into a Node-friendly module (out of scope for v1).

**References:**
- Design spec: `docs/plans/2026-04-24-the-unbound-prototype-design.md`
- Optional offline TIC-80 docs: keep machine-local paths in `LOCAL.md` (local-only; never committed).
- Deferred ideas: `docs/backlog.md`

## File structure

- Create `the-unbound.js` (repo root): single-file TIC-80 cart code.
- Create `README.md`: how to run the cart locally.

## Chunk 1: Files + runnable skeleton

### Task 1: Create `the-unbound.js` skeleton (runnable)

**Files:**
- Create: `the-unbound.js`

- [ ] **Step 1: Create file with TIC-80 metadata + v1 constants**

```js
// title:  The Unbound (prototype v1)
// author: haulin
// desc:   Navigation-feel experiment (agency vs slot machine)
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

// Colors (palette indices)
const COLOR_BG = 0
const COLOR_TEXT = 12
const COLOR_DIM = 5
const COLOR_FAIL = 6
const COLOR_PASS = 11

// World + tiles
const WORLD_WIDTH = 10
const WORLD_HEIGHT = 10

const SIGNPOST_COUNT = 6

const TILE_CASTLE = 8
const TILE_SIGNPOST = 42

const WALKABLE_COSMETIC_TILE_IDS = [2, 4, 6, 10, 12, 14, 34, 36, 38]

// Generation hook reserved for later A/B
const MAP_GEN_ALGORITHM = 'IID_PER_CELL'

// Boot
const INITIAL_SEED = 1
const RUN_TESTS = false

// ----------------------------
// State (single source of truth)
// ----------------------------
let state = null

function processAction(prevState, action) {
  // Implemented in Chunk 2
  return prevState
}

function TIC() {
  if (RUN_TESTS) {
    cls(COLOR_BG)
    print('RUN_TESTS=true (implemented in Chunk 2)', 8, 8, COLOR_TEXT)
    return
  }

  if (state == null) {
    // Boot replaced in Chunk 2: NEW_RUN on first frame.
    state = {
      world: { seed: INITIAL_SEED, width: WORLD_WIDTH, height: WORLD_HEIGHT },
      player: { position: { x: 0, y: 0 } },
      run: { stepCount: 0, hasFoundCastle: false },
      ui: { message: '' },
      input: { mouseLeftDown: false },
    }
  }

  cls(COLOR_BG)
  print('The Unbound v1 (skeleton)', 8, 8, COLOR_TEXT)
}
```

- [ ] **Step 2: Run the cart**

In TIC-80: paste `the-unbound.js` into the editor → Run (`Ctrl+R`).

Expected:
- Screen shows `The Unbound v1 (skeleton)`.

### Task 2: Add `README.md`

**Files:**
- Create: `README.md`

- [ ] **Step 1: Add run instructions**

```md
# The Unbound (TIC-80)

Prototype v1: navigation-feel experiment.

## Run

- Open TIC-80
- Paste `the-unbound.js` into the code editor
- Run (`Ctrl+R`)

## Reference docs

Optional offline TIC-80 docs: keep machine-local paths in `LOCAL.md` (local-only; never committed).
```

## Chunk 2: Implement v1 pure logic + reducer (TDD)

### Task 3: Add in-cart test harness

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add helpers + `runAllTests()`**

```js
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

function runAllTests() {
  const failures = []
  // tests added in later tasks
  return failures
}
```

- [ ] **Step 2: Wire `RUN_TESTS` branch in `TIC()`**

Replace the current `RUN_TESTS` branch with:

```js
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
```

- [ ] **Step 3: Run tests**

Temporarily set `RUN_TESTS = true`, Run.

Expected:
- `TESTS: PASS`

### Task 4: Add v1 copy + action types

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add fixed strings + action types**

Add below the generation constants:

```js
const GOAL_NARRATIVE =
  'Another soul sets out across the Unbound. Somewhere in these lands stands a castle older than memory. Find it.'

const CASTLE_FOUND_MESSAGE = 'The Castle looms before you.'

const TERRAIN_MESSAGE_BY_TILE_ID = {
  2: 'The grass bends with your passing.',
  4: 'A cold wind worries the earth.',
  6: 'Stones crunch beneath your boots.',
  10: 'The ground here is bare and hard.',
  12: 'The air smells faintly of rain.',
  14: "You follow a path that isn't quite a path.",
  34: 'A ruin watches you in silence.',
  36: 'Blackened earth, long cooled.',
  38: 'The land dips, then rises again.',
}

const ACTION_NEW_RUN = 'NEW_RUN'
const ACTION_RESTART = 'RESTART'
const ACTION_MOVE = 'MOVE'
const ACTION_SHOW_GOAL = 'SHOW_GOAL'
const ACTION_TICK = 'TICK'
```

### Task 5: TDD pure math helpers (wrap/torus/manhattan/dir)

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add tests** (inside `runAllTests()`)

```js
pushFailure(failures, assertEq('wrapIndex(-1,10)=9', wrapIndex(-1, 10), 9))
pushFailure(failures, assertEq('wrapIndex(10,10)=0', wrapIndex(10, 10), 0))

pushFailure(failures, assertEq('torusDelta(0->5,10)=+5', torusDelta(0, 5, 10), 5))
pushFailure(failures, assertEq('torusDelta(5->0,10)=+5', torusDelta(5, 0, 10), 5))
pushFailure(failures, assertEq('torusDelta(0->9,10)=-1', torusDelta(0, 9, 10), -1))

pushFailure(failures, assertEq('manhattan(3,-2)=5', manhattan(3, -2), 5))
pushFailure(failures, assertEq('dirLabel(2,-3)=NE', dirLabel(2, -3), 'NE'))
```

- [ ] **Step 2: Run (expect FAIL: undefined functions)**  
- [ ] **Step 3: Implement helpers**

```js
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
```

- [ ] **Step 4: Run (expect PASS)**

### Task 6: TDD PRNG + seeding

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add tests**

```js
pushFailure(failures, assertEq('xorshift32(1)=270369', xorshift32(1), 270369))
pushFailure(failures, assertEq('seedToRngState(1)=2779096484', seedToRngState(1), 2779096484))
{
  const r = randInt(1, 10)
  pushFailure(failures, assertEq('randInt mod 10 value=9', r.value, 9))
}
```

- [ ] **Step 2: Implement**

```js
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
```

### Task 7: TDD signpost clue string (pure)

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add test**

```js
pushFailure(
  failures,
  assertEq(
    'formatSignpostMessage example',
    formatSignpostMessage({ x: 0, y: 0 }, { x: 3, y: 2 }, WORLD_WIDTH, WORLD_HEIGHT),
    'The Castle lies SE, 5 leagues away.'
  )
)
```

- [ ] **Step 2: Implement**

```js
function formatSignpostMessage(playerPos, castlePos, width, height) {
  const dx = torusDelta(playerPos.x, castlePos.x, width)
  const dy = torusDelta(playerPos.y, castlePos.y, height)
  const dir = dirLabel(dx, dy)
  const d = manhattan(dx, dy)
  return `The Castle lies ${dir}, ${d} leagues away.`
}
```

### Task 8: TDD world generation (`generateWorld`)

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add helpers + invariant tests**

```js
function makeFilledTiles(width, height, tileId) {
  const tiles = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) row.push(tileId)
    tiles.push(row)
  }
  return tiles
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

{
  const g = generateWorld(1)
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
}
```

- [ ] **Step 2: Implement `generateWorld(seed) -> { world, startPosition }`**

```js
function generateWorld(seed) {
  let rngState = seedToRngState(seed)

  const tiles = []
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const r = randInt(rngState, WALKABLE_COSMETIC_TILE_IDS.length)
      rngState = r.rngState
      row.push(WALKABLE_COSMETIC_TILE_IDS[r.value])
    }
    tiles.push(row)
  }

  let castlePosition = { x: 0, y: 0 }
  {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)
    tiles[y][x] = TILE_CASTLE
    castlePosition = { x, y }
  }

  let placed = 0
  while (placed < SIGNPOST_COUNT) {
    const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
    rngState = r.rngState
    const x = r.value % WORLD_WIDTH
    const y = Math.floor(r.value / WORLD_WIDTH)

    if (x === castlePosition.x && y === castlePosition.y) continue
    if (tiles[y][x] === TILE_SIGNPOST) continue

    tiles[y][x] = TILE_SIGNPOST
    placed++
  }

  const r = randInt(rngState, WORLD_WIDTH * WORLD_HEIGHT)
  rngState = r.rngState
  const startX = r.value % WORLD_WIDTH
  const startY = Math.floor(r.value / WORLD_WIDTH)

  const world = {
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    tiles,
    castlePosition,
    rngState,
  }

  return { world, startPosition: { x: startX, y: startY } }
}
```

### Task 9: TDD hit testing + reducer + TICK

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Add hit-test + cell mapping helpers (pure)**

```js
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

function cellToAction(row, col) {
  if (row === 0 && col === 0) return { type: ACTION_SHOW_GOAL }
  if (row === 2 && col === 2) return { type: ACTION_RESTART }

  if (row === 0 && col === 1) return { type: ACTION_MOVE, dx: 0, dy: -1 }
  if (row === 2 && col === 1) return { type: ACTION_MOVE, dx: 0, dy: 1 }
  if (row === 1 && col === 0) return { type: ACTION_MOVE, dx: -1, dy: 0 }
  if (row === 1 && col === 2) return { type: ACTION_MOVE, dx: 1, dy: 0 }

  return null
}
```

- [ ] **Step 2: Add message helpers**

```js
function hasFoundCastleForStartTile(tileId) {
  return tileId === TILE_CASTLE
}

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
```

- [ ] **Step 3: Add reducer tests (including signpost + castle found flag)**

```js
{
  const s = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
  pushFailure(failures, assertEq('NEW_RUN seed', s.world.seed, 1))
  pushFailure(failures, assertEq('NEW_RUN stepCount=0', s.run.stepCount, 0))
  pushFailure(failures, assertTrue('NEW_RUN msg startsWith goal', s.ui.message.startsWith(GOAL_NARRATIVE)))
}

{
  const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
  const s = processAction(base, { type: ACTION_SHOW_GOAL })
  pushFailure(failures, assertEq('SHOW_GOAL msg', s.ui.message, GOAL_NARRATIVE))
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
  // TICK edge and no-op (Goal cell)
  const base = processAction(null, { type: ACTION_NEW_RUN, seed: 1 })
  const clickX = GRID_ORIGIN_X + 18
  const clickY = GRID_ORIGIN_Y + 18
  const s1 = processAction(base, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
  pushFailure(failures, assertEq('TICK goal msg', s1.ui.message, GOAL_NARRATIVE))
  const s2 = processAction(s1, { type: ACTION_TICK, mouseX: clickX, mouseY: clickY, mouseLeftDown: true })
  pushFailure(failures, assertEq('TICK held no step', s2.run.stepCount, s1.run.stepCount))
}
```

- [ ] **Step 4: Implement `processAction` (pure, immutable)**

Implementation rules:
- If `prevState == null`, only `ACTION_NEW_RUN` is accepted.
- `NEW_RUN`: call `generateWorld(seed)`; build full state; set `run.hasFoundCastle` based on start tile; set `ui.message` using `initialMessageForStart`.
- `RESTART`: delegate to `NEW_RUN` with `seed+1`.
- `MOVE`: wrap with `wrapIndex`; increment step; update message via `tileMessage`; set `hasFoundCastle=true` when on castle; **reuse `world.tiles` by reference**.
- `SHOW_GOAL`: set message exactly `GOAL_NARRATIVE`; **reuse `world.tiles` by reference**.
- `TICK`: exact order: compute `justPressed` from `(prevDown,currentDown)` → update `input.mouseLeftDown` → if `justPressed` hit-test → map to action via `cellToAction` → reduce once.

- [ ] **Step 5: Run tests**

Set `RUN_TESTS=true`. Expected: `TESTS: PASS`.

**Note:** Task 9 is intentionally “big”; during execution, split it into multiple commits or micro-steps if it starts taking longer than 5 minutes:
- hit-testing + mapping
- message helpers
- reducer core (NEW_RUN/MOVE/SHOW_GOAL/RESTART)
- TICK edge detection + click dispatch

## Chunk 3: Rendering + manual acceptance

### Task 10: Render full v1 UI (left panel + right grid)

**Files:**
- Modify: `the-unbound.js`

- [ ] **Step 1: Implement A1 coordinate formatting**

```js
function formatA1(position) {
  const col = String.fromCharCode('A'.charCodeAt(0) + position.x)
  const row = String(position.y + 1)
  return col + row
}
```

- [ ] **Step 2: Implement simple text wrapping**

```js
const LORE_MAX_CHARS_PER_LINE = 28

function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (next.length > maxChars && line) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}
```

- [ ] **Step 3: Implement `drawLeftPanel(state)`**

Requirements (from design):
- Draw current tile sprite scaled to 64×64 (scale=4) near top, centered in left panel.
- Print Seed, Position (A1), Steps, and `FOUND` when `hasFoundCastle=true`.
- Print wrapped message below; clip to fit.

- [ ] **Step 4: Implement `drawRightPanel(state)`**

Requirements:
- Draw 3×3 framed cells; gaps not drawn/clickable.
- Center + N/S/E/W show tile sprites (scale=2) from world (with wrapping for adjacent lookup).
- Goal cell shows sprite 44; Restart cell shows sprite 46.
- Disabled corners: dim frame only.

- [ ] **Step 5: Replace `TIC()` normal branch with full loop**

Per design:
- If `state == null`: `state = processAction(null, { type: ACTION_NEW_RUN, seed: INITIAL_SEED })`
- Each frame: sample `mouse()` and reduce `TICK({mouseX,mouseY,mouseLeftDown:left})`
- `cls(COLOR_BG)` then draw panels.

**Note:** If this task grows, split it while implementing:
- draw cell frames + sprite placement for the right grid
- adjacent tile lookup + wrapping
- left panel illustration + status text + message wrapping/clipping
- wire final `TIC()` loop

### Task 11: Manual acceptance (playtest checklist)

**Files:**
- None

- [ ] **Step 1: Hitboxes**
  - movement cells: move exactly once per click
  - gaps: no effect
  - center: no effect
  - left panel: no effect

- [ ] **Step 2: Wrapping**
  - move west from column A → wraps to J, etc.

- [ ] **Step 3: Goal / Restart**
  - Goal sets lore text; step count unchanged
  - Restart increments seed by 1 and resets steps

- [ ] **Step 4: Signpost / Castle**
  - stepping on signpost prints `The Castle lies <DIR>, <D> leagues away.`
  - stepping on castle shows `FOUND` indicator and castle message; movement still works

## Commit checkpoint

- [ ] **Ask for explicit commit approval** (only if you want the work committed; do not auto-commit).

