# The Unbound Prototype (TIC-80 JS) Design

## Context

**Prompt:** Build a throwaway TIC-80 game prototype in JavaScript to answer one question: does navigating a limited-visibility, wrapping grid using a contextual 3×3 choice UI feel like player agency or like a slot machine? The “North Star” is a minimalist retro fantasy resource management game that intentionally diverges from its inspirations. Prototype v1 intentionally excludes economy/combat/quests and focuses on navigation feel.

**Before implementing the next phase:** re-read `docs/the-unbound-v1-learnings.md` and treat it as the active “how we evolve this prototype” contract.

**Non-negotiables (architecture):**
- **Single source of truth:** one plain `state` object.
- **Pure reducer:** state is never mutated directly; all changes go through `processAction(state, action)` and return a new state object.
- **Render is read-only:** rendering reads from state and never writes to it.
- **No magic numbers:** all constants are named and grouped.

**Why this approach:**
- Keep the prototype *about the choice feel*, not about an early implementation of later systems.
- Make iteration fast and reproducible: the same seed and the same clicks should produce the same run (prototype v2’s map-gen is fixed to **NOISE**).
- Specify a stable UI contract (geometry + hitboxes + button semantics) so feel changes are attributable to rules, not shifting UI.

---

## Prototype v2 (minimap + map generation)

- **Left panel focus (single concept):** `state.ui.leftPanel` is a plain-data “what should the left panel draw?” value:
  - `{ kind: 'auto' }` → illustration shows the current tile
  - `{ kind: 'sprite', spriteId: number }` → illustration shows a specific sprite (e.g. Goal)
  - `{ kind: 'minimap' }` → draw the minimap grid
- **Minimap toggle:** grid cell `(2,0)` uses sprite id **`78`**; click toggles `state.ui.leftPanel` between `{ kind:'auto' }` and `{ kind:'minimap' }`.
- **Map generation (v2):** `MAP_GEN_ALGORITHM` is fixed to **`NOISE`**.
- **Decision log (v2):** we tried IID-per-cell, BLOBS smoothing, and a DRUNKWALK/carve style; we chose **NOISE** because it creates small distinct blobs that feel less random while still avoiding long same-terrain runs, improving navigation feel under limited visibility.
- **Determinism:** a run is deterministic for a fixed seed (same seed + same click sequence ⇒ identical `world.tiles`, placements, and messages for a given cart build).

---

## Prototype v3 (animation layer + move-slide)

- **One knob:** `ENABLE_ANIMATIONS` toggles all animations on/off (progressive enhancement).
- **Animation timebase (tick-driven):** `state.ui.clock.frame` increments in `TICK` (not wall time).
- **Generic animation slice:** `state.ui.anim = { nextId, active: Anim[] }`
  - `Anim = { id, kind, startFrame, durationFrames, blocksInput, params }` (plain serializable data; no functions in state)
- **Move-slide (first consumer):**
  - Enqueued on `MOVE` as `kind: 'moveSlide'`, `blocksInput: true`, `durationFrames = MOVE_SLIDE_FRAMES`.
  - **Input lock:** while a blocking anim is active, `TICK` ignores `justPressed` grid actions.
  - **Cross-only animation:** only N/W/C/E/S world tiles slide; corners remain UI buttons. During slide, corners are masked to stay stable.

---

## Overview (v1)

Prototype v1 is a deterministic, mouse-left-click-only TIC-80 JavaScript cart.

- **World:** a wrapping 10×10 grid generated from a seed **once** at run start and stored in `state.world.tiles`.
- **Visibility:** the player sees only the **current tile** and the **four adjacent tiles** (N/S/E/W). These appear as the **center + N/S/E/W cells** of the 3×3 action grid (corners are Goal/Restart/Minimap/disabled in prototype v2; v1 had Goal/Restart/disabled only).
- **UI:** left half is a non-interactive lore panel (**illustration or minimap** + status + text in v2; illustration-only in v1); right half is the 3×3 action grid.
- **Objective:** find the **Castle** tile. Signposts provide **direction + distance** clues.
- **No modals in v1:** navigation remains available at all times; encounters update lore text inline.

## Key constraints (v1)

