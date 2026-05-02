# Random Context Facade Plan

Goal: stop threading `seed` / `stepCount` / `cellId` / `cursor` through every call site just to pick a number or a line from a pool, while preserving:

- pure reducer surface (`processAction(prevState, action) -> nextState`)
- serializable `State`
- deterministic simulation and deterministic copy policies

This plan builds on `docs/plans/2026-05-02-rng-copy-policy-plan.md` (which introduced policy-shaped copy operations and moved line picking off `world.rngState`).

## Problem

Even with `copy.stable/perMove/cursorAdvance`, call sites still pass context scalars (`seed`, `stepCount`, `cursor`, ids). This is correct but noisy, and it encourages ad-hoc helpers.

## Approach

Introduce a **random context facade** that derives defaults from `State` (or from a `world+stepCount+pos` tuple) and manages cursor/stream advancement internally.

### New module: `src/core/rng.ts` (facade)

Exports:

- `createRunCopyRandom(state: State)` → an object that:
  - derives `seed` from `state.world.seed`
  - derives `stepCount` from `state.run.stepCount`
  - derives default `cellId` from player position
  - manages **run-scoped cursors** in `state.run.copyCursors` (a `Record<string, number>`)
  - provides:
    - `stableLine(...)` / `perMoveLine(...)` (no stream consumption)
    - `advanceCursor(tag, pool, { salt? })` (advances `Run.copyCursors[tag]`)

- `createTileRandom(args: { world: World; stepCount: number; pos: Vec2 })` → an object that:
  - derives default `cellId` from `world+pos`
  - provides `stableLine/perMoveLine` without needing callers to pass `seed/cellId` explicitly

- `createStreamRandom(rngState: number)` → an object that:
  - provides `intExclusive(maxExclusive)` and exposes the advanced `rngState`
  - used for simulation randomness (worldgen/combat/teleport/loot), where consuming the stream is desired

### Policies supported

- `stable`: place-anchored deterministic line pick (copy; does not consume stream)
- `perMove`: move-anchored deterministic line pick (copy; does not consume stream)
- `cursor`: run-scoped deterministic no-repeat pick (copy; advances a named cursor)
- `stream`: stream integer draw (simulation; advances `world.rngState`)

## State change

Change `Run.copyCursors` from a fixed-field object to:

- `copyCursors?: Record<string, number>`

This avoids adding a new typed field for every new cursor.

## Migration (all at once)

1. Add/extend `src/core/rng.ts`.
2. Update `src/core/types.ts` (`Run.copyCursors`) + new-run initialization in `src/core/reducer.ts`.
3. Replace direct scalar-threading call sites:
   - `src/core/town.ts`: buy feedback + rumors use `cursor` policy with string tags.
   - `src/core/reducer.ts`: combat exit uses `cursor` policy with string tags.
   - `src/core/tiles/*`: replace `pickDeterministicLine(...seed, id, stepCount)` with tile-random facade calls.
4. Keep `stable/perMove/cursorAdvance` as pure policy implementations; consumers should prefer the `create*Random` facades.
5. Update tests to assert cursor advancement via tags rather than fixed fields.

## Acceptance criteria

- No module outside `src/core/rng.ts` needs to pass `seed` or `stepCount` or `cellId` just to pick copy.
- No magic numeric salts in feature modules.
- All unit tests pass (`npm test`).

