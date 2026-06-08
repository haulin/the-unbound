# Event-driven animation — plan

**Date:** 2026-06-07
**Design:** [`2026-06-07-event-driven-animation-design.md`](./2026-06-07-event-driven-animation-design.md)

Phases 1–4 land in one PR. Stop and smoke-test between each phase. Phases 5–6 are documented in the design as future milestones; not in this plan.

## Phase 1 — Infrastructure + platform relocation

Goal: animation queue, clock, and translator move to TIC-80 platform; core gains `DomainEvent`, `pendingEvents`, and `commit()`; terminal sheds its drain loop. Runtime behavior unchanged because `applyDeltas` / `applyDeltasAndClose` / `leaveEncounter` survive as Phase-1 shims that emit events through `commit` so the same animations still play. (Shims retire in Phases 2–4.)

### 1a — Core: events and `commit`

- [`src/core/types.ts`](../../src/core/types.ts):
  - Add `DomainEvent` type per the design (including `runStarted` for the initial run-boot reveal).
  - Shrink `Ui` to `{ message: string; leftPanel: LeftPanel }`. Remove `anim` and `clock` fields from `Ui`.
  - Drop the now-unused `Anim`, `MoveSlideAnim`, `DeltaAnim`, `GridTransitionAnim`, `UiAnim`, `UiClock` exports — they move to TIC-80 (1c).
  - Keep `DeltaAnimTarget`, `GridFromKind`, `GridToKind` exports in core for now — `DeltaAnimTarget` is used by the `resourceChanged` event payload; `GridFromKind`/`GridToKind` are used by `encounterOpened` / `teleported` events too. The platform translator imports them from core.
  - Add `pendingEvents: readonly DomainEvent[]` to `State`. `processAction(null, ACTION_NEW_RUN)` initializes it with a single `{ kind: 'runStarted' }` event so TIC-80 paints the initial blank→overworld reveal.
- [`src/core/reducer.ts`](../../src/core/reducer.ts):
  - Export `commit(state, change)` from this module (no new file). Diff prev→next.resources for non-zero per-target deltas; emit `resourceChanged` events; append `change.events`; produce next state with `pendingEvents` accumulated.
  - Export `applyChanges(state, changes)` for multi-beat actions — calls `commit` on each beat, inserting an implicit `phaseBoundary` event between beats. Used by `reduceMove` (Phase 2.5) and combat reducers (Phase 4).
  - **Do not drain `pendingEvents` inside `processAction`.** Each platform reads it after dispatch. `processAction` returns the new state with `pendingEvents` populated; the next dispatch resets it to `[]` before running the reducer.
  - Delete the `ENABLE_ANIMATIONS` import + branches in `reduceMove`. Domain code is now flag-free.
- [`src/core/clock.ts`](../../src/core/clock.ts): delete — TIC-80 owns the clock now (1c).
- [`src/core/uiAnim.ts`](../../src/core/uiAnim.ts): delete — translator + enqueue helpers move to TIC-80 (1c).
- [`tests/core/commit.test.ts`](../../tests/core/commit.test.ts) (new): unit tests for `commit()` and `applyChanges()` — resource diff produces correct `resourceChanged` events, `events:` extra are appended after auto-derived, `encounter`/`message` flow through, `applyChanges` inserts `phaseBoundary` between beats.

### 1b — Legacy shims (so Phases 2–4 can migrate gradually)

