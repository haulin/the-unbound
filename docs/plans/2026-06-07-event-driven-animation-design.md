# Event-driven animation — design

**Date:** 2026-06-07

## Context

**Prompt:** Refactor the animation/render pipeline so mechanics no longer enqueue platform animations directly. Sprite-flash on slot activation (v0.9) plus the planned left-panel illustration transitions and lore-line stagger are pushing the current ad-hoc enqueue scattering past its breaking point.

**Reasoning:** Today three concerns are tangled at every "thing happens" call site — state mutation, animation enqueue, and `ENABLE_ANIMATIONS` gating. `applyDeltas` / `applyDeltasAndClose` / `leaveEncounter` and direct `enqueueAnim` / `enqueueGridTransition` calls scatter across `combat.ts`, `encounterHelpers.ts`, `reducer.ts`, plus per-mechanic def files. Adding a new event-triggered animation primitive (slot-flash) under that shape would deepen the mess in every slot mechanic that wants it.

A second, related smell: animation queue + clock fields (`Anim`, `MoveSlideAnim`, `DeltaAnim`, `GridTransitionAnim`, `UiAnim`, `UiClock`) live in core types and on `State.ui`. Only TIC-80 actually consumes them — terminal `entry.ts` only drains them via `hasBlockingAnim` to avoid unblocking input mid-animation, and terminal `render.ts` ignores them entirely. The terminal "drain loop" exists *because* mechanics enqueue platform animations into core state; it's not a feature. With this refactor it stops being needed.

The fix has been on the backlog for a while (see [`docs/backlog.md`](../backlog.md) Tech follow-ups: "domain code shouldn't reference `ENABLE_ANIMATIONS`") and is consistent with the existing pillar in [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md): **Animation as progressive enhancement** — *"Renderer consumes models, not mechanics."*

This design lifts that pillar from aspiration to enforced shape: domain code emits **pure domain events**; the animation queue + clock + translator move out of core entirely and become **platform property**. Each platform decides what to do with events.

## Documentation reviewed

