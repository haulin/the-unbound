# Mechanic Modules + Central Registry Design

## Context

**Prompt:** “/start see `docs/refactor-mechanics-encounters-worldgen.md`”

**Primary inputs:**
- `docs/refactor-mechanics-encounters-worldgen.md` (proposal sketch; supersedes `docs/refactor-architecture-overhaul.md`)
- `src/core/lore.ts` (mechanics inventory + lore/tone pools)
- `docs/backlog.md` (future mechanics; especially v0.4 PoI rework and v0.5 random encounters on any tile)

**Problem:** Adding or changing a mechanic currently requires edits across multiple “global” modules (move reducer, tile-enter registry, right-grid mapping, map labels/reveal, worldgen placement, lore selection). This scatters logic and increases the “repo-wide edit” tax for each new tile/feature.

**Why this approach:** Keep a small set of stable orchestrators (“aggregators”) and move mechanic-specific rules behind one per-mechanic module definition, registered once. This is intended to support the OCP-like workflow “add module + register it” while keeping the reducer pure and deterministic.

---

## Overview

We introduce **Mechanic Modules**: one module per mechanic/tile family (camp, town, gate, locksmith, henge, farms, signposts, terrain, …).

Each module exports a single declarative definition (`MechanicDef`). Core has exactly one registration point:

- `MECHANICS: readonly MechanicDef[]`

Core builds derived registries (maps + chains) from `MECHANICS` and uses them to drive:

- Tile-enter behavior
- Modal encounter starts (camp/town today; farm/locksmith later per backlog)
- Encounter action reducers
- Right-grid definitions (per encounter kind)
- Map labels (and later, more map-related policy)
- Move-event policy (per-kind hazard budgets + global event pool; v0.5-ready)
- (Later) worldgen placers

This keeps:
- `State` **data-only** (ideally JSON-serializable; no executable hooks in state)
- reducer **pure**
- rendering **mechanics-oblivious** (renderer consumes UI defs/models; it does not compute mechanics)

---

## Goals

- **Central registry for surfaces:** new mechanics should register onEnter/startEncounter/reduceAction/rightGrid/mapLabel/moveEvent policy in one place (`MECHANICS`).
- **OCP-friendly extension:** adding a new mechanic should primarily be:
  - add one module
  - add one entry to `MECHANICS`
  - (only when needed) extend types (`Cell`, `CellKind`) and worldgen/sprite IDs
- **No hidden ordering semantics:** `MECHANICS` list order should not silently change behavior.
- **Roadmap support:**
  - v0.4: more modal PoIs + “terrain payoff” tiles
  - v0.5: random encounters on any tile, without per-kind edits for each new global event type
- **Determinism discipline preserved:** RNG consumption stays explicit and stable; “stable flavor picks” remain possible without advancing `world.rngState`.

## Non-goals

- Rewrite all existing mechanics at once.
- Guarantee that adding a mechanic is *zero* edits outside its module (types/worldgen/constants still exist).

---

## Locked decisions

- **State is data-only:** mechanic hook functions live in modules, not in state.
- **Exclusive surfaces are uniquely owned by kind** (no “first match wins”):
  - tile-enter handler (`onEnter`)
  - modal encounter start (`startEncounter`)
  - map label (`mapLabel`)
  Conflicts are hard errors naming both mechanic ids.
- **Move-event policy is exclusive by kind:** per-kind `moveEventPolicy` ownership is unique (conflicts are hard errors), so hazard budgets cannot be accidentally double-applied.
- **Right-grid providers are exclusive by encounter kind:** only one provider may own a given `Encounter['kind']`.
- **Composition is explicit:** only explicitly mergeable surfaces may combine outputs; there is no implicit “registry list order wins”.
- **One event per move:** at most one move-event (fight/lost/loot/etc.) per MOVE resolution.
- **Default terrain is about tile-enter, not events:** woods/swamp/mountain can be terrain for lore/costs while still having move-event profiles.

---

## MechanicDef (conceptual contract)

Each mechanic module exports exactly one value (names illustrative):

- **Identity / ownership**
  - `id: string`
  - `kinds: readonly CellKind[]`

- **Exclusive by-kind surfaces** (unique ownership)
  - `onEnter?: TileEnterHandler`
  - `startEncounter?: StartEncounterFn`
  - `mapLabel?: Partial<Record<CellKind, string>>`