- **Input:** mouse/touch only, **left click only**.
- **Determinism:** same seed + same action sequence → same map and same messages (prototype v2 uses a single fixed map-gen algorithm; v1 had a single implicit algorithm).
- **Terrain:** all walkable; differences are cosmetic only.
- **No camping:** center cell click is a no-op.
- **Minimap (v2):** optional full-map **debug** view in the left panel; **no** visited/revealed/fog-of-war tracking (shows whole terrain for structure/feel A/B). v1 had no minimap.

## UI contract (TIC-80 240×136)

### Screen split

- `SCREEN_WIDTH = 240`, `SCREEN_HEIGHT = 136`
- Left lore panel: `PANEL_LEFT_WIDTH = 120` (x 0..119)
- Right action panel: `PANEL_RIGHT_WIDTH = 120` (x 120..239)

### Right panel: 3×3 action grid geometry

The action grid is centered within the right half with small outer margins and is vertically centered.

- `GRID_COLS = 3`, `GRID_ROWS = 3`
- `CELL_SIZE_PX = 32`
- `CELL_GAP_PX = 4`
- `GRID_WIDTH_PX = 3*32 + 2*4 = 104`
- `GRID_HEIGHT_PX = 104`
- `GRID_ORIGIN_X = 120 + (120 - GRID_WIDTH_PX)/2` (centered in right panel)
- `GRID_ORIGIN_Y = (136 - GRID_HEIGHT_PX)/2` (centered vertically; floor to integer in code)

**Hit-testing rule:** each 32×32 cell is clickable; the 4px gaps are not.

### Right panel: cell semantics

Grid coordinates `(row, col)` are 0-based.

Movement (show adjacent tile sprite; clicking moves):
- `(0,1)` North → `MOVE({dx:0, dy:-1})`
- `(2,1)` South → `MOVE({dx:0, dy:+1})`
- `(1,0)` West  → `MOVE({dx:-1, dy:0})`
- `(1,2)` East  → `MOVE({dx:+1, dy:0})`

Other:
- `(1,1)` Center: current tile sprite; click does nothing
- `(0,0)` Goal: shows goal narrative in lore panel and switches the left-panel illustration to the Goal icon → `SHOW_GOAL()`
- `(2,2)` Restart: new run with `seed += 1` → `RESTART()`
- `(2,0)` Minimap: sprite id **78**; toggles `state.ui.leftPanel` between `{kind:'auto'}` and `{kind:'minimap'}` (prototype v2)
- `(0,2)`: disabled (rendered as empty/disabled cell; click is no-op) (v1 and v2)

### Right panel: button visuals

Sprites are 16×16. Buttons display a 32×32 sprite centered within the 32×32 cell:
- `BUTTON_SPRITE_SCALE = 2` (16→32)

TIC-80 note: 16×16 sprites are stored as a 2×2 composite of 8×8 sprites; render with `spr(id, x, y, ..., scale, ..., w=2, h=2)` to avoid drawing only the top-left 8×8.

Icon sprites:
- `SPR_BUTTON_GOAL = 44`
- `SPR_BUTTON_RESTART = 46`
- `SPR_BUTTON_MINIMAP = 78` (cell `(2,0)`, prototype v2)

Disabled cell `(0,2)` renders as empty space (no frame, no icon) for a minimal look.

### Left panel: lore + status

The left panel is non-interactive and renders:

- **Illustration or minimap (v2):** the same **64×64** region (origin ~`(6,6)`) either draws the **illustration** (scale 4, 16→64) or **`drawMinimap`**: 10×10 at 6px/cell, 2px insets, player outline. Each minimap cell is a 6×6 preview sampled from the tile’s 16×16 sprite (center crop). In minimap mode, `state.ui.leftPanel.kind === 'minimap'` always wins.
  - `ILLUSTRATION_SCALE = 4` (16→64)
- **Status lines** (compact):
  - Seed (icon `SPR_STATUS_SEED = 132` + value)
  - Position in A1 notation (icon `SPR_STATUS_POS = 131` + value, e.g., `C7`)
  - Step count (icon `SPR_STATUS_STEPS = 130` + value)
  - Found-castle indicator (once found): render `FOUND` when `hasFoundCastle=true`, otherwise omit the line
- **Narrative/message text:** wrapped across multiple lines.