- [`src/core/mechanics/encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts):
  - Reshape `applyDeltas(state, { resources, message, deltas })` to call `commit(state, { resources, message })`. The `deltas` arg is ignored (auto-derived). Existing call sites compile and behave identically.
  - Reshape `applyDeltasAndClose(state, { resources, message }, fromGrid)` to call `commit` with `encounter: null` and `events: [{ kind: 'encounterClosed', encounterKind: fromGrid, outcome: 'purchase' }]`.
  - Reshape `leaveEncounter(state, fromGrid)` similarly (`outcome: 'leave'`).
  - `applyEnterAnims` survives but its body changes to `commit({ events: [{ kind: 'encounterOpened', encounterKind }] })`. The `enterAnims` field on `TileEnterResult` survives this phase; Phase 3 retires it.

### 1c — TIC-80 platform: own the animation queue

- [`src/platform/tic80/anim.ts`](../../src/platform/tic80/anim.ts) (new): consolidates the platform animation system in one file — `Tic80UiState = { clock, anim }`, `UiClock`, the `Anim` family (`MoveSlideAnim`, `DeltaAnim`, `GridTransitionAnim`), `hasBlockingAnim`, the per-frame `tickTic80Ui` (drops expired entries + advances the clock), and `translatePendingEvents(ui, events)` which implements the design's policy table. Producer (translator) and consumer (queue/clock) co-locate because the translator is the only producer of queue entries. The per-frame anim entries that used to be built by `enqueueAnim` / `enqueueGridTransition` / `enqueueDeltas` are now constructed inline in the translator. All moved out of `src/core/`.
- [`src/platform/tic80/uiConstants.ts`](../../src/platform/tic80/uiConstants.ts): gains an "Animation timing" section — `MOVE_SLIDE_FRAMES`, `FOOD_DELTA_FRAMES`, `GRID_TRANSITION_STEP_FRAMES` — plus the platform-local `ENABLE_ANIMATIONS` master switch (the translator returns its UI state unchanged when false). Moved out of `src/core/constants.ts`; co-located with the existing TIC-80 rendering knobs so there's one constants file per platform.
- [`src/platform/tic80/entry.ts`](../../src/platform/tic80/entry.ts):
  - Hold `tic80Ui: Tic80UiState` next to `state` in the platform's main loop.
  - Per frame, advance `tic80Ui` via `tickTic80Ui`.
  - After every dispatch, set `tic80Ui = translatePendingEvents(tic80Ui, state.pendingEvents)`.
  - Construct `RenderContext = { state, ui, hints }` at the call to `renderFrame`.
- [`src/platform/tic80/render.ts`](../../src/platform/tic80/render.ts) and [`src/platform/tic80/rightGridRenderPlan.ts`](../../src/platform/tic80/rightGridRenderPlan.ts):
  - Orchestrator functions (`renderFrame`, `drawLeftPanel`, `drawRightPanel`, `buildRightGridRenderPlan`, `buildStaticPlan`, `buildMoveSlidePlan`, `viewForCell`, `cellBorderOps`) accept the single bundled `RenderContext` argument. Pure deep helpers (`drawDeltaOverlays`, `findGridTransitionAnim`, `findMoveSlideAnim`, `transitionModeForCell`) stay on focused args.
  - All references to `state.ui.anim` / `state.ui.clock` rewrite to `tic80Ui.anim` / `tic80Ui.clock`.
- [`tests/platform/tic80/eventTranslator.test.ts`](../../tests/platform/tic80/eventTranslator.test.ts) (new): table-driven cases covering each event kind from the policy table.

### 1d — Terminal platform: drop the drain

- [`src/platform/terminal/entry.ts`](../../src/platform/terminal/entry.ts): delete the `hasBlockingAnim` drain loop. There's no animation queue to drain. Each player input dispatches once and re-renders.
- [`src/platform/terminal/render.ts`](../../src/platform/terminal/render.ts): no changes (already state-only).
- Drop `hasBlockingAnim` import from terminal entirely.

**Smoke test:** all existing tests pass (TIC-80 + terminal).
- `npm run play` (TIC-80) plays a normal run with identical animation behavior — every animation still fires because `applyDeltas` shim emits events that `translatePendingEvents` turns into the same queue entries as today.
- Terminal: `npm run play` (and any agent playtest) — confirm dispatch + re-render works with no drain loop. There should be no observable difference at the terminal beyond a snappier loop.

## Phase 2 — PoI offer reducers

Goal: camp/town/farm/locksmith/signpost go through `commit` directly. `applyDeltas` shim shrinks to combat + move callers.

- [`src/core/mechanics/defs/camp.ts`](../../src/core/mechanics/defs/camp.ts): `reduceCampSearch` and `reduceCampHireScout` switch to `commit`. Manual `deltas: [...]` arrays delete.
- [`src/core/mechanics/defs/town.ts`](../../src/core/mechanics/defs/town.ts): all `reduceTown*` reducers switch to `commit`. Manual `deltas` arrays delete; food-cap-clamp explicit-delta lines delete (auto-derive handles it).
- [`src/core/mechanics/defs/farm.ts`](../../src/core/mechanics/defs/farm.ts): `reduceFarmBuyFood` (food-cap-clamp), `reduceFarmBuyBeast` switch to `commit`.
- [`src/core/mechanics/defs/locksmith.ts`](../../src/core/mechanics/defs/locksmith.ts): both pay reducers switch to `commit`. `applyDeltasAndClose` calls become `commit` with explicit `encounterClosed{outcome:'purchase'}` event.
- [`src/core/mechanics/encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts): `hireCompanion` switches to `commit`. `applyDeltas` shim still kept for un-migrated combat/move callers.

