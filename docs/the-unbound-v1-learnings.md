# The Unbound prototype v1 — learnings

## Terms

**OCP (Open/Closed Principle)**: design modules so they are **open for extension** (you can add new behavior) but **closed for modification** (you don’t have to edit existing control-flow in many places to add it).

In practice: new features should usually be “add a new entry / new function” rather than “touch 4 unrelated switch statements”.

## What worked well (keep for future phases)

- **Single plain state + pure reducer**: `processAction(prevState, action) -> nextState` kept gameplay deterministic and iteration safe.
- **World immutable after generation**: `world.tiles` treated as persistent data prevented accidental nondeterminism.
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

- **Minimap as debug view:** the full-terrain minimap (toggle on cell `(2,0)`, sprite `78`) is ideal for feel iteration on map-gen (e.g. NOISE parameters) — you can see spatial structure without inferring it from movement alone. It is not a stand-in for a future “fog of war” or visited-tiles minimap.

## Workflow note (iteration vs elegance loop)

- For **feel iteration** (UI/UX, tuning counts, copy tone): iterate quickly, keep changes small, and update the design doc when a tweak becomes “the contract”.
- Once the direction stabilizes: do one “elegance pass” refactor to consolidate geometry/constants and remove accumulated one-off branching.

## Workflow/meta decisions (v1)

- **Throwaway experiment, intentionally**: v1 optimizes for learning speed and determinism, not long-term repo hygiene.
- **No git/PR yet**: repo initialization and formal integration happen only after the prototype proves it’s a good foundation for the full game.
- **“Don’t assume; ask” norm**: when UI/feel looks wrong, gather the user’s observations before attributing a cause (especially with TIC-80 sprite/rendering quirks).
- **Doc-as-contract during iteration**: once a tweak becomes stable (layout constants, button semantics, signpost count), capture it in the design doc so future diffs have an explicit baseline.
- **New behavior ⇒ new mini-cycle**: map-gen alternatives, new encounter modes, or contextual buttons should start with a small design update + plan + tests, then implementation, then verification/review again.

