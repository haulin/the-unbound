# The Unbound prototype v1 — learnings

## Terms

**OCP (Open/Closed Principle)**: design modules so they are **open for extension** (you can add new behavior) but **closed for modification** (you don’t have to edit existing control-flow in many places to add it).

In practice: new features should usually be “add a new entry / new function” rather than “touch 4 unrelated switch statements”.

## What worked well (keep for future phases)

- **Single plain state + pure reducer**: `processAction(prevState, action) -> nextState` kept gameplay deterministic and iteration safe.
- **World updates are explicit + localized**: the world is a grid of cells (`world.cells`), and feature state (e.g. cooldowns) is updated immutably by cloning only the touched row + cell.
- **Button-as-data (extension point)**: representing the 3×3 grid as a mapping of “cell → definition” (preview + onPress) reduces edit sites when buttons change.
- **RNG boundary discipline**: keep bitwise/u32 concerns in `src/core/prng.ts`; call sites use `randInt` + plain math.

## What surprised us (and what to do next time)

- **“Plan-shaped code” vs “human-shaped code”**
  - Executing a strict task list tends to produce narrowly-scoped structures first.
  - Human code often anticipates *known change vectors* (e.g. buttons becoming contextual), but only after those vectors are confirmed.
  - Recommendation: explicitly write down the **expected change vectors** up front, then decide which ones deserve an extension point now vs later.

- **UI mode/focus needs one stable concept**
  - Goal doesn’t move the player but still needs to update the left illustration + message.
  - Ad-hoc fields per new requirement become a smell.
  - Recommendation: carry a single stable concept in UI state (e.g. `ui.focusSpriteId` / a “focused thing”), and drive it through the same button pipeline as movement.

## “Known future change vectors” worth designing for

- **Contextual buttons**: the 3×3 grid will likely depend on current tile, inventory, encounters, cooldowns, etc.
  - Recommendation: keep `ButtonDef` style, but make it *contextual* via a pure builder:
    - `getButtonDefs(state) -> ButtonDef[3][3]` (or a `{key -> def}` map)
    - Each `ButtonDef` stays pure: `previewSpriteId(state)`, `onPress(state)`.
  - Keep functions **out of `state`**; `state` stays serializable data.

- **Animation as progressive enhancement**: movement benefits from continuity/legibility, but animation should not infect game logic.
  - Recommendation: keep animations as plain data in state (`ui.clock.frame` + `ui.anim.active[]`) advanced only via `TICK`.
  - Keep one knob to disable all animations (debug/feel comparison, accessibility).
  - For move transitions, lock input while the transition is active to avoid “multiple moves per blur” feel.
  - Rendering lesson: if sprites slide, add explicit masking/clipping to the grid bounds each frame; otherwise tiles will “appear from nowhere” / “disappear suddenly” at animation start/end.

- **Map generation decision**: we evaluated multiple generators and picked **NOISE** for v2 because it produces small distinct blobs (less “slot machine”), while still avoiding long same-terrain runs that can make limited visibility feel monotonous.
  - Alternatives considered: IID-per-cell baseline, BLOBS smoothing, DRUNKWALK/carve.
  - We removed the non-chosen generators from the cart to keep iteration focused (can revisit once final tile taxonomy is locked).

## Workflow note (iteration vs elegance loop)

- For **feel iteration** (UI/UX, tuning counts, copy tone): iterate quickly, keep changes small, and update the design doc when a tweak becomes “the contract”.
- Once the direction stabilizes: do one “elegance pass” refactor to consolidate geometry/constants and remove accumulated one-off branching.
- If a UI/layout change has multiple plausible shapes, agree on one approach before implementing (avoid mixing half-solutions).

## UI rendering learnings (TIC-80 specifics)

- **Transparency is part of UI design**: if a hover highlight/tint is drawn behind an icon, the sprite often needs an explicit transparency key (colorkey) so its “background pixels” don’t erase the tint.

## Refactor philosophy (boy scout rule)

- **Optimize for the reader**: the cost of writing is not the constraint here — the cost of reading is.
- **Code churn isn’t the enemy**: refactor freely when it improves clarity and reduces parallel bookkeeping.
- **“From scratch” test**: ask “Would I design this feature this way from scratch, knowing what I know now?” If not, refactor toward that shape.
- **Prefer fewer sources of truth**: if data belongs to a thing, store it on the thing (e.g. cooldown on a cell), not in a parallel array “somewhere else”.

## Roadmap architecture note (cell objects)