Layout rule of thumb (v1): place the status lines to the right of the illustration (top-aligned), then render message text beneath the taller of the illustration block or status block; clip to fit (best-effort; no scrolling in v1).

## Coordinates

### Internal (state)

- 0-based: `x ∈ [0..width-1]`, `y ∈ [0..height-1]`
- Wrap movement:
  - `x = (x + dx + width) % width`
  - `y = (y + dy + height) % height`

### Display (player)

Show **A1**:
- column letter: `A..J` for x=0..9
- row number: `1..10` for y=0..9

## World representation and tiles (v1)

### Stored in state

World is generated once per run and then treated as immutable data:
- `state.world.width`, `state.world.height`
- `state.world.tiles: number[][]` indexed `tiles[y][x]`

Reducer returns new state objects while reusing `state.world.tiles` by reference (because v1 never mutates tiles after generation).

### Tile IDs and sprite indices

Tile IDs are numbers. In v1, **tile IDs are the sprite indices** (identity mapping).

Provided sprite indices:
- Walkable cosmetic pool: `2, 4, 6, 10, 12, 14, 34, 36, 38`
- Special:
  - `TILE_CASTLE = 8`
  - `TILE_SIGNPOST = 42`

### Generation: `MAP_GEN_ALGORITHM` + placements

Prototype v2 uses a single fixed base terrain strategy: **`MAP_GEN_ALGORITHM = 'NOISE'`** (a smoothed random field quantized into the walkable cosmetic tile pool). Alternative algorithms were evaluated and removed from the cart to keep the prototype focused.

On `NEW_RUN(seed)` (after base terrain generation):
1. Place **1 Castle** by overwriting a cell at a random position.
2. Place **6 Signposts** by overwriting 6 distinct random positions (distinct from castle).
3. Pick a random start position (allowed to start anywhere, including castle or signpost).

**Determinism contract:** output is fully determined by `seed` for a given cart build. Same `seed` always yields the same `tiles`, `castlePosition`, and `startPosition`.

## State shape (v1)

All state is plain data (no functions, no class instances). Names favor clarity over brevity.

- `state.world`
  - `seed: number` (current run seed; first run uses `INITIAL_SEED`; restart uses `seed += 1`)
  - `width: number` (10)
  - `height: number` (10)
  - `tiles: number[][]` (`tiles[y][x]`, treated as immutable after generation)
  - `castlePosition: { x: number, y: number }` (for clue math + “found” detection)
  - `rngState: number` (uint32 stored in JS number)
- `state.player`
  - `position: { x: number, y: number }`
- `state.run`
  - `stepCount: number`
  - `hasFoundCastle: boolean`
- `state.ui`
  - `message: string` (wrapped for display; may be multi-sentence)
  - `leftPanel: { kind: 'auto' } | { kind: 'sprite', spriteId: number } | { kind: 'minimap' }` (prototype v2 “single concept” for left panel content)
- `state.input`
  - `mouseLeftDown: boolean` (latest sampled state from the previous `TICK`)

## Determinism and PRNG

Keep PRNG state inside `state` (e.g., `state.world.rngState` as uint32 stored in a JS number).

- **World generation (v2)** consumes the PRNG according to the fixed **NOISE** algorithm; comparing two runs requires the same `seed` (and the same cart build).

- Use a fixed initial seed constant for the first boot of the prototype (v1):
  - `INITIAL_SEED = 1`
- On `NEW_RUN(seed)`, derive `rngState` **only** from `seed` (so “same seed” is unambiguous). v1 seeding rule:
  - `rngState = (seed ^ 0xA5A5A5A5) >>> 0`
  - if `rngState === 0`, set `rngState = 1`
- Use PRNG for map generation and any flavor variants. **Map output is keyed by `seed`.**
- Do not use non-deterministic randomness.
- If a tie occurs in torus-shortest deltas for an even-sized map (e.g., exactly 5 on a 10-wide map), break ties deterministically (e.g., prefer the positive delta).
- **v1 RNG lifecycle:** `rngState` is advanced during `NEW_RUN` while generating and placing tiles. In v1, `MOVE`/`SHOW_GOAL` do **not** advance `rngState` (terrain copy is fixed; signpost is pure math).

## Encounters (inline; no modals)

### Goal narrative (on click)

`SHOW_GOAL()` sets the lore message to:

