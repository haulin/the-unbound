# The Unbound prototype v1 — learnings

## Terms

**OCP (Open/Closed Principle)**: design modules so they are **open for extension** (you can add new behavior) but **closed for modification** (you don’t have to edit existing control-flow in many places to add it).

In practice: new features should usually be “add a new entry / new function” rather than “touch 4 unrelated switch statements”.

## What worked well (keep for future phases)

- **Single plain state + pure reducer**: `processAction(prevState, action) -> nextState` kept gameplay deterministic and iteration safe.
- **World updates are explicit + localized**: the world is a grid of cells (`world.cells`), and feature state (e.g. cooldowns) is updated immutably by cloning only the touched row + cell.
- **Input edge detection inside reducer**: `TICK` owning `mouseLeftDown` prevented “held click repeats” bugs and avoids globals.
- **Button-as-data (extension point)**: representing the 3×3 grid as a mapping of “cell → definition” (preview + onPress) reduces edit sites when buttons change.

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

- **Animation as progressive enhancement (prototype v3)**: movement benefits from continuity/legibility, but animation should not infect game logic.
  - Recommendation: keep animations as plain data in state (`ui.clock.frame` + `ui.anim.active[]`) advanced only via `TICK`.
  - Keep one knob to disable all animations (debug/feel comparison, accessibility).
  - For move transitions, lock input while the transition is active to avoid “multiple moves per blur” feel.
  - Rendering lesson: if sprites slide, add explicit masking/clipping to the grid bounds each frame; otherwise tiles will “appear from nowhere” / “disappear suddenly” at animation start/end.

- **Map generation decision (prototype v2)**: we evaluated multiple generators and picked **NOISE** for v2 because it produces small distinct blobs (less “slot machine”), while still avoiding long same-terrain runs that can make limited visibility feel monotonous.
  - Alternatives considered: IID-per-cell baseline, BLOBS smoothing, DRUNKWALK/carve.
  - We removed the non-chosen generators from the cart to keep iteration focused (can revisit once final tile taxonomy is locked).

## Workflow note (iteration vs elegance loop)

- For **feel iteration** (UI/UX, tuning counts, copy tone): iterate quickly, keep changes small, and update the design doc when a tweak becomes “the contract”.
- Once the direction stabilizes: do one “elegance pass” refactor to consolidate geometry/constants and remove accumulated one-off branching.

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
- If you must weaken types, prefer **`unknown` + narrowing** rather than `any` (keeps “no implicit assumptions” discipline).
- If the codebase grows, consider adding linting later (e.g. forbid explicit `any`) — but don’t block prototype iteration on tooling.

## Workflow/meta decisions (v1)

- **Prototype-as-foundation**: optimize for learning speed *and* long-term maintainability. Treat the codebase as something we’ll grow, refactor, and keep readable.
- **“Don’t assume; ask” norm**: when UI/feel looks wrong, gather the user’s observations before attributing a cause (especially with TIC-80 sprite/rendering quirks).
- **Doc-as-contract during iteration**: once a tweak becomes stable (layout constants, button semantics, signpost count), capture it in the design doc so future diffs have an explicit baseline.