- **Encounter/action surfaces**
  - `reduceAction?: ReduceActionFn` (returns `State | null`; evaluated via an explicit short chain)
  - `rightGrid?: RightGridProvider` (typically keyed by `encounter.kind`)

- **Move-event surfaces (v0.5-ready)**
  - `moveEventPolicy?: Partial<Record<CellKind, MoveEventPolicy>>`

- **(Later) Worldgen**
  - `placeWorld?: WorldPlacer`

---

## Move pipeline (MOVE resolution)

MOVE resolution is treated as a stable pipeline owned by core:

1. Guardrails: ignore MOVE if run is over or a modal encounter is active.
2. Compute destination (torus wrap).
3. Apply base move cost (food + hunger damage).
4. Tile-enter stage (`onEnterByKind[destKind]`): message + optional world/resource/knowsPosition/hasWon deltas.
5. Game-over override if `armySize <= 0`.
6. Modal PoI start (`startEncounterByKind[destKind]`):
   - if a modal encounter starts, it is the beat for this move (no move-event stage on this move).
7. Move-event stage (`rollMoveEvent`) when not modal/game-over:
   - returns at most one event
   - apply consequences (combat start, teleport, etc.)
8. Run memory + animations (path/mappedness buffers + deltas + transitions).

Mechanics contribute via registries; core owns the pipeline shape.

---

## Move events: hazard budgets + global pool remainder (v0.5-ready)

We must combine per-kind hazards (woods/swamp lost; woods/mountain ambush; henge forced fight) with v0.5 “random encounters on any tile” **without** introducing ordering semantics and without per-kind edits when adding a new global event type.

### Combination rule

For a given `destKind`:

1. **Forced events** (100% when applicable)
   - Example: ready henge → forced fight.

2. **Per-kind hazard budget** (mutually exclusive outcomes)
   - Example today:
     - woods: ambushPct + lostPct (lostPct halved by scout, floor)
     - swamp: lostPct
     - mountain: ambushPct

3. **Global event pool uses leftover probability mass**
   - `hazardPct = sum(perKindPct)`
   - **Validation:** if `hazardPct > 100`, treat as a configuration error (fail loudly; do not clamp silently).
   - `leftoverPct = 100 - hazardPct`
   - if a keyed percentile lands in the leftover range, pick a global event from a weighted pool.

Invariant: **one event per move**.

### Determinism / RNG sequencing (normative)

- Forced events are decided first (no percentile roll needed).
- Otherwise, compute one keyed percentile `p ∈ [0, 100)` using the same keyed scheme as the current `tileEvents` roll (seed + stepCount + cellId; no `world.rngState` consumption).
  - If `p < hazardPct`, select the per-kind hazard bucket by cumulative ranges.
  - Else, select a global event using a **separate** keyed roll that does not affect hazard selection (e.g. a second keyed draw with a stable salt or cursor), then pick from a weighted pool.

This explicitly prevents “refactor added one extra RNG draw” from silently changing unrelated outcomes.

### OCP property

Adding a new global encounter type should be:
- add it to the global pool list (or new module + add to pool)
- no per-kind edits

Per-kind tuning still exists (and is expected) by editing hazard budgets in the per-kind move-event policy config, but it is centralized rather than scattered.

---

## Derived registries (built once; validated)

Core builds from `MECHANICS`:

- `onEnterByKind: Partial<Record<CellKind, TileEnterHandler>>` (with a fallback default handler)
- `startEncounterByKind: Partial<Record<CellKind, StartEncounterFn>>`
- `mapLabelByKind: Partial<Record<CellKind, string>>`
- `rightGridByEncounterKind: Partial<Record<Encounter['kind'], RightGridProvider>>` (exclusive by encounter kind)
- `reduceActionChain: readonly ReduceActionFn[]` (explicit, short; preserves current routing order initially)
- `moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>>` + `globalMoveEventPool`

Validation rules:
- duplicates on exclusive surfaces are hard errors naming both mechanic ids:
  - `onEnter` by kind
  - `startEncounter` by kind
  - `mapLabel` by kind
  - `moveEventPolicy` by kind
  - `rightGrid` by encounter kind
- `reduceActionChain` order is explicit and short (action routing, not tile ownership). Initial order should preserve current `processAction` dispatch semantics: camp first, then town, then any additional reducers introduced later.

### Right-grid provider contract (to avoid surprise)