> Another soul sets out across the Unbound. Somewhere in these lands stands a castle older than memory. Find it.

### Message policy (v1)

`state.ui.message` is always “the most recent narrative line”. It updates on:
- `NEW_RUN`: set to the goal narrative (sets tone immediately without requiring a click). Then, if the starting tile is special, append one additional line:
  - starting on signpost: append the signpost clue line
  - starting on castle: append the castle-found line and set `hasFoundCastle=true`
- `SHOW_GOAL`: set to the goal narrative.
- `MOVE`: after movement resolves, set to:
  - signpost clue message if standing on a signpost
  - castle found message if standing on the castle
  - otherwise a deterministic one-line terrain message for the current tile ID (one line per tile ID in v1; **no RNG used for terrain flavor**)

### Signpost (on step)

On stepping onto `TILE_SIGNPOST`, set the lore message to:

`The Castle lies <DIR>, <D> leagues away.`

Where:
- `<D>` is **Manhattan distance** in 4-direction moves using torus-shortest deltas.
- `<DIR>` is compass direction from dx/dy signs:
  - dy < 0 → N, dy > 0 → S
  - dx < 0 → W, dx > 0 → E
  - combine (NE/NW/SE/SW) when both non-zero, formatted as vertical then horizontal (e.g., `NE`, not `EN`).
`<DIR>` and `<D>` are computed from the same torus-shortest `(dx, dy)` (after the stated tie-break).

Torus-shortest delta algorithm (v1):
- `raw = to - from`
- `wrapped = raw - size` and `wrapped2 = raw + size`
- choose the candidate with smallest absolute value; if tied, prefer the positive value
This is applied independently for x and y, producing `(dx, dy)`. Then `D = |dx| + |dy|`.

### Castle (on step)

On stepping onto `TILE_CASTLE`:
- Set `state.run.hasFoundCastle = true`
- Set a success message in lore (e.g., “The Castle looms before you.”)
- Movement remains available (no freeze)

### Terrain flavor (v1)

For non-special tiles, v1 uses a fixed one-line message per tile ID (no RNG). Initial draft (tunable later without changing architecture):

| Tile ID | Message |
|--------:|---------|
| 2  | The grass bends with your passing. |
| 4  | A cold wind worries the earth. |
| 6  | Stones crunch beneath your boots. |
| 10 | The ground here is bare and hard. |
| 12 | The air smells faintly of rain. |
| 14 | You follow a path that isn’t quite a path. |
| 34 | A ruin watches you in silence. |
| 36 | Blackened earth, long cooled. |
| 38 | The land dips, then rises again. |

## Reducer + input (single entrypoint)

All state transitions go through:

- `processAction(state, action) -> nextState`

v1 action set:
- `NEW_RUN({ seed })`
- `RESTART()` → `NEW_RUN({ seed: state.world.seed + 1 })`
- `MOVE({ dx, dy })`
- `SHOW_GOAL()`
- `TICK({ mouseX, mouseY, mouseLeftDown })`

`processAction` supports all v1 actions above as public reducer inputs. The runtime loop primarily calls `TICK`; tests (or debug tooling) may call `MOVE`/`SHOW_GOAL`/`RESTART` directly.

`NEW_RUN` resets run/UI/input fields (v1):
- `state.world` regenerated from the given seed (including `tiles`, `castlePosition`, `rngState`)
- `state.player.position` set to the generated start position
- `state.run.stepCount = 0`
- `state.run.hasFoundCastle = false` (then potentially set true if starting on the castle, per Message policy)
- `state.input.mouseLeftDown = false`
- `state.ui.message` set per Message policy

`TICK` is the only per-frame action. It:
- computes `justPressed = mouseLeftDown && !state.input.mouseLeftDown`
- updates `state.input.mouseLeftDown`
- if `justPressed`, performs click hit-testing and dispatches the corresponding logical action (MOVE/SHOW_GOAL/RESTART/NOOP) by reducing internally (or by returning a next-state equivalent).

This keeps input edge detection deterministic without mutable globals.

Order note (v1): `justPressed` is computed from `(prevDown, currentDown)`, then `mouseLeftDown` is updated to `currentDown`, then (if `justPressed`) the click is applied.

