## Proposal: mechanic modules + central registry

### Problem
Right now, adding a new tile/encounter tends to require edits across multiple “global” modules:
- `world.ts` (placement / naming / counts)
- `tiles/registry.ts` (tile-enter behavior)
- `reducer.ts` (encounter start + action handling)
- `rightGrid.ts` + TIC-80 render plan (buttons/icons)
- `gameMap.ts` (map labeling/reveal rules)

This creates sprinkled logic and high cognitive load: adding a feature requires repo-wide edits.

### Goals
- **OCP-friendly extension**: new mechanics can be added by creating a new module and registering it in one place, with minimal edits elsewhere.
- **Single source of truth per mechanic**: each tile/encounter defines its own hooks (worldgen, UI, map label, tile-enter, encounter behavior).
- **Preserve reducer purity + serializable state**: no functions in `State`, no render-time RNG consumption.
- **Keep platform rendering oblivious**: rendering consumes “models” and UI defs; it does not compute mechanics.

### Non-goals
- Perfect isolation of “every last reference” (some central orchestrators will always exist).
- Rewriting all existing tiles at once.
- Changing v0.2 behavior.

---

## Core idea
Define a “mechanic module” per tile/feature (camp, combat, farm, gate, etc.) that exports a **single declarative definition** with optional hooks.

Then replace hardcoded switch/if ladders with a small number of **aggregators** that iterate the registered mechanics.

### A sketch: `MechanicDef`

Each mechanic is a *module* with one export:

- Identity:
  - `id` (string; stable name for debugging)
  - `kinds` (which `CellKind`s it applies to; often 1)

- Worldgen hooks (optional):
  - `place?(ctx)`: place cells / names / initial cooldown data. (Or an adapter to existing `placeNamedFeature`.)

- Tile-enter hooks (optional):
  - `onEnter?(args): TileEnterOutcome` (like today’s `tiles/onEnterX.ts`)

- Encounter start hooks (optional):
  - `maybeStartEncounterOnMoveEnter?(ctx): Encounter | null`
    - Camp uses this.
    - Combat can use this *or* remain in tile-event flow; the point is: the start condition is owned by the mechanic, not `reducer.ts`.

- Encounter action hooks (optional):
  - `reduceAction?(prevState, action): State | null`
    - Camp uses this (already extracted).
    - Combat could later follow the same pattern (Fight/Return).

- UI hooks (optional):
  - `rightGridOverride?(s, row, col): RightGridCellDef | null`
    - Mechanics can override the cross layout during encounters, or provide corner actions.

- Map hooks (optional):
  - `mapLabelForKind?(kind): GameMapLabel | null`
  - (future) `mapGlobalReveal?(s): Marker[]` / `mapRevealPolicy?(...)` if we want to move those rules out of `gameMap.ts`.

### Central registry

One “registration point”:
- `src/core/mechanics/index.ts` exports `MECHANICS: readonly MechanicDef[]`

And a few generic aggregators:
- `buildTileEnterRegistry(MECHANICS)` → `Record<CellKind, TileEnterHandler>`
- `reduceMechanicAction(MECHANICS, prevState, action)` → first non-null result
- `maybeStartEncounter(MECHANICS, ctx)` → first non-null encounter
- `rightGridFromMechanics(MECHANICS, s, row, col, fallback)` → first override
- `mapLabelFromMechanics(MECHANICS, kind)` → first label

---

## Why this is better than “sprinkled switches”
- **Checklist encoded in types**: if we decide “every new mechanic must define at least onEnter + map label”, TS can enforce it.
- **Local reasoning**: when adding “Town”, you mostly stay inside `town.ts`.
- **Safer refactors**: aggregators are few and stable; mechanics are pluggable.

---

## Migration plan (incremental)

### Phase 1: Formalize the registry, keep behavior unchanged
- Create `MechanicDef` + `MECHANICS`.
- Keep existing code paths, but start routing one surface through the registry:
  - easiest: `tiles/registry.ts` (pure mapping today)

### Phase 2: Move encounter action handling behind mechanic hooks
- Already done for **camp** (`reduceCampAction`).
- Next: do the same for **combat** (Fight/Return) so `reducer.ts` stops growing.

### Phase 3: Move encounter start into mechanic hooks
- Camp: `maybeStartEncounterOnMoveEnter`.
- Combat: decide whether it stays in `tileEvents` or becomes a mechanic start hook that calls `rollTileEvent`.

### Phase 4: UI + map surfaces
- Right-grid: allow encounter mechanics to provide overrides instead of hardcoding `if (s.encounter.kind===...)`.
- Map labeling: remove `labelForKind` hardcoding and ask mechanics.

### Phase 5: Worldgen (optional; later)
- Move feature placement configs into mechanic defs gradually (camps/farms/henges/signposts).
- Keep “base terrain” in worldgen core; mechanics can be “feature placers”.

---

## Risks / trade-offs
- **Indirection cost**: you trade a switch statement for “iterate mechanics”. Keep the mechanics list small and the aggregators simple.
- **Ordering**: if multiple mechanics claim the same hook surface, order matters. Address by:
  - ensuring uniqueness by design (one mechanic per `CellKind`), or
  - explicit priorities.
- **Over-abstraction too early**: best to migrate only after we have 2–3 mechanics using the same hook.

---

## Open questions
- Should “terrain tiles” (grass/road/lake) be mechanics too, or stay as a simple table?
- Do we want *map reveal rules* to be per-mechanic, or keep that as one “map system” module?
- How should we represent “encounter-specific UI” in a way that stays platform-agnostic?