- [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md) — Animation as progressive enhancement; mechanics live in mechanic modules.
- [`docs/backlog.md`](../backlog.md) — Tech follow-ups (ENABLE_ANIMATIONS contagion); slot system v0.9 forcing function (sprite-flash on activation); food-delta UX item (resolved differently here — see *Trade-offs*).
- [`docs/plans/2026-06-05-button-badges-design.md`](./2026-06-05-button-badges-design.md) Phase 2 pointer — left-panel illustration transitions and lore stagger; deferred to Phase 6 of this design.
- [`docs/plans/2026-05-04-mechanic-modules-registry-design.md`](./2026-05-04-mechanic-modules-registry-design.md) — registry / hook surfaces; this design extends that ethos to the animation surface.
- [`src/core/uiAnim.ts`](../../src/core/uiAnim.ts), [`src/core/reducer.ts`](../../src/core/reducer.ts), [`src/core/mechanics/encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts), [`src/core/mechanics/defs/combat.ts`](../../src/core/mechanics/defs/combat.ts), [`src/platform/tic80/render.ts`](../../src/platform/tic80/render.ts), [`src/platform/tic80/rightGridRenderPlan.ts`](../../src/platform/tic80/rightGridRenderPlan.ts).

## Scope baseline

**In scope (Phases 1–4, single PR with smoke-test stops between phases):**

- Add `DomainEvent` taxonomy and `State.pendingEvents` transient field.
- Add `commit()` helper that diffs prev→next resources and auto-emits `resourceChanged` events; replaces the manual `deltas: [...]` arrays the current `applyDeltas` callers build.
- **Move animation queue + clock out of core.** `Anim`, `MoveSlideAnim`, `DeltaAnim`, `GridTransitionAnim`, `UiAnim`, `UiClock`, and the `ui.anim` / `ui.clock` fields move from `src/core/` to `src/platform/tic80/`. Core `Ui` shrinks to `{ message, leftPanel }` (the genuinely platform-agnostic UI facts — `leftPanel` is consumed by both TIC-80 and terminal renderers).
- Add the TIC-80 platform translator (`translatePendingEvents` in [`src/platform/tic80/anim.ts`](../../src/platform/tic80/anim.ts)) that consumes `state.pendingEvents` and produces TIC-80-shaped animation queue entries; lives entirely outside core, co-located with the queue/clock it writes to.
- The TIC-80 platform owns its own clock and animation state; advances them in its frame loop. Core no longer references either.
- The terminal platform ignores `pendingEvents` entirely. `hasBlockingAnim` and the drain loop in [`src/platform/terminal/entry.ts`](../../src/platform/terminal/entry.ts) delete — there's no animation queue to drain.
- Migrate every mechanic reducer (camp, town, farm, locksmith, signpost, henge, woods, swamp, mountain, fishingLake, rainbowEnd, gate, wyrm, combat, plus `reduceMove`) off the old enqueue paths.
- Retire `applyDeltas`, `applyDeltasAndClose`, `leaveEncounter`, `enqueueAnim`, `enqueueGridTransition`, `enqueueDeltas`, and the `enterAnims` field on `TileEnterResult`.
- Retire `src/core/uiAnim.ts` and `src/core/clock.ts`. Replacements live in TIC-80 platform.
- Remove every `ENABLE_ANIMATIONS` reference from `src/core/`. Flag survives only in TIC-80 platform code.

**Out of scope (Phase 5+ — documented for future work):**

- Slot-flash event kind + per-slot mechanic wiring (Phase 5; v0.9 forcing function but lands as a thin add-on after the foundation).
- Left-panel `messageChanged` / `illustrationChanged` events for lore stagger and illustration transitions (Phase 6; per [`2026-06-05-button-badges-design.md`](./2026-06-05-button-badges-design.md) Phase 2).
- "Displayed value lerps with the popup queue" — the renderer-only fix that would let the panel number tick along with the popups instead of snapping to the final state. Documented as a known limitation; not blocking this refactor.
- Reducer non-atomicity (event-driven state changes, "reducer waits for tag from anim module" patterns). Explicitly rejected — would force an async / coroutine architecture for marginal gain.
- Adapting the renderer to read `pendingEvents` directly instead of going through a queue. Out of scope; TIC-80 keeps its `ui.anim.active` queue as the renderer's input shape.

## Locked decisions

- **Domain events are platform-agnostic.** `DomainEvent` describes *what happened in the game world* (resource changed, encounter opened, slot activated). Never platform animation language.
- **Reducers stay atomic and synchronous.** Signature `(state, action) => State | null` is unchanged. State changes happen in one pass; events are a side output.
- **`State.pendingEvents` is transient and platform-readable.** Reducers append; `processAction` does **not** drain it. Each platform reads (and clears) it on the boundary it controls — TIC-80 in its frame loop after dispatch, terminal not at all (events are simply discarded next dispatch). Events do not survive past the next dispatch.
- **Animation queue, clock, and translator are TIC-80 platform concerns.** Core never imports from `src/platform/tic80/`. Core `Ui` carries `message` and `leftPanel` only; everything frame-timed lives platform-side.
- **The TIC-80 translator is the only animation-aware code.** It owns `MOVE_SLIDE_FRAMES`, `FOOD_DELTA_FRAMES`, `GRID_TRANSITION_STEP_FRAMES`, the policy for blocking vs non-blocking, and phase boundaries.
- **`ENABLE_ANIMATIONS=false` is a TIC-80 translator no-op.** Translator returns its UI state unchanged. No domain code branches on the flag.
- **Resource-delta events are auto-derived from prev→next.resources diff.** After any clamping (food carry cap). Mechanics never build manual delta arrays.
- **Renderer surface is unchanged in this refactor.** TIC-80 `render.ts` and `rightGridRenderPlan.ts` still read the animation queue (now a platform-owned `tic80Ui.anim.active` rather than `state.ui.anim.active`). Adapting the renderer to read events directly is explicitly deferred.
- **Terminal stays state-only.** `src/platform/terminal/render.ts` reads core `State` and renders the post-action snapshot. No frame loop, no drain, no animation awareness.

## Domain event taxonomy

```ts
export type DomainEvent =
  | { kind: 'runStarted' }
  | { kind: 'resourceChanged'; target: DeltaAnimTarget; delta: number }
  | { kind: 'positionChanged'; from: Vec2; to: Vec2; dx: number; dy: number }
  | { kind: 'teleported'; from: Vec2; to: Vec2 }
  | { kind: 'encounterOpened'; encounterKind: EncounterKind }
  | { kind: 'encounterClosed'; encounterKind: EncounterKind; outcome: 'leave' | 'victory' | 'flee' | 'paid' | 'recruit' | 'purchase' }
  | { kind: 'phaseBoundary' }
```

`DeltaAnimTarget` and `EncounterKind` already exist in [`src/core/types.ts`](../../src/core/types.ts).

`runStarted` is emitted exactly once per run, from `processAction(null, ACTION_NEW_RUN)`. TIC-80 maps it to the initial blank→overworld grid reveal so the run boots with the same transition as a `teleported` "lost" reveal; terminal ignores it.

`phaseBoundary` is a translator instruction, not a domain fact, but it lives in the same list because it's the only way to express "subsequent events serialize behind blocking events of the prior phase." Inserted by orchestration code (`applyChanges` between beats of a multi-beat `Change[]`). Mechanics don't normally insert it.

Future event kinds (Phase 5+):
- `slotActivated; slot: string` — per the v0.9 sprite-flash design.
- `messageChanged; from: string; to: string` — drives left-panel lore stagger.
- `illustrationChanged; from: number; to: number` — drives left-panel illustration transitions.

These ship behind their respective milestone; the translator picks them up when the event kind exists.

## Core ↔ platform boundary

The refactor's biggest structural change. Today's split:

```
src/core/
  types.ts        ← Anim, MoveSlideAnim, DeltaAnim, GridTransitionAnim, UiAnim, UiClock all live here
  uiAnim.ts       ← enqueue helpers
  clock.ts        ← clock advance helper
  reducer.ts      ← imports clock, uiAnim
src/platform/tic80/
  render.ts       ← reads state.ui.anim, state.ui.clock
src/platform/terminal/
  entry.ts        ← reads state.ui.anim via hasBlockingAnim drain
  render.ts       ← reads state.ui.message only (already correct!)
```

After this refactor:

```
src/core/
  types.ts        ← Ui = { message, leftPanel }; DomainEvent; State.pendingEvents
  reducer.ts      ← commit(), applyChanges(); append events; never see animation types
  (no uiAnim.ts, no clock.ts)
src/platform/tic80/
  anim.ts         ← Tic80UiState = { clock, anim }; UiClock; Anim, MoveSlideAnim,
                    DeltaAnim, GridTransitionAnim; hasBlockingAnim; tickTic80Ui;
                    translatePendingEvents(tic80Ui, events) → tic80Ui'
  uiConstants.ts  ← all TIC-80 rendering knobs incl. animation timing:
                    MOVE_SLIDE_FRAMES, FOOD_DELTA_FRAMES, GRID_TRANSITION_STEP_FRAMES,
                    ENABLE_ANIMATIONS (platform-local)
  render.ts       ← RenderContext = { state, ui, hints }; renderFrame(ctx)
  entry.ts        ← owns tic80Ui; calls translator after each dispatch; advances clock per frame
src/platform/terminal/
  entry.ts        ← dispatch then re-render; no drain loop, no clock awareness
  render.ts       ← unchanged
```

`Tic80UiState`, `UiClock`, the `Anim` family, and the translator all co-locate in [`src/platform/tic80/anim.ts`](../../src/platform/tic80/anim.ts) — they're tightly coupled (a clock tick decides which anim entries to drop; the translator is the only producer of queue entries) and small enough to fit in one file without losing clarity. Animation timing constants and the `ENABLE_ANIMATIONS` master switch live in [`src/platform/tic80/uiConstants.ts`](../../src/platform/tic80/uiConstants.ts) alongside the other TIC-80 rendering knobs; all platform-local.

The TIC-80 platform owns all frame-timed state in a single value (`Tic80UiState`) it passes through its loop. The terminal owns nothing animation-shaped. Core has no concept of frames.

`Tic80UiState` is initialized by TIC-80 entry (via `initialTic80Ui()`) alongside the core `State` and lives next to it through the run. When `dispatch` returns a new `state` with `pendingEvents`, TIC-80 entry calls `translatePendingEvents(tic80Ui, state.pendingEvents)` to produce the next `Tic80UiState`. The translator is a pure `(Tic80UiState, DomainEvent[]) => Tic80UiState`.

Core does not import from `src/platform/`. The TIC-80 platform imports `DomainEvent` and `State` from core. The terminal platform imports `State` only.

## `commit()` and `applyChanges()`

Live in [`src/core/reducer.ts`](../../src/core/reducer.ts) alongside `processAction`. `commit()` is the central state-transition primitive; `applyChanges()` is the multi-beat sequencer that mechanics use when one action splits into visually ordered phases.

```ts
export type Change = {
  world?: World
  resources?: Resources
  run?: Run
  encounter?: Encounter | null
  player?: Player
  message?: string
  leftPanel?: LeftPanel
  events?: readonly DomainEvent[]   // explicit events that aren't a pure resource diff
}

export function commit(state: State, change: Change): State
export function applyChanges(state: State, changes: readonly Change[]): State
```

`commit()` semantics:
1. Build the new state from `change` fields, falling back to `state` for omitted fields.
2. Diff `state.resources` → next `resources` (post-clamp; the caller is responsible for any food-carry-cap clamping). For each non-zero per-target delta, append a `resourceChanged` event.
3. Append `change.events` in order after auto-derived events.
4. Append the new events to `state.pendingEvents` (preserving prior events from the same action).

`applyChanges(state, [c1, c2, c3])` calls `commit` on each beat in order, inserting an implicit `phaseBoundary` event between beats. Used by `reduceMove` (cost → slide → arrival) and by `reduceCombatFight` / `reduceCombatPay` (round → close-with-loot).

`commit()` does **not** import from `src/platform/`, does **not** branch on `ENABLE_ANIMATIONS`, and does **not** know what an "anim" is. It is a pure state-and-event constructor.

Mechanic reducers return `Change | Change[]`. `applyDeltas`, `applyDeltasAndClose`, and `leaveEncounter` retire over Phases 2–4. Their replacements:

- `applyDeltas(state, { resources, message, deltas })` → `commit(state, { resources, message })` *(deltas auto-derived)*.
- `applyDeltasAndClose(state, { resources, message }, fromGrid)` → `commit(state, { resources, message, encounter: null, events: [{kind:'encounterClosed', encounterKind: fromGrid, outcome:'purchase'}] })`.
- `leaveEncounter(state, fromGrid)` → `commit(state, { encounter: null, message: state.encounter?.restoreMessage ?? state.ui.message, events: [{kind:'encounterClosed', encounterKind: fromGrid, outcome:'leave'}] })`.

## Phase boundaries

Phase boundaries serialize the events that follow them behind the blocking entries of the prior phase. They're inserted **implicitly** by `applyChanges(state, changes)` between consecutive beats — mechanics never push `phaseBoundary` into a single `Change`'s `events` list. The current beat splits:

| Where | Beats | Why |
|---|---|---|
| `reduceMove` | (1) cost diff → (2) slide + position event → (3) tile arrival (gain diff + `encounterOpened`) | Cost popup plays during the slide; the gain popup and any encounter transition play after the slide finishes. |
| `reduceCombatFight` victory path | (1) enemy delta + world (round result) → (2) close beat (loot + healer-mend + hook + `encounterClosed`) | Damage popup → close transition → loot popups play sequentially. |
| `reduceCombatPay` recruit path | (1) cost / troop diff → (2) close beat (scaled loot + `encounterClosed`) | Gold cost plays during the slide; scaled recruit loot plays against the close transition. |

Encounter open/close transitions don't need explicit boundaries on top of the beat split — `encounterOpened` and `encounterClosed` are themselves blocking events, so subsequent events in the same beat naturally serialize behind them.

## Translator policy

The translator lives in [`src/platform/tic80/anim.ts`](../../src/platform/tic80/anim.ts) alongside the platform's `Tic80UiState` — the translator is the only producer of queue entries, so co-locating with the queue itself keeps the producer/consumer in one place. The today's `enqueue*` helpers from `src/core/uiAnim.ts` move here as private internals. Single public export:

```ts
import type { DomainEvent } from '../../core/types'
import type { Tic80UiState } from './anim'

export function translatePendingEvents(
  ui: Tic80UiState,
  events: readonly DomainEvent[],
): Tic80UiState
```

`ENABLE_ANIMATIONS=false` → `return ui`.

Otherwise, walk events in order. Maintain two cursors:
- `phaseCursor: number` — frame at which the current phase started (initially `ui.clock.frame`).
- `phaseEnd: number` — max end-frame of blocking entries within the current phase.

Per event:

| Event kind | Anim entry | Blocking? | Schedule | Notes |
|---|---|---|---|---|
| `runStarted` | `gridTransition` blank→overworld | yes | `startFrame = phaseCursor`, dur `GRID_TRANSITION_STEP_FRAMES * 4` | Initial run-boot reveal; emitted once per run by `processAction(null, NEW_RUN)`. |
| `positionChanged` | `moveSlide` | yes | `startFrame = phaseCursor`, dur `MOVE_SLIDE_FRAMES` | dx/dy carried through. |
| `teleported` | `gridTransition` blank→overworld | yes | `startFrame = phaseCursor`, dur `GRID_TRANSITION_STEP_FRAMES * 4` | Suppresses moveSlide for that move. |
| `resourceChanged` | `delta` popup | no | `startFrame = phaseCursor` | Floats up at the same time the slide/transition starts. Default behavior covers "food cost during slide". |
| `encounterOpened` | `gridTransition` overworld→`encounterKind` | yes | `startFrame = phaseEnd` | After the slide if one is in this phase; immediate otherwise. Replaces today's `enterAnims` field. |
| `encounterClosed` | `gridTransition` `encounterKind`→overworld | yes | `startFrame = phaseEnd` | Plays after any pending pop-ups in the phase. |
| `phaseBoundary` | none | — | `phaseCursor = phaseEnd` | Subsequent events start after the prior phase's blocking entries finish. |

`phaseEnd` is updated to `max(phaseEnd, startFrame + dur)` whenever a blocking entry is appended.

This rule set is enough to produce the same observable behavior as today for every existing path, with one intentional change: **resource-delta popups within the same phase now share their `startFrame`** (today's reducer enqueues them at slightly different cursors depending on call site). This matches the user's "consume during slide / +food after slide" request from the brainstorm.

## Worked examples

### Move into a swamp (food cost only, no quiet find)

```
events emitted:
  positionChanged{ from, to, dx, dy }
  resourceChanged{ target: 'food', delta: -2 }   // auto-derived
  phaseBoundary
  // no tile-enter events: quiet swamp with no roll

translator output (ui.anim.active):
  moveSlide{ startFrame: T,  dur: 15, blocking }
  delta{ startFrame: T, dur: 36, target: food, delta: -2 }
```

### Move into a swamp with +5 quiet find

```
events emitted:
  positionChanged{ ... }
  resourceChanged{ food, -2 }                    // move cost, auto-derived
  phaseBoundary
  resourceChanged{ food, +5 }                    // quiet find, auto-derived

translator output:
  moveSlide{ startFrame: T,    dur: 15 }
  delta{    startFrame: T,    dur: 36, food, -2 }
  delta{    startFrame: T+15, dur: 36, food, +5 }
```

### Move into a camp

```
events emitted:
  positionChanged{ ... }
  resourceChanged{ food, -1 }
  phaseBoundary
  encounterOpened{ encounterKind: 'camp' }

translator output:
  moveSlide{ startFrame: T,    dur: 15 }
  delta{    startFrame: T,    dur: 36, food, -1 }
  gridTransition{ startFrame: T+15, from: 'overworld', to: 'camp' }
```

### Camp Search (in encounter, no move)

```
events emitted:
  resourceChanged{ food,  +2 }
  resourceChanged{ army,  +1 }

translator output:
  delta{ startFrame: T, dur: 36, food, +2 }
  delta{ startFrame: T, dur: 36, army, +1 }
```

### Combat Fight — player hits, enemy lives

```
events emitted:
  resourceChanged{ enemyArmy, -4 }

translator output:
  delta{ startFrame: T, dur: 36, enemyArmy, -4 }
```

### Combat Fight — player hits, enemy dies, victory loot

```
events emitted:
  resourceChanged{ enemyArmy, -4 }
  phaseBoundary
  encounterClosed{ encounterKind: 'combat', outcome: 'victory' }
  resourceChanged{ gold, +12 }

translator output:
  delta{ startFrame: T,    dur: 36, enemyArmy, -4 }
  gridTransition{ startFrame: T,    dur: 20, combat→overworld }   // starts immediately; popup floats over it
  delta{ startFrame: T+20, dur: 36, gold, +12 }
```

(Existing playback today serializes the gold popup against `gridTransition` similarly; nothing player-visible changes here.)

## Migration phases

Implementation in one PR with a smoke-test stop between each phase. Sized so each phase compiles, passes acceptance tests, and ships zero runtime regressions when smoke-tested.

**Phase 1 — Infrastructure + platform relocation (no mechanic migrations).**

*Core side:*
- Define `DomainEvent` in `src/core/types.ts`.
- Shrink core `Ui` to `{ message, illustration }`. Remove `ui.anim` and `ui.clock` from `State`.
- Add `State.pendingEvents: readonly DomainEvent[]`, initialized `[]`.
- Add `commit()` helper to `src/core/reducer.ts`.
- Delete `src/core/uiAnim.ts` and `src/core/clock.ts`. Their entries become *temporarily* unused — Phases 2–4 migrate the call sites that still go through `applyDeltas`/etc. (Those helpers are kept as thin shims that call `commit` plus return the right shape, so legacy callers compile in Phase 1 without behavior change. Shims retire phase-by-phase.)
- Remove all `ENABLE_ANIMATIONS` references from `src/core/`.

*TIC-80 side:*
- In [`src/platform/tic80/anim.ts`](../../src/platform/tic80/anim.ts), co-locate `Tic80UiState = { anim: UiAnim, clock: UiClock }`, the `Anim` family (`MoveSlideAnim`, `DeltaAnim`, `GridTransitionAnim`), `hasBlockingAnim`, `tickTic80Ui`, and the `translatePendingEvents` translator. Producer and consumer of the queue live in one file.
- Animation timing constants and `ENABLE_ANIMATIONS` live in [`src/platform/tic80/uiConstants.ts`](../../src/platform/tic80/uiConstants.ts) alongside the other TIC-80 rendering knobs (one constants file per platform).
- Bundle `(state, ui, hints)` into `RenderContext` (defined in [`src/platform/tic80/render.ts`](../../src/platform/tic80/render.ts)); orchestrator render functions accept it as a single argument, pure deep helpers stay on focused args.
- Update `src/platform/tic80/entry.ts` to own `tic80Ui` alongside `state`, advance the clock per frame, and call `translatePendingEvents(tic80Ui, state.pendingEvents)` after each dispatch.
- Update `src/platform/tic80/render.ts` and `rightGridRenderPlan.ts` to read `tic80Ui.anim` / `tic80Ui.clock` instead of `state.ui.anim` / `state.ui.clock`.

*Terminal side:*
- Delete `hasBlockingAnim` drain loop from `src/platform/terminal/entry.ts`.
- Confirm `src/platform/terminal/render.ts` is unchanged.

**Zero gameplay-behavioral change** — animation still plays the same way for every existing path because shimmed enqueue helpers still feed the queue. The architecture has moved but observable behavior hasn't.

**Phase 2 — PoI offer reducers.** Migrate camp, town, farm, locksmith, signpost. Each reducer's call to `applyDeltas` becomes `commit`. Manual `deltas: [...]` arrays delete; resource diff carries them. Food-cap-clamp explicit-delta dance disappears. **`applyDeltas` shim still exists for un-migrated callers.**

**Phase 3 — `reduceMove` + tile-enter.** `reduceMove` emits `positionChanged`, `resourceChanged(food, -cost)`, `phaseBoundary`, then runs the tile handler. Tile handlers stop returning `enterAnims`; they emit `encounterOpened` events through `commit`. Retire the `enterAnims` field on `TileEnterResult` and the `applyEnterAnims` helper.

**Phase 4 — Combat + shim retirement.** Migrate `reduceCombatFight` / `reduceCombatPay` / `reduceCombatReturn`. Manual `payDeltas` / `fightDeltas` arrays delete. `enqueueGridTransition` calls in combat delete. `applyDeltasAndClose` and `leaveEncounter` retire (their callers switch to `commit` with explicit `encounterClosed` events). The `applyDeltas` shim (last remaining) deletes. **Zero direct enqueue calls anywhere in `src/core/`.**

**Phase 5 (separate milestone) — slot-flash.** Add `slotActivated` event kind. Translator maps it to a sprite-flash anim on the slot strip (per [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md) *Slot composition* — 200–400ms pulse). v0.9 slot mechanics emit it from their effect-firing reducers. No edits to non-slot mechanic defs.

**Phase 6 (separate milestone) — left-panel animations.** Add `messageChanged` / `illustrationChanged` events. Translator maps them to lore-line stagger + illustration transitions per [`2026-06-05-button-badges-design.md`](./2026-06-05-button-badges-design.md) Phase 2.

## Trade-offs

1. **Animation timings normalize.** Today's reducers enqueue popups at slightly different `clock.frame` snapshots depending on call site. The translator's "all events in a phase share `phaseCursor`" rule normalizes this — same-phase popups now share a `startFrame`, which is the intended improvement. Visually nearly identical to today, occasionally one or two frames different. Acceptance tests are state-asserting and unaffected; the few tests that pin specific anim startFrames need a small adjustment pass (~6 fixtures, all in `tests/core/encounterEnter.startFrame.test.ts` and `tests/platform/tic80/gridTransition.test.ts`).

2. **Panel stat numbers still snap to final state at frame 0.** The popups float over the snapped value. Same limitation as today; the architecture won't fight a future "displayed-value lerp" renderer change.

3. **Translator is a new concentration.** ~150–250 lines of "this event maps to this anim with these defaults." A bug here breaks playback for every mechanic. Mitigated by a single small file with deterministic, table-driven inputs.

4. **The `enterAnims` field on `TileEnterResult` retires.** Tile-enter handler signatures get simpler; ~6 def files lose a few lines each. Existing tests that assert `enterAnims` shape (`tests/core/encounterEnter.startFrame.test.ts`) move to asserting `pendingEvents` shape (or move to TIC-80-side assertions on `tic80Ui.anim.active` — both are fine).

5. **Tests that touch animation state move from `tests/core/` to `tests/platform/tic80/`.** Tests for `commit()` and `pendingEvents` content stay in `tests/core/`. Tests for "after this dispatch the queue contains a moveSlide at startFrame X" move (logically and physically) to TIC-80 platform tests, since the queue is now platform property. Roughly: `gridTransition.test.ts` is already platform-side; `encounterEnter.startFrame.test.ts` splits into a core part (events emitted) and a TIC-80 part (translator output).

6. **TIC-80 entry gains a small amount of orchestration.** Today `entry.ts` advances `state.ui.clock` and reads from `state.ui.anim`. Tomorrow it owns a separate `tic80Ui` value, advances its clock, and calls the translator after dispatch. ~10 lines of net glue in `entry.ts`. Worth it for the cleaner core surface.

7. **Terminal entry gets simpler.** The `hasBlockingAnim` drain loop deletes outright. Terminal dispatches an action, re-renders, and waits for input. Net negative LoC on the terminal side.

## Behavior change policy

Default: no intentional gameplay changes. Allowed: the small playback-timing normalization noted in *Trade-offs* (1). Explicitly approved up front to avoid PR-time bikeshedding.

## Testing strategy

- **Existing acceptance tests carry the gameplay contract.** They check `state.resources`, `state.encounter`, etc. They pass unchanged through every phase. Acceptance tests do not consume `state.ui.anim` (it's gone) and don't need to.
- **`tests/core/encounterEnter.startFrame.test.ts`** splits in Phase 3:
  - Core part stays in `tests/core/` and asserts the emitted `pendingEvents` (positionChanged, food cost, phaseBoundary, encounterOpened in that order).
  - Translator-output part moves to `tests/platform/tic80/encounterEnter.startFrame.test.ts` and asserts the resulting `tic80Ui.anim.active` after running the translator. The contract ("grid transition fires at slide end") survives; the implementation it asserts on shifts.
- **One new test added in Phase 1:** [`tests/platform/tic80/eventTranslator.test.ts`](../../tests/platform/tic80/eventTranslator.test.ts) — table-driven, asserts each event kind produces the expected anim entries with the expected scheduling. Becomes the regression net for translator changes.
- **`tests/core/encounterHelpers.test.ts`** updates as `applyDeltas` retires; tests for `commit()` replace it (in Phase 1, alongside introduction of the helper).
- **Existing `tests/platform/tic80/gridTransition.test.ts`** is already TIC-80-side; updates in Phase 1 to read from `tic80Ui.anim` instead of `state.ui.anim`.

## ATDD decision

- **ATDD:** waive
- **Reason:** Internal architecture refactor with no user-visible behavior change beyond the noted timing normalization. Existing acceptance tests already define the gameplay contract.
- **GWT specs written:** no
- **Spec leakage reviewed:** yes
- **Behavioral impact acknowledged:** yes