- World state uses cell objects (`world.cells: Cell[][]`) with a string `kind` per coordinate (e.g. `grass`, `farm`, `camp`).
- Feature-specific state (like farm/camp cooldowns) lives on the cell itself (`nextReadyStep`) instead of parallel arrays, so adding more PoIs (or richer tiles like towns) doesn’t multiply bookkeeping.

## Type safety note (avoid `any`)

- Prefer **type guards / discriminated unions** over `: any` or `as any`.
- If you must weaken types, use **`unknown` + narrowing at explicit boundaries**, not deep inside core gameplay code.
- **Core / reducer surfaces**: prefer **fail-fast, typed `Ui`** in helpers that assume full UI shape — don’t accept `unknown` at those boundaries just to save casts at call sites.
- If the codebase grows, consider adding linting later (e.g. forbid explicit `any`) — but don’t block prototype iteration on tooling.

## Workflow/meta decisions (v1)

- **Prototype-as-foundation**: optimize for learning speed *and* long-term maintainability. Treat the codebase as something we’ll grow, refactor, and keep readable.
- **“Don’t assume; ask” norm**: when UI/feel looks wrong, gather the user’s observations before attributing a cause (especially with TIC-80 sprite/rendering quirks).
- **Doc-as-contract during iteration**: once a tweak becomes stable (layout constants, button semantics, signpost count), capture it in the design doc so future diffs have an explicit baseline.

## v0.0.9 — The Key (process + architecture notes)

- **Volatile copy belongs in code**: treat player-facing strings in `src/core/constants.ts` as the source of truth; docs should use “such as” examples and avoid freezing exact wording.
- **Deterministic flavor without perturbing RNG**: use deterministic pickers for text (seed + cellId + stepCount) and avoid consuming `world.rngState` in tile-enter handlers.
- **Worldgen constraints need guardrails**: when adding placement constraints (e.g. minimum torus Manhattan distance between features), clamp impossible values and test across many seeds.
- **Run start should be inert**: on spawn, don’t run tile-enter logic (no signpost clue / auto-buy / auto-win); show only the goal narrative. Tile interactions happen when you move onto tiles.

## v0.1 — Lost (process + architecture notes)

- **Single per-move event roll beats parallel rolls**: when multiple outcomes compete for the same trigger surface (woods → combat or lost), a single percentile-bucketed function (`src/core/tileEvents.ts:rollTileEvent`) makes mutual exclusion structural and each outcome tunable as one knob per terrain. Avoids stacked-density surprises (two independent 25% rolls = 50% any-event).
- **Tile-enter outcomes carry monotonic flags**: `TileEnterOutcome.knowsPosition?: boolean` mirrors the existing `hasWon?` pattern — handler returns true when applicable, reducer ORs into run state. Same shape lets future flags (visited, etc.) plug in without new wiring.
- **`gridTransition` anim params encode render mode, not position**: `params.from`/`params.to` only mean blank/overworld/combat. An `'overworld' → 'overworld'` transition is visually inert (renderer resolves both phases against the already-updated `s.player.position`). For "moved without sliding" (teleport), reuse `'blank' → 'overworld'` (run-start reveal). Caveat invisible from tests — caught only by manual smoke. Worth a regression assertion on `s.ui.anim.active` if anim params evolve.
- **Pure module + RNG-threading reuse**: `src/core/teleport.ts:pickTeleportDestination` follows the same `(args) → { result, rngState }` shape as worldgen `placeFeature`. Composable, replayable, deterministic.
- **Reuse established pickers before inventing new ones**: a standalone `lostFlavor.ts` with a salted hash duplicated `pickDeterministicLine` (the canonical flavor-pool picker used by gate/locksmith/farm/camp/henge/terrain). Removed; reducer now calls `pickDeterministicLine(LOST_FLAVOR_LINES, …)` directly. The salt was defensive over-engineering — `h % 100` (event roll) and `h % N` (flavor pick) are nearly independent for uniform `h`. Check the established helpers in `tiles/poiUtils.ts` before adding a new module.
- **Terrain lore as a pool teaches mechanics through repetition**: `TERRAIN_LORE_BY_KIND` gives event-bearing terrains 3-line pools (one mechanic hint per applicable event + pure flavor). Players learn that woods can ambush *or* dislocate by re-reading; explicit tutorial text not needed. Inert terrains (grass/road/lake/rainbow) stay as single-line pools.
- **Versioning shifted to MAJOR.MINOR**: patch versions skipped — features that previously would have been v0.1.1 / v0.1.2 are v0.2 / v0.3 instead. Backlog and `package.json` reflect this.

