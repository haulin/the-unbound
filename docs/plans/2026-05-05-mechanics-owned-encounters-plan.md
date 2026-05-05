# Mechanics-owned Encounters — Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints. Tasks are organized into **6 compile-slices** — each slice ends in a green build. Implement slice-by-slice; do not interleave.

## Context

**Prompt:** `/start see docs/refactor-mechanics-encounters-worldgen.md … main idea is to create a system where adding a new mechanic is largely centralised in the mechanics def file … reduce duplication`

**Reasoning:** Implement the design in [2026-05-05-mechanics-owned-encounters-design.md](2026-05-05-mechanics-owned-encounters-design.md). The reducer becomes a thin orchestrator; per-mechanic encounter behavior, bypass logic, cell mutations, and grid-transition emissions move into mechanic def files; cross-encounter copy-paste collapses into a shared `encounterHelpers` module.

**Plan structure:** Originally drafted as a flat T1–T15 sequence; restructured after `/audit plan` into **6 compile-slices** to ensure each slice ends in a green build (avoiding a long red-build window in the middle). Tasks retain numeric IDs for criteria traceability, but the **slice boundary is the unit of execution and review**.

---

**Goal:** Make [src/core/reducer.ts](src/core/reducer.ts) mechanic-name-free. Adding a new modal-encounter mechanic touches one file under `src/core/mechanics/defs/` plus the deliberate exceptions ([spriteIds.ts](src/core/spriteIds.ts), [lore.ts](src/core/lore.ts), and the inevitable additions in [types.ts](src/core/types.ts) / [constants.ts](src/core/constants.ts)).

**Architecture:** Per-encounter `reduceEncounterAction` registry keyed by `encounter.kind`, with a small global-action allowlist (`TICK`, `TOGGLE_MAP`, `TOGGLE_MINIMAP`, `SHOW_GOAL`, `RESTART`) handled before encounter dispatch. `NEW_RUN` stays as a special bootstrap path above everything (works for both null `prevState` and mid-run regen, as today). `onEnter` + `startEncounter` collapse into a single `onEnterTile(ctx) -> TileEnterResult` hook that returns next state, optional encounter, and optional `enterAnims`. Mechanic owns its own `gridTransition` enqueueing.