Encounter providers define the **non-corner** cells of the 3×3 right-grid for their encounter kind. Core always owns the corner/meta buttons (goal/map/minimap/restart) and the overworld “tile preview + MOVE” cross.

### Global move event pool shape (minimum)

`globalMoveEventPool` is a weighted list of entries:
- `id: string`
- `weight: number`
- `roll(ctx) -> MoveEvent | null` or `apply(ctx) -> { worldDelta?; resourcesDelta?; message?; startEncounter?; ... }`

Default expectation: global events do not consume `world.rngState` unless the event’s outcome explicitly requires stream RNG (mirroring existing patterns).

---

## Mergeable surfaces (explicit; initial set)

To avoid “registry list order” becoming a hidden rule, we only allow merging where the merge semantics are written down:

- **Worldgen placers** (later): a deterministic ordered list, each placer operating on disjoint targets or using an explicit conflict rule. Order is part of the placer pipeline contract (not an accident of `MECHANICS` list order).
- **Map marker contributions** (future): if multiple mechanics can contribute markers, merging is “append then de-dupe by (label, pos)”, preserving determinism.

All other surfaces are exclusive unless explicitly promoted to mergeable with documented semantics.

---

## “Default terrain” clarified

“Default terrain” refers to the **tile-enter** surface. A kind can use default terrain tile-enter messaging while still having move-event policies.

This keeps “terrain lore/costs” separate from “hazards / global events”.

Practically:
- Core keeps a `getOnEnterHandler(kind)` helper that consults `onEnterByKind` and falls back to a single default terrain handler when missing.
- A single mechanic may own multiple kinds intentionally (e.g. `gate` + `gateOpen`), by listing both kinds under one `MechanicDef.kinds`.

---

## What “add a mechanic” should look like

Typical addition should be:

- create one new mechanic module exporting `MechanicDef`
- add it to `MECHANICS`
- extend `CellKind`/`Cell` only if the new tile needs new cell data
- add sprite IDs + worldgen placement only if required

Most existing global files should not need edits for routine additions.

---

## Migration plan (incremental; keep tests green by default)

1. Add `MechanicDef` + `MECHANICS` + registry builder with duplicate detection.
2. Route **tile-enter** through `onEnterByKind` (replacing `src/core/tiles/registry.ts`).
3. Route **modal starts** (camp/town; later farm/locksmith) through `startEncounterByKind`.
4. Introduce `rollMoveEvent` using the hazard-budget rule; initially match current `src/core/tileEvents.ts`.
5. Route **right-grid encounter remaps** through `rightGridByEncounterKind`.
6. Route **map labels** through `mapLabelByKind` (keep reveal policy in `gameMap.ts` initially).
7. Later: migrate worldgen to a placers pipeline.

**Plan sizing note:** This design is an umbrella. Implementation should be planned/executed in phases (e.g. “registry + tile-enter routing” first), rather than as one giant refactor batch.

---

## Behavior change policy

Default: no intentional gameplay changes during the refactor.

Allowed: small behavior changes that simplify shared logic (e.g. shared deterministic pickers), but only if:
- explicitly listed in the implementation plan
- approved before execution
- tests updated as part of that slice

---

## Testing strategy

Existing acceptance-style tests define the gameplay contract for this refactor:
- `tests/core/v0.0.9-key.acceptance.test.ts`
- `tests/core/v0.1-lost.acceptance.test.ts`
- `tests/core/v0.2-map-scout.acceptance.test.ts`
- `tests/core/v0.3-gold-towns.acceptance.test.ts`

Add targeted unit tests for:
- registry validation (duplicate ownership errors)
- move-event combination rule (hazard budget + global remainder) once introduced

---

## Acceptance Specs (GWT)

ATDD waived — architecture refactor with strong existing acceptance-style tests already defining gameplay behaviors. Behavioral expectations are documented in the sections above and in the existing acceptance tests.

---

## Behavioral Impact

- **Modified behaviors:** none intended initially (see Behavior change policy).
- **New behaviors:** none (architecture only).
- **Existing tests requiring updates:** none expected unless behavior changes are explicitly approved.

---

## ATDD Decision

- **ATDD:** waive
- **Reason (if waived):** Internal architecture refactor; existing acceptance tests already define the behavior contract.
- **GWT specs written:** no
- **Spec leakage reviewed:** yes
- **Behavioral impact acknowledged:** yes