**Smoke test:** `npm run play`; visit camp, farm, town, locksmith. Buy/hire each offer; confirm popups still fire and food-cap-clamp still produces the truthful applied delta. **Watch for:** popups within a single offer-press now share a `startFrame` (e.g. food and gold popups land on the same frame instead of staggered by a frame or two). This is the intended timing normalization; visually it should look tighter and more deliberate.

## Phase 3 — Move + tile-enter (absorbed into Phase 2.5)

The substance of Phase 3 landed early as part of Phase 2.5's three-beat
`reduceMove` migration. Recording done state here for the audit trail:

- ✅ `enterAnims?: readonly AnimSpec[]` removed from `TileEnterResult`; `AnimSpec` type and its re-exports gone.
- ✅ `reduceMove` emits the cost → slide → arrival beats via `applyChanges`. Each beat's events flow through `commit()`; the dispatcher inserts `phaseBoundary` between beats. The teleport branch emits `teleported` in place of `positionChanged`.
- ✅ `openNamedPoiEncounter` returns a `TileEnterResult` whose `encounter` field is the signal; `reduceMove` derives `encounterOpened` from `outcome.encounter` for both PoI tiles and combat ambush. `applyEnterAnims` deleted.
- ✅ `startCombatEncounter` returns `TileEnterResult & { encounter }`; `reduceMove`'s third beat emits the `encounterOpened` event uniformly.
- ✅ Tests covering the move event ordering live in `tests/core/v0.3-gold-towns.acceptance.test.ts` and friends. The pre-refactor `tests/core/encounterEnter.startFrame.test.ts` no longer exists; pin-frame coverage from the Phase 1c plan's new `tests/platform/tic80/eventTranslator.test.ts` is the survivor.

No additional smoke required — Phase 2.5's smoke covered move + tile-enter behavior.

## Phase 4 — Combat + retire legacy shims

Goal: combat reducers go through `commit`. `applyDeltas` / `applyDeltasAndClose` / `leaveEncounter`-as-State shims delete entirely.

