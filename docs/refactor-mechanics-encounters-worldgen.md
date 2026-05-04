## Refactor Proposal: mechanics-owned encounters + worldgen plugins

This document supersedes `docs/refactor-architecture-overhaul.md`.

### What’s already done (as of 2026-05-04)

- **Mechanic modules + central registry** (`src/core/mechanics/defs/*`, `MECHANICS`, `MECHANIC_INDEX`).
- **Derived registries** for:
  - `onEnterByKind`
  - `startEncounterByKind`
  - `rightGridByEncounterKind`
  - `mapLabelByKind`
  - `moveEventPolicyByKind`
  - `enterFoodCostByKind` (default + overrides)
- **Move events**: hazard policies are data-driven (`moveEventPolicyByKind`) and henge is modeled as `ambushPercent: 100` with cooldown checked via the henge cell.
- **Town action types**: town “offer kind” and town “action type” are unified (no more offer→action string mapping).

### What remains (next stages)

Two areas still have “core-owned behavior” that we may want to move behind the mechanics registry:

1. **Encounter action handling** (currently in `src/core/town.ts` and `src/core/camp.ts`, plus combat actions in the main reducer)
2. **World generation** (currently orchestrated and implemented in `src/core/world.ts`)

This proposal sketches an incremental refactor path for both.

---

## Stage A: Encounter action handling behind mechanics

### Problem

We already route **encounter start** and **encounter right-grid UI** via mechanics. But **encounter action reduction** still lives in `src/core/*` modules:

- `reduceTownAction` in `src/core/town.ts`
- `reduceCampAction` in `src/core/camp.ts`
- combat action handling is still core-owned (in `src/core/reducer.ts`)

So when adding a new modal encounter or changing an existing one, we still pay the “sprinkled logic” tax across multiple files.

### Goal

Make “a mechanic that owns an encounter kind” also own:

- which actions it accepts
- how it reduces them (pure reducer logic)
- any encounter-specific UI models (optional)

So adding/changing an encounter becomes: edit one mechanic module + ensure it’s registered once.

### Proposed shape

Extend the mechanics registry to include a per-encounter reducer map derived from `MECHANICS`, keyed by `Encounter['kind']`:

- `reduceEncounterActionByEncounterKind: Partial<Record<EncounterKind, ReduceEncounterAction>>`

Where:

- `ReduceEncounterAction = (prevState: State, action: Action) => State | null`
  - returns `null` when the action is not handled by that encounter reducer
  - returns a `State` (possibly unchanged) if it recognized the encounter kind but chose not to transition

Mechanic definition surface (one option):

- Add to `MechanicDef`:
  - `reduceEncounterAction?: ReduceEncounterAction`
  - `reduceEncounterActionKind?: EncounterKind`

Validation rules:

- If `reduceEncounterAction` is set, it must also specify which `EncounterKind` it owns.
- Two mechanics cannot register reducers for the same `EncounterKind`.

Then the main reducer becomes:

- **Before** any global action switchboard logic, if `s.encounter` is non-null:
  - lookup `reduceEncounterActionByEncounterKind[s.encounter.kind]`
  - call it and return the result if non-null
  - otherwise continue with normal handling (so global actions like map toggle can remain global if desired)

### Migration plan (incremental)

- **A1.** Introduce the registry surface + validation + tests.
- **A2.** Move `reduceCampAction` into `src/core/mechanics/defs/camp.ts` and register it for `'camp'`.
  - Keep helper functions (preview model etc.) wherever they fit best; goal is reducer ownership first.
- **A3.** Move `reduceTownAction` into `src/core/mechanics/defs/town.ts` and register it for `'town'`.
- **A4.** Move combat encounter actions (Fight/Return) behind a `'combat'` encounter reducer.
  - Keep the combat simulation functions where they are; only the action routing moves.

### Risks / watch-outs

- **Import cycles**: keep encounter reducer code in defs free of imports from `src/core/rightGrid.ts` (which depends on mechanics index). If you need sprite helpers, inline or move to a non-mechanics module that does not import `MECHANICS`.
- **Action global-vs-local policy**: decide which actions remain globally handled while in an encounter (e.g. toggles).

---

## Stage B: Worldgen as plugins (mechanics-owned placers)

### Problem

`src/core/world.ts` currently owns:

- base terrain generation
- smoothing passes
- feature placement (farms/camps/towns/henges/signposts/gate/locksmith)
- per-feature offer sets, cooldown initialization, naming pools, and various constraints

Even with mechanics modules, adding a new placeable PoI still requires edits to worldgen.

### Goal

Keep a small, stable `generateWorld()` orchestrator but move *feature placement* behind a registry:

- mechanics can optionally contribute worldgen steps
- the orchestrator runs them in a deterministic, explicit order

### Proposed shape

Add an optional worldgen hook to `MechanicDef`, for mechanics that place cells:

- `placeWorld?: (ctx: { cells: CellGrid; rngState: number }) => { rngState: number }`
- optional `worldgenPhase?: 'features' | 'postFeatures'` (or just use mechanic list order for now)

Or, if we want to keep terrain separate from mechanics, define a dedicated `WORLDGEN_STEPS` registry that includes:

- a base terrain step (core-owned)
- N mechanic-contributed feature steps (mechanics-owned)

Determinism:

- the orchestrator defines **phase ordering** and uses a single stream `rngState`
- steps may only consume stream RNG via passed `rngState` (no hidden reads)

### Migration plan (incremental)

- **B1.** Introduce the hook type + a small worldgen runner that executes all registered placers in order.
- **B2.** Move one feature at a time:
  - signposts (simple)
  - henges / farms / camps (named placement with cooldown init)
  - towns (offers + prices)
  - gate+locksmith (shared constraint; likely best as one combined placer owned by one mechanic module)
- **B3.** Leave base terrain generation + smoothing core-owned unless/until there’s a strong reason to make them pluggable.

### Risks / watch-outs

- **Ordering & constraints**: some features are interdependent. Prefer grouping coupled placement into one placer rather than introducing a general dependency solver early.
- **Testability**: add a small “worldgen determinism” test harness (same seed → same feature layout) before moving the more complex placers.
- **Failure modes**: today’s “place until count is reached” loops can hang if constraints become unsatisfiable. Worldgen steps should have a bounded attempt budget and fail loudly with seed + step name.
- **Context objects over positional args**: standardize placer callback signatures to accept a single ctx object (`{ x, y, rng }`) so call sites aren’t forced to thread unused params.
- **Shared helpers for repeated math**: extract and reuse clamp helpers (e.g. min torus Manhattan distance clamping) instead of copy/paste between placers.
- **Separate data from logic**: keep tuning/name pools/offer sets in one place per feature; keep placement mechanics small and composable.

---

## Suggested “future refactor” checklist

If/when we do Stage A + B, the remaining core modules should mainly be:

- orchestrators (move pipeline, worldgen runner)
- pure utility subsystems (rng, combat math, teleport selection)
- rendering adapters (TIC-80 render plans, sprite constants)

And the “what does this thing do?” behavior should be concentrated in:

- `src/core/mechanics/defs/*.ts`