Click handling rules:
- Clicks in the left panel have no gameplay effect (no-op) in v1.
- Clicks in grid gaps are no-ops (v1).
- Clicks on disabled cell `(0,2)` are no-ops. Cell `(2,0)` is the minimap toggle in v2 (not disabled).
- Only `TICK` may update `state.input.mouseLeftDown` (no other action writes input state).

## Invariants (v1)

- `state.world.tiles[state.world.castlePosition.y][state.world.castlePosition.x] === TILE_CASTLE`
- `state.world.tiles` is never mutated after `NEW_RUN` completes.
- After `NEW_RUN`, `processAction` never replaces the `state.world.tiles` reference (it is treated as immutable persistent data in v1).
- In v1 generation, signposts are placed on cells distinct from the castle, so `D = 0` for signpost clues is impossible.

## TIC-80 integration notes

Cart metadata for JavaScript mouse/touch:

- `// script: js`
- `// input: mouse`

Mouse API (TIC-80): `mouse() -> x, y, left, middle, right, scrollx, scrolly`

Optional offline reference docs: keep machine-local paths in `LOCAL.md` (local-only; never committed).

**Boot sequence (v1):**
- On first frame, if `state` is uninitialized, initialize it by reducing `NEW_RUN({ seed: INITIAL_SEED })` once.
- Then, every frame, reduce `TICK({ mouseX, mouseY, mouseLeftDown })`.

**Touch expectation (v1):**
- On platforms where TIC-80 maps touch to mouse input (HTML export / mobile), touch is treated as **mouse left**. v1 is mouse-first but should remain touch-usable.

## Acceptance Criteria (v1)

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Boot new run with fixed seed | World is 10×10; seed displayed; map generated deterministically from seed; initial message contains the goal narrative (and may include one extra line if starting on a signpost/castle) |
| 2 | Click N/S/E/W cell | Player wraps correctly; step count increments; lore message updates |
| 3 | Click in a gap | No state change |
| 4 | Click center cell | No state change |
| 5 | Click Goal | Lore message becomes the goal narrative; navigation stays available; step count unchanged |
| 6 | Click Restart | New run with `seed = oldSeed + 1`; regenerated deterministically |
| 7 | Step onto Signpost | Lore message shows correct compass + torus-shortest Manhattan distance to castle |
| 8 | Step onto Castle | `hasFoundCastle=true`; success message shown; movement still works |
| 9 | Determinism | Same seed + same click sequence yields identical: `world.tiles`, `world.castlePosition`, `player.position`, `run.stepCount`, `run.hasFoundCastle`, and `ui.message` (input sampling fields may differ; prototype v2 uses fixed NOISE) |
| 10 | Click anywhere in left panel | No state change |
| 11 | Move onto a non-special cosmetic tile | Lore message becomes that tile’s fixed one-line terrain message |

**E2E test scope:** feature-only (prototype v1 behaviors only)

## E2E Decision

- **Asked:** yes
- **User decision:** yes

**E2E approach (v1):** manual checklist in TIC-80 with a fixed seed (for reproducibility), validated by on-screen state (seed, position, step count, and message text).

## Alternatives considered (rejected for v1)

### Signpost interaction

- **A (chosen):** inline clue message; stay in navigation (keeps pace; isolates navigation feel)
- **B (rejected-for-v1):** OK-modal acknowledgement (more “event beat” consistency, but adds friction when signposts are common)
- **C (rejected-for-v1):** player-initiated “Read sign” (more agency, but allows players to fly past all encounters and adds button-state complexity)

### Modal UI states

Rejected-for-v1: remapping the 3×3 grid into temporary “event modes” (Goal→OK, Combat→Attack/Flee, Loot→Collect/Leave). Likely in later phases, but v1 keeps navigation always available.

### Map-gen default
- **IID per-cell random fill (chosen for v1 default):** quickest baseline and a good control for the core question
- **Regions/Blobs (rejected-for-v1 default):** likely improves memorability; intended for later A/B iteration

## Future notes (out of scope for v1)

- Resources (army/food/gold), towns, combat, quests/keys/towers.
- **Play** minimap with visited/revealed tracking and/or “lost” hiding coordinates (v2’s minimap is full-terrain **debug** only).
- Dynamic tile events influenced by player stats and time-since-visit.
- UI “event beats” with cooldown/anti-farming logic.