- ✅ [`src/core/mechanics/defs/combat.ts`](../../src/core/mechanics/defs/combat.ts): `reduceCombatFight`, `reduceCombatPay`, `reduceCombatReturn` return `Change | Change[]`. Manual `payDeltas` / `fightDeltas` arrays gone. Each close path uses `buildCombatCloseBeat` — folds healer-mend, the `onCombatClosed` hook, and `encounterClosed{outcome:<victory|flee|paid|recruit>}` into one beat. Multi-beat outcomes (fight victory, recruit) split round/cost from close so `applyChanges` inserts the implicit `phaseBoundary` between them.
- ✅ [`src/core/mechanics/encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts): `applyDeltas` and `applyDeltasAndClose` deleted. `ResourceDelta`, `resourceDeltasFromDiff`, `pushResourceDeltas` deleted. `BuyResult` lost its `deltas` field — callers feed `result.resources` to `commit()` and the resource diff drives the events. `leaveEncounter` survives as a `Change`-returning helper (already migrated in Phase 2).
- ✅ [`src/core/mechanics/types.ts`](../../src/core/mechanics/types.ts): `EncounterReducerResult` narrows from `Change | Change[] | State | null` to `Change | Change[] | null`. The legacy `State` branch is gone.
- ✅ [`src/core/reducer.ts`](../../src/core/reducer.ts): `applyEncounterResult` shrinks accordingly — no more `pendingEvents` discriminator, just Change vs Change[].
- ✅ Audit: `rg "applyDeltas|applyDeltasAndClose|enterAnims|AnimSpec|enqueueAnim|enqueueGridTransition|enqueueDeltas|ResourceDelta|resourceDeltasFromDiff|pushResourceDeltas" src/core` → zero results.
- ✅ Audit: `rg "ENABLE_ANIMATIONS" src/core` → only a passing reference inside a `commit()` doc-comment ("`commit()` knows nothing about platforms, animations, or `ENABLE_ANIMATIONS`"). No code references.
- ✅ Audit: `rg "from.*platform/tic80" src/core` → zero results.

**Smoke test:** `npm run play` (TIC-80) — full combat: fight, flee, pay/recruit, victory with loot. Confirm all popups + grid transitions visually intact. **Watch for:** combat-fight round popups (enemy delta, army loss) now share a `startFrame` per round; combat-victory loot popups serialize cleanly behind the close transition. Then run terminal `npm run play` — combat should run as today, just without a drain loop (each input dispatches and re-renders).

## Final cleanup (in the same PR after Phase 4)

- [`docs/backlog.md`](../backlog.md): close the "Animation framework: domain code shouldn't reference `ENABLE_ANIMATIONS`" tech follow-up. Move the food-delta UX item to "resolved differently — sequenced by phase boundary, not collapsed."
- [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md): under *Animation as progressive enhancement*, append a one-liner pointing at the design doc and noting the `DomainEvent` / translator shape as the canonical pattern.
- Run full test suite. Confirm acceptance tests + determinism golden snapshot are unchanged.

## Risk register

- **Translator timing drift.** A bug in the policy table breaks playback for every mechanic at once. *Mitigation:* Phase 1 lands the table-driven test before any caller emits events; smoke-test passes between each phase.
- **TIC-80 entry now juggles two values.** `state` and `tic80Ui` advance separately. A bug here (e.g. translator called against wrong frame) shows up as off-by-one anim startFrames. *Mitigation:* the translator is a pure function; the new `tests/platform/tic80/eventTranslator.test.ts` pins the contract; integration smoke `npm run play` (TIC-80) covers the wiring.
- **`enterAnims` retire-day surprises.** A tile-enter path we forgot still passes `enterAnims`. *Mitigation:* type system catches it (the field stops existing on `TileEnterResult`); `tsc` is gating.
- **Render argument shape changes.** `render.ts` and `rightGridRenderPlan.ts` switch from `(state, ui, hints)` to a bundled `RenderContext` argument on orchestrator functions; every test or harness that calls them needs the new signature. *Mitigation:* `tsc` catches missing args; a compile pass after Phase 1c will surface every site.
- **Acceptance test pin-frame fixtures.** A few tests pin specific `startFrame` values that drift slightly under the new policy. *Mitigation:* Phase 3 explicitly splits `tests/core/encounterEnter.startFrame.test.ts`. If others surface, small fix-as-you-find.
- **Terminal regression from drain removal.** Removing `hasBlockingAnim` could affect agent playtest pacing if the harness depended on it. *Mitigation:* Phase 1 smoke includes a terminal play through several encounters before declaring the phase green. The terminal harness in fact dispatches actions one-at-a-time and re-renders, so removing the drain is strictly simpler.
- **Determinism golden.** This refactor doesn't touch RNG draws; the world.determinism golden should be unchanged. *Mitigation:* re-run after Phase 4; if it drifted, an unintended RNG call snuck in.