**Tech Stack:** TypeScript, Vitest, TIC-80 renderer ([src/platform/tic80/*](src/platform/tic80/)), bundled cart output [the-unbound.js](the-unbound.js).

**TDD during implementation:** explicit waive per `/start` — refactor with strong existing test coverage (30 files); B1 in design treats those as the spec. Add small unit tests only for new pure helpers in `encounterHelpers.ts` if a contract isn't already exercised end-to-end.

**ATDD during implementation:** explicit waive per `/start` — existing acceptance tests under [tests/core/v0.X-*.acceptance.test.ts](tests/core/) are the de facto behavioral specs per design B1.

---

## Criteria Traceability

Design source of truth: [2026-05-05-mechanics-owned-encounters-design.md](2026-05-05-mechanics-owned-encounters-design.md).

| Criterion | Behavior / shape | Slice / Task(s) | Status |
| --------- | ---------------- | --------------- | ------ |
| C1 | Zero mechanic-kind banlist literals in [src/core/reducer.ts](src/core/reducer.ts) (end-state, after Slice 5) | S5: T13a, T13b, T13c | ✅ done |
| C2 | `src/core/{camp,town,farmEncounter,locksmithEncounter}.ts` deleted; all consumers (tests + [src/platform/tic80/render.ts](src/platform/tic80/render.ts)) updated | S6: T14 (consumer migration) → T16 (delete shims) | ✅ done |
| C3 | [src/core/mechanics/encounterHelpers.ts](src/core/mechanics/encounterHelpers.ts) exists, imported by ≥3 defs | S2: T3; S4: T9–T12 | ✅ done |
| C4 | `MechanicDef.onEnterTile` is the only tile-enter hook; `onEnter`/`startEncounter`/`rightGridEncounterKind` no longer exist | S1: T1, T2; S5: T13c | ✅ done |
| C5 | `MechanicDef.reduceEncounterAction` set on ≥5 defs (camp/town/farm/locksmith/combat) | S4: T7, T9–T12 | ✅ done |
| C6 | Reducer's encounter dispatch is a single registry call, not a chain | S5: T13a | ✅ done |
| C7 | [src/core/mechanics/moveEvents.ts](src/core/mechanics/moveEvents.ts) has zero hardcoded mechanic kind names | S3: T4–T6 | ✅ done |
| C8 | Hypothetical new modal mechanic touches only the documented files | S6: T15 (thought experiment) | ✅ done (logic side); render/world-gen branches noted as deferred follow-up |
| B1 | All existing tests pass; minor pre-approved RNG/animation tweaks called out in PR | S6: T14, T15 | new |
| B2 | TypeScript build green | end of every slice; finalized in S6: T15 | new |
| B3 | Manual smoke test green | S6: T15 | new |
| B4 | Local CI (`/test-ci`) green when `.github/workflows/` exists | S6: T15 (final step) + workflow gate | new |

---

## Slice 1 — Type surface, registry, and mechanical def migration

**Goal:** Establish the new `MechanicDef` API and migrate every def to compile against it. End state: project typechecks; tests probably red because behavior hasn't moved yet, but no unresolved imports.

**Risk anchors:** R8 (import cycles) — new types must not reference `MECHANIC_INDEX`.

### T1. Update `MechanicDef` types

**File:** [src/core/mechanics/types.ts](src/core/mechanics/types.ts)

Add `AnimSpec`, `TileEnterCtx`, `TileEnterResult` (including `foodDeltas`/`armyDeltas` preserved from today's `TileEnterOutcome`), `ReduceEncounterAction`. Add `onEnterTile`, `encounterKind`, `reduceEncounterAction` fields to `MechanicDef`.

**Remove:** `TileEnterHandler`, `StartEncounterFn`, and on `MechanicDef` itself: `onEnter`, `startEncounter`, **and `rightGridEncounterKind`** — the latter merges into the unified `encounterKind`. The registry (T2) drives both right-grid lookup and `reduceEncounterAction` dispatch from this one field.

Concrete shapes per design § "MechanicDef surface (additions)".

**Verification:** none yet — T2 and T1.5 (def stubs) wire it up.

### T1.5. Mechanical migration of every def to the new types

**Files:** every file under [src/core/mechanics/defs/](src/core/mechanics/defs/).

Mechanical change only — no behavior moves yet:

- Rename `onEnter: TileEnterHandler` → `onEnterTile: (ctx) => TileEnterResult`. Adapt return shape: today's `TileEnterOutcome.message` is required; new `TileEnterResult.message` is optional with default-terrain fallback. Defs that always returned a message keep returning one. The new ctx loses some fields the old one had (`prevPos`, `dx`, `dy`, `prevResources`, `ui`); use them only where needed.
- Rename `rightGridEncounterKind` → `encounterKind` everywhere it appears.
- For mechanics that already had `startEncounter`, keep that logic temporarily as a private helper inside the def file (e.g. `function buildEncounter(ctx) { ... }`); it'll be invoked from `onEnterTile` once Slice 4 wires it. The def's `onEnterTile` for now mirrors today's `onEnter` exactly (returns just a message), so behavior is unchanged.

**No new logic.** Just shape adjustments so the code typechecks under the new types.

**Verification:** `tsc --noEmit` green. Tests probably still pass since `reduceMove` still calls `onEnterByKind[kind]`... wait, that's gone. See T2.

### T2. Update `MechanicIndex` and registry

**Files:** [src/core/mechanics/registry.ts](src/core/mechanics/registry.ts), [src/core/mechanics/index.ts](src/core/mechanics/index.ts)

In `MechanicIndex`:

- Drop `onEnterByKind`, `startEncounterByKind`, and the `rightGridByEncounterKind`-keyed-by-`rightGridEncounterKind` wiring.
- Add `onEnterTileByKind: Partial<Record<CellKind, OnEnterTile>>`.
- Add `reduceEncounterActionByEncounterKind: Partial<Record<EncounterKind, ReduceEncounterAction>>`.
- `rightGridByEncounterKind` is now keyed by the unified `encounterKind`.

In `buildMechanicIndex`:

- Validate that any def setting `reduceEncounterAction` also sets `encounterKind`, and that no two defs claim the same `encounterKind`.
- Validate that any def setting `rightGrid` also sets `encounterKind`.
- Validate that any def setting `onEnterTile` claims at least one `kind` **OR** has `encounterKind` (combat mechanic exception: `kinds: []`, `encounterKind: 'combat'`, no `onEnterTile`).

**Bridge for Slice 1 only:** [src/core/mechanics/onEnter.ts](src/core/mechanics/onEnter.ts) currently reads `onEnterByKind`. Since this slice already has `onEnterTileByKind`, update `getOnEnterHandler` to wrap an `onEnterTile` handler back into the legacy `TileEnterHandler` shape (returning `TileEnterOutcome`) so `reduceMove` keeps working until Slice 5 rewrites it. This is **transitional**; T16 in Slice 5 deletes `onEnter.ts`.

**Verification:** [tests/core/mechanics.registry.test.ts](tests/core/mechanics.registry.test.ts) — **expect a full rewrite** of this test file (it asserts the old `onEnterByKind`/`startEncounterByKind`/`rightGridEncounterKind` shape; rewrite to assert `onEnterTileByKind`/`reduceEncounterActionByEncounterKind`/the unified `encounterKind`-keyed `rightGridByEncounterKind`). Add new cases for the duplicate-`encounterKind` validation and the `rightGrid ⇒ encounterKind` validation.

After this task: `npm test` should be green again (transitional wrapper in `onEnter.ts` keeps `reduceMove` working).

---

## Slice 2 — Shared encounter helpers

**Goal:** Land the helpers module without changing call sites yet. End state: green build, helpers exist but unused.

### T3. Create shared `encounterHelpers`

**File (new):** [src/core/mechanics/encounterHelpers.ts](src/core/mechanics/encounterHelpers.ts)

Extract the helpers identified during the design audit:

```ts
export function encounterPrefix(cell: NamedCell): string  // "Big Henge Henge", "A Town Town", etc.
export function appendMessage(state: State, prefix: string, line: string): State
export function noGoldResponse(state: State, prefix: string, cellId: number, rnd: RunCopyRandom): State
export function leaveEncounter(state: State, gridFromKind: GridFromKind): State
export function spendAndAnimate(state: State, cost: number, message: string, extras?: { foodGain?: number; armyGain?: number; runUpdate?: Run }): State
export function applyEnterAnims(ui: Ui, anims: readonly AnimSpec[], startFrame: number): Ui  // used by reducer in Slice 5
```

(Naming: design and plan now agree on `spendAndAnimate`.)

**Constraint:** must NOT import `MECHANIC_INDEX` (R8 in design). Imports allowed: `types`, `uiAnim`, `cells`, `rng`, `constants`.

**Verification:**

- `tsc --noEmit` green.
- Add a small focused unit test for `applyEnterAnims` that asserts each `AnimSpec` kind translates to the right `enqueueAnim`/`enqueueGridTransition` call. (The other helpers are exercised via Slice 4 encounter tests.) New file: `tests/core/encounterHelpers.test.ts`.

---

## Slice 3 — Move-event purification + reducer call-site bridge

**Goal:** Strip mechanic-name awareness from `moveEvents.ts` AND update its sole production caller (`reducer.ts`) in the same slice. End state: green build, henge cooldown still enforced (via a transitional reducer-side guard, since `henge.onEnterTile` doesn't yet handle ambushes).

**Risk anchors:** R3 (henge cooldown timing), R5 (move-event RNG keying).

### T4. Purify `moveEvents.ts` AND update its caller

**Files:** [src/core/mechanics/moveEvents.ts](src/core/mechanics/moveEvents.ts), [src/core/reducer.ts](src/core/reducer.ts).

In `moveEvents.ts` — strip mechanic-name awareness:

```ts
export type MoveEventSource = 'woods' | 'mountain' | 'swamp' | 'henge'  // stays in types

export function rollMoveEvent(args: {
  policy: MoveEventPolicy
  hasScout: boolean
  source: MoveEventSource     // caller passes; helper echoes on result (preserves test stability per design B1)
  rngKeys: { seed: number; stepCount: number; cellId: number }
}): { kind: 'fight'; source: MoveEventSource } | { kind: 'lost'; source: MoveEventSource } | null
```

Per design's **`MoveEvent.source` decision**: keep `source` on the result type to preserve tileEvents test result-shape assertions; only test call-site shape changes.

The henge cooldown check (`if (kind === 'henge') { ... readyAt }`) is **removed** from `moveEvents.ts`.

In `reducer.ts` — same task, atomic with the helper change:

- Update the `rollMoveEvent({ ... })` call inside `reduceMove` (today around line 334–339) to pass `policy: moveEventPolicyByKind[destKind]`, `source: destKind as MoveEventSource`, `hasScout`, `rngKeys: { seed, stepCount, cellId }`.
- **Add a transitional henge cooldown guard** at the call site: if `destKind === 'henge'` and `stepCount < destCell.nextReadyStep`, skip the `rollMoveEvent` call (mirrors today's `moveEvents.ts` behavior). This guard is **deleted** in T13b once `henge.onEnterTile` owns the cooldown end-to-end.
- Tag the guard with a comment: `// TRANSITIONAL: removed in T13b once henge.onEnterTile owns cooldown.`

**Verification:**

- [tests/core/tileEvents.test.ts](tests/core/tileEvents.test.ts), [tests/core/tileEvents.scout.test.ts](tests/core/tileEvents.scout.test.ts) — test call sites change shape (`{cell: {kind: 'woods'}}` → `{policy: woodsPolicy, source: 'woods', ...}`); ~10 mechanical line edits per file. Result-shape assertions remain unchanged.
- Henge-cooldown coverage in [tests/core/v0.1-lost.acceptance.test.ts](tests/core/v0.1-lost.acceptance.test.ts) and any tile-events henge case still green (transitional guard preserves behavior).
- Full suite green.

### T5. Add `onEnterTile` to `terrainHazards.ts` (no behavior change yet)

**File:** [src/core/mechanics/defs/terrainHazards.ts](src/core/mechanics/defs/terrainHazards.ts)

Implement `onEnterTile` for `woods` / `swamp` / `mountain`. **For Slice 3, this is dead code** — `reduceMove` still uses the legacy path via the bridge in `onEnter.ts`. The dead code lights up in Slice 5.

Logic:

1. Compute the default tile-enter message (currently done by `onEnterDefaultTerrain` in [src/core/mechanics/onEnter.ts](src/core/mechanics/onEnter.ts)).
2. Look up the kind's policy from `moveEventPolicyByKind` on this def.
3. Call `rollMoveEvent` with `{policy, source: ctx.cell.kind as MoveEventSource, hasScout: ctx.resources.hasScout, rngKeys: {seed, stepCount, cellId}}`.
4. On `'fight'`: spawn enemy army (use existing [src/core/combat.ts](src/core/combat.ts) `spawnEnemyArmy`), build `combat` encounter, return `{ encounter, message: COMBAT_ENCOUNTER_LINES pick, enterAnims: [{kind:'gridTransition', from:'overworld', to:'combat', afterFrames: MOVE_SLIDE_FRAMES}], world: { ...world, rngState } }`.
5. On `'lost'`: call `pickTeleportDestination`, return `{ teleportTo: dest, message: LOST_FLAVOR_LINES pick, enterAnims: [{kind:'gridTransition', from:'blank', to:'overworld'}], world: { ...world, rngState } }`.
6. Otherwise: just the default-terrain message.

**Imports check (R8):** `spawnEnemyArmy` from `../../combat`, `pickTeleportDestination` from `../../teleport`. Confirmed leaf modules — no cycle.

**Verification:** `tsc --noEmit` green. Behavior tests don't exercise this path until Slice 5 — that's expected.

### T6. Add `onEnterTile` to `henge.ts` (no behavior change yet)

**File:** [src/core/mechanics/defs/henge.ts](src/core/mechanics/defs/henge.ts)

Replace the placeholder `onEnterTile` from Slice 1's mechanical migration with the real ambush + cooldown logic:

1. If `stepCount < hengeCell.nextReadyStep`: return `{message: HENGE_EMPTY_LINES pick}`.
2. Else: build the default-ready henge lore message, then roll the move event using the henge policy (`ambushPercent: 100`).
3. On ambush (always when ready, given `ambushPercent: 100`): spawn enemy army, mutate the henge cell to set `nextReadyStep = stepCount + HENGE_COOLDOWN_MOVES`, return `{ world: nextWorldWithCell, encounter, message: HENGE_ENCOUNTER_LINE, enterAnims: [{kind:'gridTransition', to:'combat'}] }`.

**Still dead code in Slice 3** — Slice 5 lights it up. The transitional guard in `reducer.ts` (T4) keeps real henge behavior intact in the meantime.

**Verification:** `tsc --noEmit` green.

---

## Slice 4 — Encounter reducers move into defs

**Goal:** Move the four encounter reducers + combat into their respective defs. Old files at `src/core/{camp,town,farmEncounter,locksmithEncounter}.ts` are reduced to **thin re-export shims** so the existing `reducer.ts` import chain continues to work. End state: green build, encounter behavior identical, but the actual code lives in the def files.

**Risk anchors:** R1 (import cycles), R2 (combat RNG ordering), R6 (test imports).

### T7. Move combat reducer into `defs/combat.ts`

**File:** [src/core/mechanics/defs/combat.ts](src/core/mechanics/defs/combat.ts)

Add `encounterKind: 'combat'` (replaces the previous `rightGridEncounterKind`) and `reduceEncounterAction`:

1. Move the entire `ACTION_FIGHT` block from [src/core/reducer.ts](src/core/reducer.ts) (lines ~651–789) verbatim into a `reduceFight(state)` helper inside `combat.ts`.
2. Move the entire `ACTION_RETURN` block (lines ~606–650) into a `reduceReturn(state)` helper.
3. **Co-move the local helpers** that combat depends on: `normalizeResources` and `gameOverMessage` from `reducer.ts` (lines ~121–146). Two options — pick one and call it out:
   - **A (preferred):** extract them to a shared module `src/core/runState.ts` so both `reducer.ts` (for game-over checks elsewhere) and `combat.ts` import from there. No cycle (runState only imports `types`/`constants`).
   - **B (simpler):** copy them into `combat.ts` as private helpers; `reducer.ts` keeps its copy. Slight duplication but zero coupling between def and reducer.
   
   Recommend A.
4. `reduceEncounterAction` switches on `action.type === ACTION_FIGHT | ACTION_RETURN`, returns `null` for anything else.
5. Use `applyEnterAnims` / `enqueueAnim` directly — combat's animation pattern is special enough to keep inline.

**Slice 4 wiring:** `reducer.ts` still has its `ACTION_FIGHT` / `ACTION_RETURN` blocks during Slice 4 (Slice 5 deletes them). So during Slice 4, the combat def's `reduceEncounterAction` exists but is **not invoked** — Slice 5 wires it via `reduceEncounterActionByEncounterKind`. No regression risk during Slice 4.

**RNG ordering:** preserve `RNG.createStreamRandom(nextWorld.rngState)` ordering for the gold-reward roll. R2 verification — [tests/core/combat.reducer.test.ts](tests/core/combat.reducer.test.ts) exercised in Slice 5.

**Verification:** `tsc --noEmit` green. Tests still pass (combat behavior unchanged — still served by the legacy reducer path during Slice 4).

### T9. Move camp reducer + helpers into `defs/camp.ts`

**Files:** [src/core/mechanics/defs/camp.ts](src/core/mechanics/defs/camp.ts), [src/core/camp.ts](src/core/camp.ts) (becomes a thin shim).

Move:

- `computeCampArmyGain`, `computeCampPreviewModel`, `CampPreviewModel` — keep exports, now from `defs/camp.ts`.
- `reduceCampAction` → becomes `reduceEncounterAction` on the def. Use `leaveEncounter` and `spendAndAnimate` helpers from T3 to remove the leave-flow and animation boilerplate.
- Replace the placeholder `onEnterTile` from Slice 1 with the real flow returning `{message, encounter: {...}, enterAnims: [{kind:'gridTransition', to:'camp'}]}`. (Dead enter-anims path until Slice 5; already-gated logic for opening the encounter is fine to wire here.)

Set `encounterKind: 'camp'`. Add `reduceEncounterAction`.

**Transitional shim:** [src/core/camp.ts](src/core/camp.ts) becomes:

```ts
// TRANSITIONAL: re-export shim. Deleted in Slice 5 / T16 once reducer.ts no longer imports from here.
export { reduceCampAction, computeCampArmyGain, computeCampPreviewModel } from './mechanics/defs/camp'
export type { CampPreviewModel } from './mechanics/defs/camp'
```

This keeps `reducer.ts` and platform code building until Slice 5.

**Verification:** [tests/core/camp.test.ts](tests/core/camp.test.ts), [tests/core/army-camps.reducer.test.ts](tests/core/army-camps.reducer.test.ts), [tests/core/rightGrid.camp.test.ts](tests/core/rightGrid.camp.test.ts), [tests/core/v0.2-map-scout.acceptance.test.ts](tests/core/v0.2-map-scout.acceptance.test.ts) — all still green via the shim. Test imports stay unchanged in Slice 4 (updated to direct def-file imports in Slice 6 / T14).

### T10. Move town reducer into `defs/town.ts`

**Files:** [src/core/mechanics/defs/town.ts](src/core/mechanics/defs/town.ts), [src/core/town.ts](src/core/town.ts) → shim.

Move `reduceTownAction` (with `getTownAtPlayer`, `townPrefix`, `rumorPool`) into the def. Set `encounterKind: 'town'`. Use `leaveEncounter`, `noGoldResponse`, `spendAndAnimate`, `appendMessage` helpers.

Shim contents:

```ts
export { reduceTownAction } from './mechanics/defs/town'
```

**Verification:** [tests/core/town.reducer.test.ts](tests/core/town.reducer.test.ts), [tests/core/rightGrid.town.test.ts](tests/core/rightGrid.town.test.ts), [tests/core/world.towns.test.ts](tests/core/world.towns.test.ts), [tests/core/v0.3-gold-towns.acceptance.test.ts](tests/core/v0.3-gold-towns.acceptance.test.ts) — all green via shim.

### T11. Move farm reducer into `defs/farm.ts`

**Files:** [src/core/mechanics/defs/farm.ts](src/core/mechanics/defs/farm.ts), [src/core/farmEncounter.ts](src/core/farmEncounter.ts) → shim.

Move `reduceFarmAction` (with `getFarmAtPlayer`, `farmPrefix`) into the def. Set `encounterKind: 'farm'`. Use shared helpers.

Shim:

```ts
export { reduceFarmAction } from './mechanics/defs/farm'
```

**Verification:** [tests/core/farms.reducer.test.ts](tests/core/farms.reducer.test.ts), [tests/core/v0.4-poi-terrain-payoff.acceptance.test.ts](tests/core/v0.4-poi-terrain-payoff.acceptance.test.ts) — green via shim.

### T12. Move locksmith reducer into `defs/locksmith.ts`

**Files:** [src/core/mechanics/defs/locksmith.ts](src/core/mechanics/defs/locksmith.ts), [src/core/locksmithEncounter.ts](src/core/locksmithEncounter.ts) → shim.

Move `reduceLocksmithAction` into the def. Set `encounterKind: 'locksmith'`.

Replace the Slice-1 placeholder `onEnterTile` with the bypass-aware flow:

```ts
const onEnterLocksmith: OnEnterTile = (ctx) => {
  const r = RNG.createTileRandom(...)
  if (ctx.resources.hasBronzeKey) {
    return { message: `${LOCKSMITH_NAME}\n${r.perMoveLine(LOCKSMITH_VISITED_LINES)}` }
  }
  const message = `${LOCKSMITH_NAME}\n${r.stableLine(LOCKSMITH_ENTER_LINES)}`
  return {
    message,
    encounter: { kind: 'locksmith', sourceKind: 'locksmith', sourceCellId: cellIdFor(ctx), restoreMessage: message },
    enterAnims: [{ kind: 'gridTransition', from: 'overworld', to: 'locksmith', afterFrames: MOVE_SLIDE_FRAMES }],
  }
}
```

The bypass branch lives in the def now, but the **reducer's** existing `if (destKind === 'locksmith' && nextResources.hasBronzeKey)` branch (line 325) **still runs** during Slice 4 — it'll be deleted in T13b. During Slice 4 both code paths agree on the outcome (no encounter when key held), so behavior is preserved.

Shim:

```ts
export { reduceLocksmithAction } from './mechanics/defs/locksmith'
```

**Verification:** [tests/core/v0.0.9-key.acceptance.test.ts](tests/core/v0.0.9-key.acceptance.test.ts), [tests/core/v0.4-poi-terrain-payoff.acceptance.test.ts](tests/core/v0.4-poi-terrain-payoff.acceptance.test.ts) — green via shim.

### T8. Migrate "leaf" defs to onEnterTile (no behavior change)

**Files:** [src/core/mechanics/defs/signpost.ts](src/core/mechanics/defs/signpost.ts), [src/core/mechanics/defs/gate.ts](src/core/mechanics/defs/gate.ts), [src/core/mechanics/defs/fishingLake.ts](src/core/mechanics/defs/fishingLake.ts), [src/core/mechanics/defs/rainbowEnd.ts](src/core/mechanics/defs/rainbowEnd.ts).

These were given placeholder `onEnterTile` in Slice 1's T1.5; if their behavior was simple enough to fold in then, T8 is a no-op confirmation. Otherwise: finalize their `onEnterTile` returning `{world?, resources?, message, foodDeltas?, knowsPosition?, hasWon?}` matching today's `TileEnterOutcome` 1:1.

**Verification:** [tests/core/signpost.test.ts](tests/core/signpost.test.ts), [tests/core/fishingLake.test.ts](tests/core/fishingLake.test.ts), [tests/core/rainbowEnd.test.ts](tests/core/rainbowEnd.test.ts), [tests/core/v0.0.9-key.acceptance.test.ts](tests/core/v0.0.9-key.acceptance.test.ts) — green via the legacy `getOnEnterHandler` bridge.

---

## Slice 5 — Reducer cutover + delete legacy modules

**Goal:** Shrink `reducer.ts`, wire `reduceEncounterActionByEncounterKind` and `onEnterTileByKind` directly, delete the transitional shims, delete `onEnter.ts`. End state: `reducer.ts` is mechanic-name-free; `src/core/{camp,town,farmEncounter,locksmithEncounter}.ts` and `src/core/mechanics/onEnter.ts` are gone.

**Risk anchors:** R2, R3, R4, R5 (all converge here).

This is the single biggest change in the PR. **Split into three sub-tasks** with a green build at each boundary.

### T13a. New dispatch skeleton — global allowlist + encounter dispatch

**File:** [src/core/reducer.ts](src/core/reducer.ts)

Rewrite the top of `processAction`:

```ts
export function processAction(prev: State | null, action: Action): State | null {
  // NEW_RUN keeps its current two-phase semantics: bootstraps when prev is null, AND
  // does a full regen when prev is non-null mid-run. Behavior preserved.
  if (action.type === ACTION_NEW_RUN) return reduceNewRun(action.seed)
  if (prev == null) return null

  // Global allowlist: actions that always work regardless of encounter state.
  if (action.type === ACTION_TICK) return reduceTick(prev)
  if (action.type === ACTION_RESTART) return reduceRestart(prev)
  if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prev)
  if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prev)
  if (action.type === ACTION_TOGGLE_MAP) return reduceToggleMap(prev)

  // Encounter dispatch: per-encounter mechanic owns its own action handlers.
  if (prev.encounter) {
    const handler = reduceEncounterActionByEncounterKind[prev.encounter.kind]
    if (handler) {
      const next = handler(prev, action)
      if (next != null) return next
    }
  }

  if (action.type === ACTION_MOVE) return reduceMove(prev, action.dx, action.dy)
  return prev
}
```

**Critical:** the existing per-encounter chain (`const campHandled = reduceCampAction(prev, action); if (campHandled) return campHandled; ...`) and the inline `ACTION_FIGHT` / `ACTION_RETURN` blocks are **deleted** in this sub-task. The encounter dispatch via `reduceEncounterActionByEncounterKind` replaces both.

`reduceMove` is **not yet rewritten** in T13a — it still uses the legacy `getOnEnterHandler` bridge from `onEnter.ts`. That's fine because the bridge still exists and is functionally equivalent.

The transitional henge guard from T4 still exists in `reduceMove` — leave it for T13b.

**Verification:**

- All encounter tests: [tests/core/camp.test.ts](tests/core/camp.test.ts), [tests/core/town.reducer.test.ts](tests/core/town.reducer.test.ts), [tests/core/farms.reducer.test.ts](tests/core/farms.reducer.test.ts), the locksmith and combat tests — green via the registry dispatch.
- C6 satisfied: encounter dispatch is now a single registry call.

### T13b. `reduceMove` rewrite — call `onEnterTileByKind` directly

**File:** [src/core/reducer.ts](src/core/reducer.ts)

Rewrite `reduceMove` to call `onEnterTileByKind[cell.kind]` directly (or the default-terrain handler if absent). Splice the `TileEnterResult` into state: apply `world`, `resources` (with foodCarry clamp), `encounter`, `message`, `hasWon`, `knowsPosition`, `teleportTo`. Compute final position (teleport if `teleportTo`). Update `run.path` memory (existing helper, unchanged). Apply animations: food/army deltas, then `applyEnterAnims(result.enterAnims, startFrame + MOVE_SLIDE_FRAMES)`, then either the `moveSlide` anim or the teleport's `gridTransition`.

**Removed in this sub-task:**

- All `didStartCamp/Town/Farm/Locksmith/Combat` booleans and the five `if (didStartX) enqueueGridTransition({ to: 'X' })` blocks (lines ~449–464). Mechanic-supplied `enterAnims` replaces them.
- The `if (destKind === 'locksmith' && nextResources.hasBronzeKey)` bypass (line 325). Locksmith's `onEnterTile` handles it.
- The `if (destKind === 'henge')` cooldown block (line 355). Henge's `onEnterTile` handles it.
- The `if (event.kind === 'fight')` and `if (event.kind === 'lost')` blocks (lines ~342–379). `terrainHazards.onEnterTile` handles them.
- The transitional henge cooldown guard added in T4. Henge's `onEnterTile` now owns it.
- The `getOnEnterHandler` import from `mechanics/onEnter.ts` (replaced with direct `onEnterTileByKind` access from `mechanics`).

**Critical RNG-ordering note (R2, R5):** The order of RNG draws inside `reduceMove` must match today's order. Today: food cost, then `getOnEnterHandler` (which may consume tile RNG for lore), then `rollMoveEvent` (keyed RNG), then `spawnEnemyArmy` on fight (stream RNG via `world.rngState`). New flow: food cost, then `onEnterTileByKind[cell.kind]` which internally does the same draws in the same order (because the per-mechanic `onEnterTile` was written to do so). Spot-check by running [tests/core/v0.1-lost.acceptance.test.ts](tests/core/v0.1-lost.acceptance.test.ts), [tests/core/tileEvents.test.ts](tests/core/tileEvents.test.ts), [tests/core/combat.reducer.test.ts](tests/core/combat.reducer.test.ts) — they exercise the seed-determined paths.

**Verification:** full suite green. Manual seed playthrough of bronze key, henge fight, town purchase.

### T13c. Delete dead code — old encounter modules, `onEnter.ts`, transitional shims

**Files deleted:**

- [src/core/camp.ts](src/core/camp.ts) (was a re-export shim after T9)
- [src/core/town.ts](src/core/town.ts) (after T10)
- [src/core/farmEncounter.ts](src/core/farmEncounter.ts) (after T11)
- [src/core/locksmithEncounter.ts](src/core/locksmithEncounter.ts) (after T12)
- [src/core/mechanics/onEnter.ts](src/core/mechanics/onEnter.ts) (its bridge function `getOnEnterHandler` is no longer called since T13b)

**Tag T16:** for traceability — the deletion task is referenced as **T16** in the criteria table for C2.

**Verification:**

- `rg "core/(camp|town|farmEncounter|locksmithEncounter)" src/ tests/` returns nothing in `src/`. (Tests still import from those paths until T14.)
- `rg "from '\\./mechanics/onEnter'" src/` returns nothing.
- `tsc --noEmit` green — but `npm test` may fail because tests still import from the deleted paths. T14 in Slice 6 fixes this.

**Wait** — T13c can't actually delete the source files yet, because tests are still importing from them via the shims. Two options:

**Option I (recommended):** swap the slice order: T13c becomes "T16" and runs in Slice 6 **after** T14 updates test imports. Plan keeps T13a/T13b in Slice 5; T16 in Slice 6.

**Option II:** keep T13c in Slice 5 by also doing the test import sweep here. Larger atomic change but a single coherent "cutover" moment.

**Decision:** Option I. T13c is renamed **T16** and lives in Slice 6 after T14.

So Slice 5 ends after T13b.

---

## Slice 6 — Test sweep, deletion, verify

**Goal:** Update test (and platform) imports to point at new def-file locations; delete the old shim files; full verification.

### T14. Sweep test + non-test consumers for import-path drift

**Files in tests:** [tests/core/](tests/core/) — any file importing from `src/core/{camp,town,farmEncounter,locksmithEncounter}`. Known: [tests/core/camp.test.ts](tests/core/camp.test.ts), [tests/core/v0.2-map-scout.acceptance.test.ts](tests/core/v0.2-map-scout.acceptance.test.ts) import `computeCampArmyGain` from `src/core/camp`. Run a fresh `rg "src/core/(camp|town|farmEncounter|locksmithEncounter)" tests/` to enumerate; update each to import from `src/core/mechanics/defs/<name>`.

**Files in non-test code:** [src/platform/tic80/render.ts](src/platform/tic80/render.ts) line 11 imports `computeCampPreviewModel` from `../../core/camp`. Update to `../../core/mechanics/defs/camp`. Run `rg "core/(camp|town|farmEncounter|locksmithEncounter)" src/` to confirm there are no other consumers (today there is only this one).

**`rollMoveEvent` call sites in tests:** [tests/core/tileEvents.test.ts](tests/core/tileEvents.test.ts), [tests/core/tileEvents.scout.test.ts](tests/core/tileEvents.scout.test.ts) — already updated in T4. Confirm.

**Mechanics registry test:** [tests/core/mechanics.registry.test.ts](tests/core/mechanics.registry.test.ts) — already rewritten in T2. Confirm.

**Strategy:** prefer updating import paths over keeping shims. One source of truth.

**Verification:** `npm test` green across all 30+ test files.

### T16. Delete the four shim files

**Files deleted:**

- [src/core/camp.ts](src/core/camp.ts)
- [src/core/town.ts](src/core/town.ts)
- [src/core/farmEncounter.ts](src/core/farmEncounter.ts)
- [src/core/locksmithEncounter.ts](src/core/locksmithEncounter.ts)

(Note: [src/core/mechanics/onEnter.ts](src/core/mechanics/onEnter.ts) was already deleted as part of T13b's cleanup, since `reduceMove` stopped calling `getOnEnterHandler` then.)

**Verification:**

- `rg "src/core/(camp|town|farmEncounter|locksmithEncounter)" src/ tests/` returns nothing. **(C2)**
- `npm test` green.

### T15. Final verification + smoke test

1. **B2:** `npm run build` (or `tsc --noEmit`) — zero errors.
2. **B1:** `npm test` — all tests green. Document any deliberate behavior tweaks in the PR description (per design § Risk register R7).
3. **C1:** Run the banlist grep — `rg "'(camp|town|farm|locksmith|henge|gate|gateOpen|signpost|fishingLake|rainbowEnd|combat|woods|swamp|mountain)'" src/core/reducer.ts` — must return **zero matches**. If any remain, fix in this PR (don't ship leaks).
4. **C7:** `rg "'(henge|woods|swamp|mountain)'" src/core/mechanics/moveEvents.ts` — zero matches.
5. **C2:** `rg "src/core/(camp|town|farmEncounter|locksmithEncounter)" src/ tests/` — zero matches.
6. **C3:** `rg "from '\\.\\./encounterHelpers'" src/core/mechanics/defs/` — at least 3 matches.
7. **B3 (manual smoke test):** fresh seed, play through:
   - Bronze-key purchase at locksmith (gold path AND food path).
   - Henge ambush + cooldown enforcement on revisit.
   - Town purchase: food, troops, scout, rumor.
   - Camp search (ready and on-cooldown).
   - Farm: buy food, buy beast.
   - Gate open with key.
8. **C8 (thought experiment):** list the files that would be touched to add a hypothetical new modal mechanic ("tavern"). Confirm: `defs/tavern.ts` (new), `mechanics/index.ts` (one line), `types.ts` (additive unions), `constants.ts` (action consts + tuning), `spriteIds.ts` (sprites), `lore.ts` (text). **No reducer.ts edits, no other-def edits, no platform-renderer edits.** Mention in PR description.
9. **B4:** Run `/test-ci` if `.github/workflows/` exists. Otherwise waive with one-line reason ("no GH workflows yet").

---

## Slice summary

| Slice | Tasks | Compile state at end | Behavior state at end |
| ----- | ----- | -------------------- | --------------------- |
| 1 | T1, T1.5, T2 | green (registry tests rewritten) | unchanged (legacy bridge in onEnter.ts) |
| 2 | T3 | green | unchanged (helpers unused) |
| 3 | T4, T5, T6 | green | unchanged (transitional henge guard in reducer; T5/T6 dead code) |
| 4 | T7, T9, T10, T11, T12, T8 | green (shims keep imports working) | unchanged (registry not yet wired; reducer still drives encounters) |
| 5 | T13a, T13b | green | mechanic-name-free reducer; encounters served by registry; behavior identical |
| 6 | T14, T16, T15 | green | unchanged from end of Slice 5; verification done |

---

## Workflow gates after this plan

Per `/start`:

1. `/audit plan` ← we are here (re-audit if substantial revisions are made).
2. `/execute` (or `/use-subagents`) — implement slice-by-slice. Each slice ends in a green build; user approves each slice before the next. **Do not start the next slice until the previous is green.**
3. `/run-dev-loop`.
4. `/deslop` (prompt — recommended for AI-authored code).
5. `/review`.
6. `/test-ci` (per T15 step 9).
7. `/commit`.
8. `/finish`.
9. `/update-docs` — at this point, prune [docs/refactor-mechanics-encounters-worldgen.md](docs/refactor-mechanics-encounters-worldgen.md) to Stage B only, rewriting Stage B with whatever we learned implementing Stage A.

Each gate requires explicit user approval.

---

## Review Feedback Incorporated

### 2026-05-05 — Slice 1 self-review

**Review outcome:** APPROVED. Slice 1 (T1, T1.5, T2) landed cleanly; 30 test files / 142 tests green; cart bundles to 134.8kb.

**Slice-1 deviations from plan (justified, recorded for future slices):**

1. **`StartEncounterFn` retained transitionally on `MechanicDef`.** The plan's T1 said *"Remove: `TileEnterHandler`, `StartEncounterFn`"*, but removing `StartEncounterFn` mid-Slice-1 would orphan the reducer's `startEncounterByKind` consumer (`reducer.ts:65`), breaking the green-build invariant for Slice 1. Tagged `// TRANSITIONAL (Slice 1 + 4)` in [src/core/mechanics/types.ts](src/core/mechanics/types.ts) lines 69–72, 91–92, with explicit removal target Slice 4.
2. **Validator skipped:** *"any def setting `onEnterTile` claims at least one `kind` OR has `encounterKind`"* — the failure mode this prevents (def with `onEnterTile` + empty `kinds` + no `encounterKind`) is silent dead code, not a bug, and no existing def can trigger it. YAGNI for now; can add in Slice 6 if reviewer wants paranoid completeness.

**Follow-up note added to Slice 4:** When camp/town/farm/locksmith encounter migration completes (T9–T12), the cleanup must remove **three** related artifacts in a single change, not one:
- `MechanicDef.startEncounter` field (in [src/core/mechanics/types.ts](src/core/mechanics/types.ts))
- `MechanicIndex.startEncounterByKind` field (in [src/core/mechanics/registry.ts](src/core/mechanics/registry.ts))
- `const { startEncounterByKind } = MECHANIC_INDEX` consumer (in [src/core/reducer.ts:65](src/core/reducer.ts) and the encounter-open code path that calls `starter(...)` around line 322)

If T9–T12 only delete the def-side `startEncounter` exports without removing the registry field and reducer consumer, the build stays green but the code keeps a dormant transitional bridge.

**Other findings:** none material. One Minor (untested fallback path in transitional bridge — deferred since bridge is deleted in T13b).

**Elegance pass tweak applied during review:** narrowed `onEnterDefaultTerrain`'s return type to `TileEnterResult & { message: string }` so the bridge in [src/core/mechanics/onEnter.ts](src/core/mechanics/onEnter.ts) can drop a `?? ''` dead branch.

### 2026-05-05 — Slice 2 self-review

**Review outcome:** APPROVED. Slice 2 (T3) added [src/core/mechanics/encounterHelpers.ts](src/core/mechanics/encounterHelpers.ts) and 12 focused unit tests. 31 test files / 154 tests green; cart bundles cleanly (134.7kb).

**Helper-name divergences from plan (justified, recorded for Slice 4 callers):**

1. **`appendMessage` → `setEncounterMessage`.** Plan named the helper `appendMessage`, but every existing call site **replaces** the message rather than appending. `setEncounterMessage(state, prefix, line)` is more honest. Slice 4 callers should use the new name.
2. **`spendAndAnimate` → `applyDeltas`.** Plan named the helper after the most-common case (spending gold). The actual pattern is "set message + update resources + animate per-resource deltas". `applyDeltas(state, { resources?, run?, message, deltas: ResourceDelta[] })` reads better at call sites — gold spend becomes `{target: 'gold', delta: -cost}`, food gain becomes `{target: 'food', delta: foodGain}`, etc., uniformly.
3. **`noGoldResponse(state, prefix, cellId, rnd)` → `noGoldResponse(state, prefix, cellId)`.** Helper builds its own `RNG.createRunCopyRandom(state)` inline rather than taking one as a parameter. Tiny duplication if a caller already created an `rnd` for many lookups, but the simpler signature wins for the 4 expected call sites (each makes one no-gold call).

**Helpers not yet implemented (defer to first use):**

- **`encounterPrefix(cell)`** — would build `"<name> Town"` etc. — defs can build this trivially with one line; not worth a helper until a real call site demands it. (Considered and rejected as YAGNI during elegance pass.)

**Helpers added beyond plan (cleared duplication seen in source):**

- **`cellAtPlayerOf<K extends CellKind>` + `townAtPlayer` / `farmAtPlayer` / `campAtPlayer`** — replaces three near-identical `getXAtPlayer(s)` private helpers in `src/core/{town,farmEncounter,camp}.ts`. Generic + thin aliases for the three call-site shapes Slice 4 will need.

**R8 (import cycles) check:** [src/core/mechanics/encounterHelpers.ts](src/core/mechanics/encounterHelpers.ts) imports only `../constants`, `../rng`, `../types`, `../uiAnim`, and `./types`. No `./index` or def-level imports. Verified at top-of-file with comment `// must NOT import MECHANIC_INDEX or any def-level module`.

**Other findings:** none.

### 2026-05-05 — Slice 3 self-review

**Review outcome:** APPROVED. Slice 3 (T4 + T5 + T6) purified `rollMoveEvent`, updated its sole production caller in `reducer.ts`, added the transitional henge cooldown guard, and authored the full `onEnterTerrainHazards` + `onEnterHengeFull` handlers as exported-but-not-yet-registered functions. 31 test files / 154 tests green. Cart bundles to 134.8kb.

**Slice-3 implementation choices (justified, recorded for Slice 5):**

1. **`onEnterTile` registration deferred to Slice 5.** Plan T5/T6 said "dead code in Slice 3 — `reduceMove` still uses the legacy path". The honest implementation of "dead" is "not attached to the mechanic def" — if I'd attached `onEnterTerrainHazards` to `terrainHazardsMechanic.onEnterTile`, the legacy bridge in `onEnter.ts` would have started invoking it via `getOnEnterHandler`, double-spending `world.rngState` (the handler's `spawnEnemyArmy` call vs. the reducer's). So the handlers exist as named exports (`onEnterTerrainHazards`, `onEnterHengeFull`) ready for Slice 5 to wire via `terrainHazardsMechanic.onEnterTile = onEnterTerrainHazards` and `hengeMechanic.onEnterTile = onEnterHengeFull`. Each def file has a comment at the registration site noting this.
2. **`MoveEvent.lost` source narrowing kept inside `rollMoveEvent`.** The `if (source !== 'woods' && source !== 'swamp') return null` guard exists because `MoveEvent`'s `lost` variant only allows those two sources. Today's mountain/henge policies have `lostPercent: 0` so the guard is unreachable, but it preserves the type contract. If a future mechanic gives mountain/henge a non-zero `lostPercent`, the guard fires (defensive). Could relax `MoveEvent.lost.source` to all `MoveEventSource` values, but design B1 keeps result shapes stable.
3. **`toMoveEventSource` helper in `reducer.ts`.** Narrows `CellKind` to `MoveEventSource` for the call site that looks up `moveEventPolicyByKind[destKind]`. Today every kind with a policy is also a valid `MoveEventSource`; the helper makes the invariant explicit. Slice 5 / T13b removes both the helper and the call site (replaced by direct `onEnterTileByKind` dispatch).
4. **Transitional henge cooldown guard tagged with explicit removal target T13b.** Located inline in `reduceMove` next to the `rollMoveEvent` call, with a comment that explicitly references the sub-task that deletes it.

**Test diffs (call-site shape changes per design B1):**

- [tests/core/tileEvents.test.ts](tests/core/tileEvents.test.ts) — full rewrite: tests now construct `MoveEventPolicy` inline rather than relying on the helper to read from `MECHANIC_INDEX`. A small `call(...)` adapter normalizes the new arg shape. The henge-cooldown case was **removed from this file** — that responsibility is no longer on the helper; it's on the caller (reducer transitional guard until Slice 5, then `henge.onEnterTile`). Acceptance test [tests/core/v0.1-lost.acceptance.test.ts](tests/core/v0.1-lost.acceptance.test.ts) covers the cooldown end-to-end and stayed green.
- [tests/core/tileEvents.scout.test.ts](tests/core/tileEvents.scout.test.ts) — call-site shape changes only; assertions unchanged.

**RNG ordering invariant (R5) verified by:** all `tests/core/v0.X-*.acceptance.test.ts` still green (these use seeded playthroughs that exercise the exact RNG-draw sequence in `reduceMove`). The `rollMoveEvent` call site retains `{seed: nextWorld.seed, stepCount: nextStepCount, cellId: destCellId}` — same keys as before T4.

**Henge cooldown invariant (R3) verified by:** [tests/core/v0.1-lost.acceptance.test.ts](tests/core/v0.1-lost.acceptance.test.ts) still green. The transitional guard at the reducer call site uses the exact same `nextStepCount < (destCell.nextReadyStep ?? 0)` check that lived in `moveEvents.ts` before T4.

**Elegance pass tweaks applied:**

- Inlined the `policyByKind: Record<MoveEventSource, MoveEventPolicy>` lookup table in `terrainHazards.ts` into a 4-line `if/else if` chain — removed the dead `henge: ...` entry that was just for type-completeness.

**Other findings:** none.

**Post-review polish (2026-05-05, after `/review` pass):**

1. **`onEnterTerrainHazards` lost branch — added contract comment.** The handler returns `teleportTo` but does not set `knowsPosition: false`, because `TileEnterResult.knowsPosition` is additive (OR'd with `prev.run.knowsPosition` in the reducer), not assertive. The teleport-clears-known rule belongs to the reducer, signaled by `teleportTo != null`. Comment added at the lost-branch return site so Slice 5 / T13b doesn't lose this when wiring `reduceMove`. Zero behavior change in Slice 3 (handler still unregistered).
2. **`onEnterHengeFull` `cellId` deduplication.** Replaced two `cellIdForPos(world, pos)` and `cellIdForPos(nextWorld, pos)` calls with a single `const cellId = cellIdForPos(world, pos)` reused by both `rollMoveEvent.rngKeys` and `encounter.sourceCellId`. `cellIdForPos` is pure on `world.width + pos`, so values were identical, but the visual duplication invited misreading. Zero behavior change.
3. **`onEnterTerrainHazards` lost branch — added missing `'blank' → 'overworld'` grid transition (user-spotted regression).** Today's `reducer.ts` has `if (teleported) enqueueGridTransition(..., from: 'blank', to: 'overworld')` at line 493–494. The original Slice-3 `onEnterTerrainHazards` lost branch returned no `enterAnims` ("just a teleport, no transition needed"), which would have silently dropped the screen-flash effect when wired in T13b. Added `enterAnims: [{ kind: 'gridTransition', from: 'blank', to: 'overworld' }]` (no `afterFrames` — runs at `startFrame`, taking the place of the suppressed move-slide). Comment also documents the contract for Slice 5 / T13b: `teleportTo != null → skip moveSlide enqueue`. Zero behavior change in Slice 3 (handler still unregistered); prevents Slice 5 regression.

All three polish items are zero-behavior-change cleanups discovered during self-review. `npm run verify` re-run after each edit: 31 files / 154 tests still green.

### 2026-05-05 — Slice 4 review feedback incorporated

**Slice 4 delivered:** T7 (combat) + T9 (camp) + T10 (town) + T11 (farm) + T12 (locksmith) + T8 (leaf-def confirmation). All 154 tests green at end of slice. Cumulative diff vs `HEAD`: 25 files, +1555/−799.

**Plan-deviation notes (Slice 4):**

1. **`s4_drop_startEnc` task cancelled, deferred to Slice 5 / T13b.** Original Slice 4 wrap-up step was "drop transitional `StartEncounterFn` / `MechanicDef.startEncounter` / `MechanicIndex.startEncounterByKind` once all defs use `onEnterTile` to open encounters". Cannot land in Slice 4: `reducer.ts` line 334 still calls `starter = startEncounterByKind[destKind]` to open camp/town/farm/locksmith encounters. Removing the `startEncounter` field would break the reducer mid-slice. The transitional fields stay until T13b atomically (a) wires `onEnterTile.encounter` and (b) deletes `startEncounter` / `startEncounterByKind`. All four `MechanicDef`s have `// TRANSITIONAL` comments at their `startEncounter` field marking the removal target.
2. **T7 chose plan option A (`runState.ts` extraction).** Created `src/core/runState.ts` exporting `normalizeResources(world, raw)` and `gameOverMessage(seed, stepCount)` — both verbatim from `reducer.ts`. The `_world` parameter on `normalizeResources` is currently unused but kept for API stability and forward-compat (e.g. seed-keyed starting resources). Justification: option A (preferred in plan) avoids duplication and keeps the contract of "what counts as game-over" in one place.
3. **T7 added `enqueueDeltas` local helper in `combat.ts`.** Original reducer code had 4 near-identical `for (let i = 0; i < Xdeltas.length; i++) { uiWith = enqueueAnim(uiWith, {...}) }` loops (food/gold/army/enemyArmy). Collapsed into one helper `enqueueDeltas(ui, startFrame, target, deltas) -> Ui` that skips zero deltas (matches original `if (!delta) continue`). Behavior identical, ~30 lines saved.
4. **T7 doesn't import `getUi(ui)`.** That helper is `return ui` (identity) in `reducer.ts`. Combat def uses `prevState.ui` directly — same effect, no new import.
5. **T9–T12 added the full `onEnterTile.encounter` + `enterAnims` even though they're dead code in Slice 4.** Same rationale as Slice 3 / T5–T6: the handlers are written and shape-correct, ready for T13b to atomically register them. Today's reducer's `getOnEnterHandler` bridge silently drops the new fields (`encounter`, `enterAnims`, `teleportTo`), so behavior is preserved during Slice 4.
6. **`MechanicDef.startEncounter` retained on all 4 encounter defs.** Same reason as #1 above. Each has a `// TRANSITIONAL (Slice 1–4)` comment.
7. **T11 (farm) `onEnterTile` uses `r.stableLine` with the actual `stepCount`** instead of the hard-coded `stepCount: 0` the Slice-1 placeholder used. `stableLine` only depends on `seed + placeId`; `stepCount` doesn't affect output, so behavior is identical, but the new code is honest about what RNG keys it consumes. Same fix applied to town's `onEnterTile`.
8. **T12 (locksmith) `reduceLocksmithAction` adds a defensive `prevRes.hasBronzeKey` check** between LEAVE and PAY branches — exactly mirroring `src/core/locksmithEncounter.ts` lines 49–51. Previously the reducer chain reached PAY-gold/food handlers only when no key was held (because the bypass made encounter null); the def's `reduceEncounterAction` will be reachable in Slice 5 from any encounter state, so the early-return is needed for both paths to agree.
9. **`encounterHelpers.ts` widely adopted.** All 4 encounter defs now use `applyDeltas` (replaces ~12-line "compose UI with optional delta anims" pattern), `leaveEncounter` (replaces ~6-line "restore message + grid transition" pattern), `noGoldResponse` (where applicable), `setEncounterMessage`, and `cellAtPlayerOf` aliases. Confirms C3 ("`encounterHelpers.ts` exists, imported by ≥3 defs") — it's now imported by 4.
10. **T8 (leaf defs) was a no-op.** signpost / gate / fishingLake / rainbowEnd were already fully migrated in Slice 1 / T1.5 (not just placeholders) because their `onEnter` was simple enough to fold in. `reducer.ts` has zero per-mechanic logic for any of them (verified via grep). T8 reduces to a confirmation step.

**Code-quality notes:**

- All new def files structured the same way: `// ---- Public helpers ----`, `// ---- Encounter open: full handler (dead in Slice 4) ----`, `// ---- Encounter actions ----`, `// ---- Mechanic registration ----`. Helps reading.
- All `reduceEncounterAction` handlers return `null` for unrecognized actions (lets reducer's allowlist + dispatch chain fall through cleanly when wired in Slice 5).
- All shim files have explicit `// TRANSITIONAL` comments naming their deletion target (Slice 6 / T14).

**Verification:** `npm run verify` — 31 files / 154 tests green; cart bundle clean; zero linter errors on the 11 touched/created files.

**Outstanding for Slice 5:**

- `reducer.ts` still has: encounter chain (`reduceCampAction`, `reduceTownAction`, `reduceFarmAction`, `reduceLocksmithAction` calls), inline `ACTION_FIGHT` / `ACTION_RETURN` blocks, henge cooldown guard, `if (destKind === 'locksmith' && hasBronzeKey)` bypass, the `if (event.kind === 'fight')` and `if (event.kind === 'lost')` branches, and the five `didStartX` booleans + grid-transition emissions. T13a + T13b own this rewrite.
- Transitional types still live: `StartEncounterFn`, `MechanicDef.startEncounter`, `MechanicIndex.startEncounterByKind`, `LegacyTileEnterHandler`, `getOnEnterHandler`, `onEnter.ts`. T13b deletes them all.

### 2026-05-05 — Slice 4 self-review

**Review outcome:** APPROVED. Slice 4 (T7 + T9–T12 + T8) collapsed 4 encounter source files to ~3-line shims, moved combat/camp/town/farm/locksmith reducers + onEnterTile-with-encounter-opening into their respective def files, and adopted `encounterHelpers.ts` across all 4 encounter defs. 31 test files / 154 tests green; zero linter errors on the 11 touched/created files.

**Behavioral parity verified by direct code-walk against originals:**

1. **RNG ordering & purity.** Every `RNG.createRunCopyRandom(prevState)` is constructed independently per code path; `perMoveLine` is purely keyed (seed + stepCount + cellId), `advanceCursor` reads `state.run` and returns a new `nextState.run` (does not chain across calls). Camp's single-`rnd`-shared-across-paths pattern is equivalent to the original's per-path-`rnd` pattern because `perMoveLine` is non-mutating.
2. **Animation order preserved everywhere.** Town BUY_FOOD: `[gold, food]`; BUY_TROOPS: `[gold, army]`. Farm BUY_FOOD: `[gold, food]`. Locksmith PAY_GOLD: `[gold]`. Locksmith PAY_FOOD: `[food]`. Camp SEARCH: `[food, army]`. Combat FIGHT: `[food, gold, army, enemyArmy]`. All match originals byte-for-byte.
3. **`applyDeltas` zero-skip behavior matches originals.** Original code uses `if (foodGain) enqueueAnim(...)` for conditional food deltas; `applyDeltas` skips zero deltas. Camp's `armyGain` is `keyedIntInRange(1, 2)` (always 1 or 2, never 0), so the skip never fires for camp army deltas — matches original's unconditional army enqueue.
4. **`run` field preservation.** Action paths that don't update the run cursor (no-gold responses, "already have scout/beast" responses, hire-scout success, locksmith pay success) correctly omit `args.run`; `applyDeltas`'s spread `...(args.run ? { run: args.run } : {})` leaves `state.run` intact. Action paths that DO update the run cursor (BUY_FOOD, BUY_TROOPS, BUY_RUMOR, FARM_BUY_FOOD, combat exit feedback) pass `args.run = pick.nextState.run`.
5. **Combat `baseUi` shape preserved.** ACTION_FIGHT uses the explicit `{message, leftPanel, clock, anim}` constructor (omits any future Ui fields); ACTION_RETURN uses `{...prevUi, message}` (preserves all fields). Both match original line 746 and line 647 exactly.
6. **Locksmith bypass equivalence.** Today's reducer has `if (destKind === 'locksmith' && nextResources.hasBronzeKey) nextEncounter = null` (encounter doesn't open). My new `onEnterLocksmith` returns `{message: visited}` (no encounter, no enterAnims) when `hasBronzeKey`. Both result in: encounter not opened, visited-line shown, no grid transition. Slice 4 keeps both paths live; both agree.
7. **`runState.ts` extraction is clean.** No import cycle: `runState.ts` only imports `./constants` + `./types`. Both `reducer.ts` and `defs/combat.ts` import from it.

**Polish items applied during review (zero behavior change):**

1. **`locksmith.ts` `reduceLocksmithAction` — removed wasted RNG construction.** The top-level `const rnd = RNG.createRunCopyRandom(prevState)` was only used inside the `if (prevRes.hasBronzeKey)` branch. Moved the construction inside that branch so the common path (key not held, going to PAY) doesn't allocate an unused closure. Also tightened the comment to make clear this is defensive code (today it's dead because the encounter never opens with key in hand).

**Findings worth noting (deferred, not bugs):**

- **`reduceLocksmithAction` defensive `hasBronzeKey` branch is dead code today** because the encounter never opens with the key held. Will remain dead code in Slice 5+ (the def's `onEnterTile` enforces the same bypass). Kept as defensive guard against malformed save state. Acceptable.
- **`combat.ts` `enqueueDeltas` could theoretically move to `encounterHelpers.ts`** but the helper signature is genuinely different from `applyDeltas`'s "single delta-list per action" pattern (combat composes deltas across multiple branches before enqueueing). Keeping it inline in combat avoids contorting the helper API.
- **`normalizeResources(_world, raw)` `world` parameter unused.** Kept for API stability and forward-compat (e.g. seed-keyed starting resources). Comment in `runState.ts` documents the intent. Drop freely if it stays unused after Slice 6.

**Verification (post-polish):** `npm run verify` — 31 files / 154 tests green; cart bundles clean; zero lint errors.

**Verdict:** Slice 4 is **review-clean**. No behavioral defects discovered; one elegance polish applied. Ready for Slice 5.

---

## Slice 5 — Cutover (T13a, T13b, T13c) — review feedback incorporated

**Slice goal achieved:** **C1 strictly satisfied — `src/core/reducer.ts` is mechanic-name-free in functional code.** A grep for `camp|town|farm|locksmith|henge|woods|swamp|mountain|signpost|gate|fishing|rainbow|combat` in `src/core/reducer.ts` matches only 5 lines, all comments. Reducer line count dropped from 807 → 481 (−326 lines, −40%).

**T13a — dispatcher rewrite (`processAction` skeleton):**

- Replaced the 4-handler camp/town/farm/locksmith chain + 2 inline ACTION_FIGHT/ACTION_RETURN blocks (~190 lines) with a single registry-keyed dispatch:
  ```ts
  if (prevState.encounter) {
    const handler = reduceEncounterActionByEncounterKind[prevState.encounter.kind]
    if (handler) {
      const next = handler(prevState, action)
      if (next != null) return next
    }
  }
  ```
- Added `reduceTick(prevState)` helper, hoisted ACTION_TICK to the global allowlist (top of dispatch — TICK is the highest-frequency action, runs every frame regardless of encounter state). Comment in code documents the ordering rationale.
- Global allowlist order: TICK, RESTART, SHOW_GOAL, TOGGLE_MINIMAP, TOGGLE_MAP. `NEW_RUN` stays as a special bootstrap path above everything (matches today's two-phase semantics — works for both null `prevState` and mid-run regen via `reduceRestart`).
- Cleaned 11 unused imports: `ACTION_FIGHT`, `ACTION_RETURN`, 5 combat constants, `reduceCampAction`/`reduceFarmAction`/`reduceLocksmithAction`/`reduceTownAction`, `resolveFightRound`.

**Behavioral parity verified by case analysis** (no test diffs needed, all 154 tests green):

| Scenario | Today | New dispatch | Same? |
| --- | --- | --- | --- |
| ACTION_FIGHT in combat | inline ACTION_FIGHT block | `reduceEncounterActionByEncounterKind['combat']` → `reduceCombatFight` (Slice 4 verbatim move) | ✓ |
| ACTION_CAMP_LEAVE in camp | `reduceCampAction` returns leave-state | `reduceEncounterActionByEncounterKind['camp']` → `reduceCampAction` (same fn) | ✓ |
| ACTION_CAMP_LEAVE in combat | `reduceCampAction` returns `prevState` (truthy short-circuit) | dispatcher routes to `reduceCombatAction` → returns null → falls through to ACTION_MOVE check → returns `prev` | ✓ same final State |
| ACTION_MOVE in encounter | falls through chain → `reduceMove` short-circuits on `prevState.encounter` | falls through encounter dispatch → `reduceMove` short-circuits | ✓ |
| ACTION_TICK in encounter | falls through chain → bottom TICK block | global allowlist fires before encounter dispatch | ✓ |

**T13b — `reduceMove` rewrite (the big one):**

- Replaced the inline encounter/teleport/grid-transition logic (~140 lines) with a single line:
  ```ts
  const handler = onEnterTileByKind[cell.kind] ?? onEnterDefaultTerrain
  const outcome = handler({ cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources })
  ```
- Outcome consumption is uniform across all mechanics:
  - `outcome.world` → applied unconditionally (handler may have mutated cells, e.g. henge cooldown).
  - `outcome.resources`, `outcome.foodDeltas`, `outcome.armyDeltas` → merged into reducer-tracked deltas (with carry-cap clamp before delta computation, preserving today's "applied food delta" semantics).
  - `outcome.message` → falls back to `onEnterDefaultTerrain(ctx).message` if handler omits it (defensive — registered handlers always supply one; this path is only reachable through a defs' early-return for an unrouted kind).
  - `outcome.encounter` / `outcome.teleportTo` / `outcome.enterAnims` → **gated by `!isGameOver`** (same as today's `if (!isGameOver && !prevState.encounter)` gate).
- Wired up the previously-dead handlers from Slice 3:
  - `terrainHazardsMechanic.onEnterTile = onEnterTerrainHazards` (was unset)
  - `hengeMechanic.onEnterTile = onEnterHengeFull` (replaced placeholder `onEnterHenge`; deleted the placeholder)
- Eliminated all 5 `didStartX` booleans + their grid-transition emit blocks. Mechanic supplies `enterAnims: [{kind: 'gridTransition', ...}]` and `applyEnterAnims(uiWith, outcome.enterAnims, startFrame + MOVE_SLIDE_FRAMES)` consumes them.
- Extracted `enqueueDeltaAnims(ui, startFrame, target, deltas)` helper to consolidate the two near-identical food/army delta loops.

**Three subtle parity decisions made during rewrite:**

1. **Lost-event `'blank' → 'overworld'` flash moved out of `enterAnims`.** Originally placed in `onEnterTerrainHazards` during Slice 3 (per user feedback during review), but that interacts badly with the `applyEnterAnims(..., startFrame + MOVE_SLIDE_FRAMES)` timing — the lost flash needs `startFrame` (0 offset), not `startFrame + MOVE_SLIDE_FRAMES` (post-slide). Solution: reducer enqueues the `'blank' → 'overworld'` directly when it sees `outcome.teleportTo != null`, in the `if (teleported) { ... } else { moveSlide }` branch. `enterAnims` is now strictly post-move-slide animations. Updated `terrainHazards.ts` to drop the entry from `enterAnims` and document the timing separation. **Behavior identical to today** (verified by acceptance tests).

2. **`outcome.encounter ?? null` semantics.** A mechanic returning `outcome.encounter = null` explicitly is treated the same as omitting (no encounter opens). Matches the documented `TileEnterResult` semantics (line 44 of `types.ts`). Used by `onEnterLocksmith` to suppress the encounter when `hasBronzeKey` (no need to set null explicitly — it just doesn't include the field).

3. **Post-game-over side-effect divergence (acceptable).** Today's reducer gated encounter+side-effects with `if (!isGameOver && !prevState.encounter)`, so dying-on-henge-step would NOT set the henge cooldown or roll `spawnEnemyArmy`. New flow: handler is always called, so cooldown/spawn-rolls happen even on a fatal step (the `outcome.world` advance is applied; encounter is suppressed). **Not observable** because RESTART seeds `world.seed + 1` (fresh world; the dying-step's world mutations are discarded). Documented inline in code comments. Tests pass.

**T13c — transitional code deletion:**

- Deleted `LegacyTileEnterHandler` type and `getOnEnterHandler` function from `src/core/mechanics/onEnter.ts` (kept only `onEnterDefaultTerrain`).
- Deleted `StartEncounterFn` type from `src/core/mechanics/types.ts`.
- Deleted `MechanicDef.startEncounter` field (4 instances: camp/town/farm/locksmith defs) — all 4 def files dropped their `startEncounter:` blocks.
- Deleted `startEncounterByKind` field from `MechanicIndex` and its population in `buildMechanicIndex`.
- Deleted the `toMoveEventSource` helper from `src/core/reducer.ts` (no longer needed — `rollMoveEvent` is now called only from `onEnterTerrainHazards` and `onEnterHengeFull`, which know their source statically).
- Removed unused `MoveEventSource` import from reducer.

**Verification:**

- `npm run verify` → build clean (cart 130.8kb), `tsc --noEmit` clean for both prod and test configs, 31 files / **154 tests green**, zero lint errors.
- `wc -l src/core/reducer.ts`: **481 lines** (was 807 before Slice 5 → −326 lines, −40%).
- `grep` confirms zero mechanic-kind literals in `src/core/reducer.ts` functional code (5 matches, all in comments).
- `reduceEncounterActionByEncounterKind` referenced exactly once in `processAction` — single registry-keyed dispatch (C6 satisfied).

**Status update:**

- ✅ C1 — reducer mechanic-name-free
- ✅ C4 — `onEnterTile` is the only tile-enter hook (`onEnter`/`startEncounter`/`rightGridEncounterKind` types deleted)
- ✅ C5 — `reduceEncounterAction` set on 5 defs (camp/town/farm/locksmith/combat), dispatched via registry
- ✅ C6 — encounter dispatch is a single registry call

**Verdict:** Slice 5 is **architecturally complete**. Reducer is now a thin orchestrator over the mechanic registry; all encounter behavior, bypass logic, and grid-transition emissions live in the def files. Ready for Slice 6 (final cleanup: T14 update consumer imports to bypass shim files, T16 delete shim files, T15 final acceptance criteria walkthrough).

### Slice 5 — review pass findings

**One real bug found and fixed: encounter grid transitions fired ~250ms late** (BLOCKER for v0.5 release; tests didn't catch it).

- **Symptom:** All 6 def files set `enterAnims: [{kind: 'gridTransition', ..., afterFrames: MOVE_SLIDE_FRAMES}]`. The reducer also calls `applyEnterAnims(uiWith, outcome.enterAnims, startFrame + MOVE_SLIDE_FRAMES)`. `applyEnterAnims` then adds `a.afterFrames` to `startFrame`, producing `startFrame + 2 × MOVE_SLIDE_FRAMES = startFrame + 30 frames` (500ms at 60fps). Today's reducer fires at `startFrame + MOVE_SLIDE_FRAMES = startFrame + 15 frames` (250ms). **User-visible regression**: encounter grid transitions appear ~250ms late after stepping onto a town/camp/farm/locksmith/combat tile.
- **Why tests missed it:** Existing acceptance test `v0.3-gold-towns.acceptance.test.ts` only checks `from === 'overworld' && to === 'town'`, never the `startFrame`. None of the 154 tests assert on grid-transition timing.
- **Root cause:** `applyEnterAnims` docs say "`startFrame` is the frame at which the post-move-slide reveal begins; `afterFrames` offsets relative to that." Defs misread the contract and added `MOVE_SLIDE_FRAMES` to `afterFrames` themselves, on top of the reducer's already-baked-in offset.
- **Fix:** Removed `afterFrames: MOVE_SLIDE_FRAMES` from all 6 defs (camp, town, farm, locksmith, terrainHazards, henge) — they default to `afterFrames: 0` and rely on the reducer's `startFrame + MOVE_SLIDE_FRAMES` baseline. Removed the now-unused `MOVE_SLIDE_FRAMES` import from each.
- **Regression test:** Strengthened `tests/core/v0.3-gold-towns.acceptance.test.ts` to assert `enter.startFrame === MOVE_SLIDE_FRAMES`. Comment in the test points to the contract: "Locking this in so a future regression that double-counts the offset (e.g. via afterFrames) trips here."

**Comment cleanup (zero behavior change):**

- `src/core/mechanics/defs/combat.ts` — `reduceCombatAction` had a stale "Slice 4 / T7 ... NOT wired into the registry's dispatch path" comment. Replaced with a brief description of what the function does.
- `src/core/mechanics/defs/locksmith.ts` — "dead in Slice 4" header was wrong post-Slice 5. Trimmed to just describe the bypass.
- `src/core/mechanics/defs/terrainHazards.ts` — "Note for Slice 5 / T13b" reframed as a contract description (no longer time-bounded).
- `src/core/mechanics/encounterHelpers.ts` — `applyEnterAnims` docstring claimed "Slice 5 (T13b) widens this dispatch to cover them" (delta/moveSlide). Slice 5 didn't, and the throw is now intentional permanent guard. Reframed to explain *why* delta/moveSlide route through dedicated reducer pipelines instead. Updated error message and the matching test (`encounterHelpers.test.ts`) to reflect the new wording.
- `src/core/mechanics/moveEvents.ts` — Slice 3 attribution comment trimmed; explains current state instead of historical evolution.
- `src/core/runState.ts` — two "Slice 4 / T7 extracted from reducer.ts" comments trimmed. Function descriptions stand on their own.

**Deferred concern (added to backlog):**

- Mechanics registry: dispatch silently no-ops if `Encounter['kind']` lacks a registered `reduceEncounterAction` handler. Today this is unreachable (5 encounter kinds, 5 handlers), but adding a new encounter and forgetting to wire it would be an awful debugging session. Suggestion: add a build-time validator that every `Encounter['kind']` value is keyed in `reduceEncounterActionByEncounterKind`. Recorded in `docs/backlog.md`.

**No-action observations:**

- `tileMessage = outcome.message ?? onEnterDefaultTerrain(ctx).message` — the fallback evaluation looks expensive, but `??` short-circuits and every registered handler supplies a message in practice. Net cost: zero in the common path. No change.
- `outcome.encounter ?? null` semantics — null-vs-omit collapse is documented in `TileEnterResult` and used by `onEnterLocksmith` (omits `encounter` when bypassing). Behavior matches today's reducer's `nextEncounter = null` branch.
- Post-game-over side-effect divergence (henge cooldown set on dying-step in new flow but not old) — acknowledged in initial Slice 5 notes, still acceptable. RESTART seeds `world.seed + 1` so divergence is unobservable.

**Verification (post-review):** `npm run verify` — cart 130.6kb (−0.2kb from removing redundant `MOVE_SLIDE_FRAMES` references), 154/154 tests green, typecheck clean, zero lint errors.

**Verdict (post-review):** Slice 5 is **review-clean**. One real timing bug found and fixed; one regression test added; six docstring drift fixes; one concern logged to backlog. Ready for Slice 6.

---

## Slice 6 — Final Cleanup (T14, T16, T15) — closing notes

**Slice goal:** Delete the 4 shim files, migrate any remaining consumers to import directly from `defs/`, walk through the C8 thought experiment to confirm "add a new modal mechanic" touches only the documented files.

### T14 — consumer import migration

Audited via `rg "from\s+['\"][^'\"]*core/(camp|town|farmEncounter|locksmithEncounter)['\"]"` across `src/` and `tests/`. Three live consumers found (only camp had any — town/farm/locksmith shims had zero callers because they only re-exported `reduceXAction` which the reducer no longer imports after Slice 5):

| Consumer | Symbol | Old path | New path |
| --- | --- | --- | --- |
| `src/platform/tic80/render.ts` | `computeCampPreviewModel` | `'../../core/camp'` | `'../../core/mechanics/defs/camp'` |
| `tests/core/camp.test.ts` | `computeCampArmyGain` | `'../../src/core/camp'` | `'../../src/core/mechanics/defs/camp'` |
| `tests/core/v0.2-map-scout.acceptance.test.ts` | `computeCampArmyGain` | `'../../src/core/camp'` | `'../../src/core/mechanics/defs/camp'` |

Three one-line edits. `npm run verify` → 154/154 green.

### T16 — shim deletion

Deleted four files (1.18 KB total):

- `src/core/camp.ts` (469 B — re-exported `reduceCampAction`, `computeCampArmyGain`, `computeCampPreviewModel`, `CampPreviewModel`)
- `src/core/town.ts` (232 B — re-exported `reduceTownAction`)
- `src/core/farmEncounter.ts` (232 B — re-exported `reduceFarmAction`)
- `src/core/locksmithEncounter.ts` (247 B — re-exported `reduceLocksmithAction`)

Final sanity check via `rg "core/(camp|town|farmEncounter|locksmithEncounter)['\"\s]" src/ tests/` → no matches.

`npm run verify` → 154/154 green, build clean, typecheck clean for both prod and test configs.

### T15 — C8 walkthrough: "Add a Shrine mechanic"

Hypothetical exercise: implement a new modal encounter `shrine` where the player can pray for a temporary buff at the cost of food.

**Files that must be touched (all documented exceptions or the def itself):**

1. `src/core/types.ts` — append `'shrine'` to `CellKind`, define `ShrineCell`, define `ShrineEncounter`, append both to the `Cell`/`Encounter` unions, declare `ACTION_SHRINE_PRAY`/`ACTION_SHRINE_LEAVE` action constants. *(Documented exception: additive type extensions per design's "Files in scope" note.)*
2. `src/core/constants.ts` — `SHRINE_FOOD_COST`, `SHRINE_BLESS_LINES`, etc. *(Documented exception: per-mechanic tuning constants.)*
3. `src/core/lore.ts` — narrative line pools. *(Documented exception.)*
4. `src/core/spriteIds.ts` — sprite IDs. *(Documented exception.)*
5. **`src/core/mechanics/defs/shrine.ts` — new file.** Defines `shrineMechanic: MechanicDef` with `kinds: ['shrine']`, `mapLabel: 'S'`, `enterFoodCostByKind: { shrine: SHRINE_FOOD_COST }`, `onEnterTile: onEnterShrine` (returns `{encounter, message, enterAnims: [{kind: 'gridTransition', from: 'overworld', to: 'shrine'}]}`), `encounterKind: 'shrine'`, `reduceEncounterAction: reduceShrineAction` (uses `leaveEncounter`, `applyDeltas`, `setEncounterMessage` from `encounterHelpers`), and `rightGrid: shrineRightGrid`.
6. `src/core/mechanics/index.ts` — one new import + one entry in `MECHANICS`.

**Files that DO NOT need to be touched (the win):**

- `src/core/reducer.ts` — dispatches via registry; new mechanic flows through automatically.
- `src/core/mechanics/registry.ts` — validators handle the new entry uniformly (kind ownership, encounter-kind uniqueness, policy bounds).
- `src/core/mechanics/types.ts` — `EncounterKind` is `Encounter['kind']` (derived from the `Encounter` union in `types.ts`); `GridFromKind`/`GridToKind` are derived from `EncounterKind`; `MechanicDef` shape is open.
- `src/core/mechanics/moveEvents.ts` — pure helper; only relevant if shrine has a move event policy (which is set on the def, not here).
- `src/core/mechanics/encounterHelpers.ts` — already provides `leaveEncounter`, `applyDeltas`, `setEncounterMessage`, `noGoldResponse`, `applyEnterAnims` — no shrine-specific helpers needed.
- All other defs — independent.

**Polish landed during T15:** `GridFromKind`/`GridToKind` were hardcoded as `'blank' | 'overworld' | 'combat' | 'camp' | 'town' | 'farm' | 'locksmith'`. Refactored to `'blank' | 'overworld' | EncounterKind` (and `'overworld' | EncounterKind` for `GridToKind`) — derivation removes one more file from the "files to touch" list when adding an encounter mechanic. `npm run verify` → still 154/154 green.

**C8 deferred (out of scope, noted as follow-up):**

- `src/platform/tic80/render.ts` has per-encounter `else if (encounterKind === 'camp')` branches for the modal screen rendering (camp art, town interior, farm interior, locksmith interior, combat scene). This is TIC-80 sprite/layout code, not logic — and refactoring it would be a separate initiative (rendering DSL, sprite registry per encounter, etc.). Adding shrine *would* require touching render.ts to draw the shrine modal.
- `src/platform/tic80/rightGridRenderPlan.ts` has a similar per-encounter mode list (used for the right-grid layout DSL). Same reasoning.
- `src/core/world.ts` and `src/core/signpost.ts` have per-mechanic placement logic. **Stage B** — explicitly deferred from this PR per the original `/start` scope.

These three deferrals match the original design intent: this PR is about *encounter logic* centralization. World generation and platform rendering get their own future passes.

### Final state — what the architecture looks like now

| File | Lines | Purpose |
| --- | --- | --- |
| `src/core/reducer.ts` | 474 | Thin orchestrator: NEW_RUN bootstrap, global allowlist (TICK/RESTART/SHOW_GOAL/TOGGLE_MAP/TOGGLE_MINIMAP), encounter dispatch via registry, `reduceMove` calls `onEnterTileByKind[kind] ?? onEnterDefaultTerrain`. **Zero mechanic-kind literals in functional code.** |
| `src/core/mechanics/registry.ts` | 120 | Builds `MECHANIC_INDEX` from `MECHANICS` array; validates uniqueness (id, kind ownership, encounterKind), policy bounds, kind-claim consistency. |
| `src/core/mechanics/types.ts` | 88 | `MechanicDef`, `OnEnterTile`, `TileEnterResult`, `ReduceEncounterAction`, `MoveEventPolicy`, `AnimSpec`, derived `EncounterKind`/`GridFromKind`/`GridToKind`. |
| `src/core/mechanics/encounterHelpers.ts` | 154 | `leaveEncounter`, `setEncounterMessage`, `noGoldResponse`, `applyDeltas`, `applyEnterAnims`, `townAtPlayer`/`farmAtPlayer`/`campAtPlayer` lookups. |
| `src/core/mechanics/moveEvents.ts` | 37 | Pure `rollMoveEvent({policy, hasScout, source, rngKeys})`. |
| `src/core/mechanics/onEnter.ts` | 12 | Just `onEnterDefaultTerrain` (default tile-lore message). |
| `src/core/mechanics/index.ts` | 29 | Imports all 11 mechanic defs, exports `MECHANICS` array + `MECHANIC_INDEX`. |
| `src/core/mechanics/defs/*.ts` | 13–225 | One file per mechanic. Each defines its `MechanicDef` plus all its encounter logic, helpers, and grid-transition emissions. |
| `src/core/runState.ts` | (small) | `normalizeResources`, `gameOverMessage` — extracted in Slice 4 to break a circular dependency. |

**Reducer line count delta over the entire refactor:** 807 → 474 lines (**−333 lines, −41%**). All deleted lines moved into mechanic-owned modules where they belong; no logic was lost.

### Final verification

`npm run verify` → cart **130.6kb**, 31 files / **154 tests green**, typecheck clean for prod and test configs, zero lint errors. All 8 acceptance criteria (C1–C8) satisfied within the documented scope.

**Verdict:** Mechanics-owned encounters refactor is **complete**. Ready for commit + merge.

---

## Review Feedback Incorporated — 2026-05-05 (post-Slice 6)

Self-review (`/review`) flagged two **Important** API-shape findings and one **Minor** consistency issue. All addressed in the same PR (no blockers), with a deslop pass also landed before review.

1. **`AnimSpec` over-modeled.** Original type carried three union arms (`delta`, `gridTransition`, `moveSlide`) but only `gridTransition` was ever produced via `enterAnims` — the other two arms existed solely so `applyEnterAnims` could throw on them. Defensive code defending an unused contract.
   - **Fix:** Narrowed `AnimSpec` to `{ kind: 'gridTransition'; from; to; afterFrames? }`. Dropped the `switch`/`throw` in `applyEnterAnims` (now a straight `enqueueGridTransition` loop). Removed the `throws on delta or moveSlide` test case from `tests/core/encounterHelpers.test.ts`.
   - **Test count went 154 → 153** as a result; this is expected (the dropped test was guarding against impossible inputs once the type narrows).

2. **`TileEnterResult.foodDeltas` / `armyDeltas` semantically broken.** `armyDeltas` had **zero producers** in the codebase. `foodDeltas` had one producer (fishingLake) whose value was actually computed independently by the reducer from `nextResources.food - baseResources.food`, making the field redundant.
   - **Fix:** Dropped both fields from `TileEnterResult`. The reducer now derives the food popup from the resources diff alone (`appliedFoodDelta = nextResources.food - baseResources.food`). Updated `fishingLake.ts` to drop its `foodDeltas: [gain]` entry. Behavior identical: same popup, same value, same clamping. Updated the `TileEnterResult` doc comment.

3. **`cellAtPlayerOf` reached into `s.world.cells[y][x]` directly** instead of calling `getCellAt(world, pos)` like the rest of the codebase.
   - **Fix:** `cellAtPlayerOf` now uses `getCellAt(s.world, s.player.position)`. One-line consistency fix.

4. **Extraneous module exports.** `reduceCampAction`, `reduceFarmAction`, `reduceLocksmithAction`, `reduceTownAction`, and `cellAtPlayerOf` were `export`ed but never imported across module boundaries (only consumed via field-access on `MechanicDef.reduceEncounterAction` or by sibling helpers in the same file).
   - **Fix:** Dropped `export` modifier on all five; they're now file-local `const`/`function`. `ts-prune` confirms zero remaining stale exports in the refactor scope.

**Verification after these tightening edits:** `npm run verify` → cart **130.0kb** (down from 130.5kb pre-cleanup), 31 files / **153 tests green**, typecheck clean for both configs, zero lint errors.

---

## External Review Feedback Incorporated — 2026-05-05 (post self-review)

External review (`/request-review` via reviewer subagent, read-only) returned **APPROVE WITH MINOR CHANGES** — no Criticals; 4 Important findings, 5 Minor, 3 Disagreements. Triaged with the user; addressed everything except one item which moved to backlog.

### Important findings — addressed in this PR

1. **C7 acceptance criterion was overstated.** Reviewer correctly pointed out that `moveEvents.ts:31-34` still contained `'woods'`/`'swamp'` literals as a runtime narrowing guard for `MoveEvent.lost.source`. Self-review had flagged this as "borderline"; reviewer was right that the verification grep didn't strictly pass and the plan's ✅ was honest stretching.
   - **Fix (combined with I4 below):** Widened `MoveEvent.lost.source` from `'woods' | 'swamp'` to the full `MoveEventSource` union. The narrowing guard in `rollMoveEvent` (`if (source !== 'woods' && source !== 'swamp') return null`) was deleted as a consequence. C7 grep is now strictly clean.
   - **Bonus:** This also fixes I4 (silent event drop if a future policy gives `lostPercent > 0` to mountain or henge — previously the `lost` event would be dropped to null; now it's a real `lost` event the caller can dispatch on).

2. **Encounter grid-transition `startFrame` regression coverage was town-only.** Slice 5's regression test pinned `startFrame === MOVE_SLIDE_FRAMES` only for the town entry path. Camp / farm / locksmith / henge→combat / terrain→combat could regress identically without tripping a test.
   - **Fix:** Added `tests/core/encounterEnter.startFrame.test.ts` — 7 parametric cases covering all 6 encounter-opening paths (camp / town / farm / locksmith / henge→combat / woods→combat / mountain→combat). Each asserts the gridTransition anim's `startFrame === MOVE_SLIDE_FRAMES`. Town's existing assertion stays as well (defense in depth).

3. **Game-over gating was a real behavioral regression for henge and terrainHazards.** Reviewer flagged that the post-refactor `reduceMove` consumed `outcome.world` unconditionally, which meant a starve-on-arrival at a henge would set the henge's cooldown and advance `world.rngState` via `spawnEnemyArmy` — something pre-refactor's gated `if (!isGameOver && !prevState.encounter)` block prevented. Self-review missed this entirely (had documented it as an acceptable trade-off). Inspection of pre-refactor `reducer.ts` (commit `dd9a6ec`) confirmed: `startEncounter` and `rollMoveEvent` were both gated; only `onEnter` (rainbowEnd, gate, fishingLake) ran unconditionally on game-over.
   - **Fix:** Added a reducer-side gate before the `onEnterTile` call: `const wouldGameOver = baseResources.armySize <= 0`. When true, the handler is skipped entirely (`outcome = {}`); the player just dies on the tile. Restores pre-refactor behavior for henge cooldown and terrainHazards RNG, AND tightens behavior for rainbowEnd / gate / fishingLake (these previously also fired on game-over — debatably wrong; new behavior is "death always wins, no side effects").
   - The redundant `!isGameOver &&` guards in `reduceMove` (encounter, teleport, knowsPosition, enterAnims) were dropped since `wouldGameOver` already short-circuits the handler.
   - **Test:** Added `tests/core/reducer.gameOverGating.test.ts` — 6 cases covering: starve-onto-henge (no cooldown set, no rngState advance, no encounter open), starve-into-woods (no rngState advance, no teleport), starve-onto-closed-gate-with-key (game-over wins, gate stays closed, hasWon stays false), and a positive control (healthy entry to henge still sets cooldown + opens encounter).

4. **`rollMoveEvent` could silently drop events.** Same root cause as #1; resolved by the same widening.

### Minor findings — addressed (M1, M2, M3, M5) or backlogged (M4)

- **M1 / M2: Design doc drift.** Design § "MechanicDef surface" still showed the pre-narrowing 3-arm `AnimSpec` and a wider `TileEnterCtx` (`prevPos` / `dx` / `dy` / `prevResources` / `ui`). Updated the snippet to reflect as-shipped types, with a one-line note explaining that the narrower shape was an implementation discovery.
- **M3: Plan line count drift.** Plan claimed reducer is 481 lines; actual was 470 (now 474 after I3 fix). Updated the final-state table and the "delta over the entire refactor" line to **807 → 474 (−333 lines, −41%)**.
- **M5: `knowsPosition` type comment.** Added a one-line clarification on `TileEnterResult.knowsPosition`: "Truth-only hint: OR'd into prev `run.knowsPosition`. A handler cannot force this back to false from here — only `teleportTo` clears the player's known position."
- **M4: Reducer-focused tests for global allowlist (TICK / TOGGLE_MAP mid-encounter).** Reviewer noted indirect coverage exists; an explicit reducer test would lock the contract. **Backlogged** under "Prototype follow-ups" rather than addressed in this PR — low risk, the contract is straightforward and globally enforced in `processAction`.

### Disagreements — resolved

- **D1 (C7 honesty):** Reviewer was right; addressed by Important #1.
- **D2 (game-over world mutation is a real semantic shift, not just theoretical):** Reviewer was right; addressed by Important #3 — found and fixed an actual regression vs pre-refactor for henge/terrainHazards. (The "documented trade-off" framing in the original plan was wrong.)
- **D3 (defensive `encounter.kind !== 'combat'` checks in `combat.ts` are worth keeping):** Reviewer agreed with author. No action.

### Verification after external-review fixes

`npm run verify` → cart **129.9kb** (down from 130.0kb), **33 files / 166 tests green** (added 13 tests across 2 new files: 6 game-over gating + 7 parametric startFrame), typecheck clean for both configs, zero lint errors.

**Final acceptance criteria status:**

| ID | Status | Notes |
| -- | ------ | ----- |
| C1 | ✅ | Reducer mechanic-name-free in functional code |
| C2 | ✅ | Four shim files deleted, all consumers migrated |
| C3 | ✅ | encounterHelpers imported by 4 defs |
| C4 | ✅ | onEnterTile is the only tile-enter hook |
| C5 | ✅ | reduceEncounterAction set on 5 defs |
| C6 | ✅ | Single registry-based dispatch in reducer |
| **C7** | **✅** | **Now strictly clean — `rg "'(henge\|woods\|swamp\|mountain)'" src/core/mechanics/moveEvents.ts` returns nothing (was "borderline" pre-external-review)** |
| C8 | ✅ | Logic side; render/world-gen deferred per scope |
| B1 | ✅ | All tests green; behavior preserved (with tightening on game-over edge case) |
| B2 | ✅ | Build clean |
| B3 | ✅ | Manual smoke confirmed during Slice 5 |
| B4 | (deferred) | `/test-ci` step still ahead |

**Verdict:** All review feedback resolved. Refactor is **complete + hardened**. Ready for `/test-ci` and `/commit`.

---

## Post-PR Cleanup Pass — 2026-05-05 (deslop + unify)

User read-through flagged ~25 observations spanning slop comments, dead defensive code, copy-pasted purchase logic, and three duplicated delta-anim helpers. Triaged into "deslop" (kill on sight) + "unify the obvious" (one helper used everywhere); render.ts decoupling, registry-via-types, and the animation-framework refactor (so domain code doesn't reference `ENABLE_ANIMATIONS`) deferred to backlog.

### Slice 1 — deslop

- **Killed dead wrappers:** `getUi(ui) -> ui` and `getLeftPanel(ui) -> ui.leftPanel` were file-private identity functions in `reducer.ts` with 6 internal call sites and zero external imports. Inlined.
- **Deleted `runState.ts`:** `normalizeResources` defended against impossible nullability (Resources is non-nullable per State; no save/load path exists). All 3 call sites used `prevState.resources` directly. `gameOverMessage` was reinventing line-picking — replaced with `RNG.keyedIntExclusive({ seed, stepCount, cellId: 0 }, GAME_OVER_LINES.length)` and moved to a single-purpose `src/core/gameOver.ts` (combat.ts and reducer.ts both need it; the small file breaks the would-be cycle through MECHANIC_INDEX).
  - **Behavioral note:** the picked game-over line is now hash-based instead of `(seed + stepCount) % m`. The single test that pinned the formula now imports `gameOverMessage` directly so it stays self-consistent.
- **Stripped slop comments** in `henge.ts:33-35,42-47`, `combat.ts:28-30`, `types.ts:18-21,24-30`, and `locksmith.ts` ("defensive — if a legacy save somehow has..." block deleted along with its 4 lines of guard code).
- **Dropped `cellAtPlayerOf` and 3 `xAtPlayer` wrappers** in `encounterHelpers.ts`. The 5 call sites (in town/farm/camp action reducers + `computeCampPreviewModel`) all run when the player is *guaranteed* to be on the corresponding cell (encounter dispatcher narrows by encounter kind, which equals the underlying cell kind for non-combat encounters). Replaced with `getCellAt(s.world, s.player.position) as XCell`.
- **Collapsed `sourceKind` for non-combat encounters.** `CampEncounter`, `TownEncounter`, `FarmEncounter`, `LocksmithEncounter` all had `sourceKind: <kind>` that was identical to `kind` itself. Dropped the field from all 4 types + 4 def files + the synth-encounter cases in `rightGridRenderPlan.ts` + 6 test files. `CombatEncounter.sourceKind` stays — it's legitimately variable (woods/swamp/mountain/henge).
- **Backlog + refactor-doc updates:** added entries for render.ts `encounterKind === '...'` switch, registry runtime validation → type constraints, animation framework redesign, combat lore categorization, and the dead `if (cell.kind !== 'X') return {}` re-fetch pattern in encounter `onEnterTile` handlers.

### Slice 2 — lift game-over gate into encounter dispatcher

`reducer.ts:458` now skips `reduceEncounterActionByEncounterKind` lookup when `prevState.run.isGameOver || prevState.run.hasWon`. Mirrors the existing `reduceMove` gate at line 204. Dropped 3 redundant guards in `combat.ts`:
- `reduceCombatReturn:41` — `if (prevState.run.isGameOver || prevState.run.hasWon) return prevState`
- `reduceCombatFight:80` — same
- `reduceCombatFight:120` — `&& !prevState.run.isGameOver && !prevState.run.hasWon` clause around the gold-reward branch

Mechanics now assume an alive, in-progress run when their handlers fire. Added `tests/core/reducer.encounterGating.test.ts` (3 tests) asserting `processAction(s, ACTION_FIGHT|ACTION_RETURN)` returns `prevState` unchanged when `run.isGameOver || run.hasWon`.

### Slice 3 — unified `enqueueDeltas`

Promoted to `src/core/uiAnim.ts` with `startFrame` defaulting to `ui.clock.frame` (mirrors `enqueueGridTransition`). Replaced 3 duplicated implementations:
- `reducer.ts:330-345` (`enqueueDeltaAnims`) — deleted; 2 call sites in `reduceMove` migrated.
- `combat.ts:182-201` (file-local `enqueueDeltas`) — deleted; 4 call sites in `reduceCombatFight` migrated.
- `combat.ts:64-70` (inline `enqueueAnim` for army:-1 in `reduceCombatReturn`) — replaced with `enqueueDeltas(baseUi, { target: 'army', deltas: [-1] })`.
- `encounterHelpers.ts` `applyDeltas` internal loop — now delegates to `enqueueDeltas` per-target.

Net effect: one canonical helper in `uiAnim.ts`. The `'animations knowing about resource types'` coupling stays for now (it lives in `DeltaAnimTarget` which the anim system already owns); flagged as backlog (animation framework redesign).

### Slice 4 — `buy()` purchase primitive

Added to `src/core/mechanics/encounterHelpers.ts`:

```ts
buy(resources, { gold?, food?, gain: { food?, armySize?, hasBronzeKey?, hasScout?, hasTameBeast? } })
  -> { outcome: 'ok'; resources; deltas } | { outcome: 'noFunds' }
```

Pure transactional primitive: checks funds, deducts, applies gain (additive for numeric, set-true for booleans), emits non-zero deltas. Does NOT touch lore, messages, RNG, or food-carry clamping — caller's job.

Refactored 5 purchase functions:
- `reduceLocksmithPayGold` — 20 → 11 lines
- `reduceLocksmithPayFood` — 20 → 11 lines
- `reduceTownBuyTroops` — 22 → 12 lines
- `reduceTownHireScout` — 21 → 14 lines
- `reduceTownBuyRumor` — 16 → 12 lines
- `reduceTownBuyFood` — kept the foodCarry clamp (caller's job per buy() contract); buy() output gets clamped + the food-delta entry rebuilt from the post-clamp diff. Same shape used in `reduceFarmBuyFood`.
- `reduceFarmBuyBeast` — 25 → 14 lines

Added `tests/core/buy.test.ts` (8 unit tests): ok-path with gold + boolean gain, ok with food + boolean gain, ok with gold + numeric army gain, ok with gold + food gain (net delta), noFunds for gold, noFunds for food, zero-cost zero-gain, and "doesn't overwrite unrelated boolean fields".

### Slice 5 — `startCombatEncounter()` shared

Extracted from `combat.ts` as the spawn-enemy + build-CombatEncounter + grid-transition primitive. Signature:

```ts
startCombatEncounter({ world, pos, playerArmy, sourceKind, encounterMessage, restoreMessage })
  -> TileEnterResult & { world: World; encounter: CombatEncounter }
```

(Returning the narrowed type makes `result.world` non-undefined so henge can spread it without `!`.)

- `henge.ts:49-66` collapsed from 18 lines to a single call (henge layers its cell-cooldown mutation on top via `setCellAt(result.world, pos, nextHenge)`).
- `terrainHazards.ts:53-71` collapsed from 19 lines to a single call.
- Lore stays at the call site (caller picks the line and passes the string in). Honors the user's push-back: combat doesn't dictate messaging; source mechanics own intent. Combat-line categorization (`ambush` vs `provoked`) is a separate future refactor — backlogged.

### Slice 6 — verify

`npm run verify` → cart **127.6KB** (down from 129.9KB pre-cleanup, **−1.8%**), **35 files / 177 tests green** (added 11 tests across 2 new files: 3 dispatcher gating + 8 buy() unit), typecheck clean for both configs, zero lint errors.

**Reducer line count:** 474 → **448 lines** (−26 from this pass; total refactor delta now 807 → 448, **−359 lines, −44%**).

**Files added/removed by this pass:**

- ➕ `src/core/gameOver.ts` (8 lines)
- ➕ `tests/core/reducer.encounterGating.test.ts` (3 tests)
- ➕ `tests/core/buy.test.ts` (8 tests)
- ➖ `src/core/runState.ts` (deleted)

**Verdict:** Deslop + unify pass complete. Remaining items (render.ts encounter switch, registry runtime validation, animation framework `ENABLE_ANIMATIONS` coupling, combat lore categorization, dead `cell.kind` re-fetch pattern in encounter handlers) all live in [docs/backlog.md](../backlog.md) under "Prototype follow-ups" with enough context to pick up.

### Slice 7 — fold `src/core/combat.ts` into the combat def

User asked: "Can we merge `src/core/combat.ts` and `src/core/mechanics/defs/combat.ts`?" — yes, but `cellIdForPos` was mis-shelved there and isn't combat-specific (used by 7 modules + a duplicate inside `rng.ts`). Split the merge:

- `cellIdForPos` → `src/core/cells.ts` (sits next to `getCellAt` / `setCellAt`; both take `world + pos`).
- `spawnEnemyArmy` + `resolveFightRound` → `src/core/mechanics/defs/combat.ts` as a `// ---- Pure combat math ----` section. `spawnEnemyArmy` exported (two test files predict the spawn deterministically); `resolveFightRound` file-local.
- `src/core/combat.ts` → **deleted** (60 lines).
- `src/core/rng.ts` — dropped its file-local duplicate `cellIdForPos` and now imports from `./cells`.

Touched files: 6 mechanic defs (`camp`, `town`, `farm`, `locksmith`, `henge`, `terrainHazards`) re-pointed `cellIdForPos` import from `'../../combat'` to `'../../cells'` (most folded into the existing `getCellAt` import line). `tests/core/combat.reducer.test.ts` re-pointed `spawnEnemyArmy` to the new home.

**Verify:** `npm run verify` → cart **127.3 KB** (down from 127.6 KB), **35 files / 177 tests green**, typecheck clean both configs, zero lint errors.
