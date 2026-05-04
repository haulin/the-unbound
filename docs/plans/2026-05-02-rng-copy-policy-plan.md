# RNG + Copy Policy Deepening Plan

This plan deepens the randomness surface so new features stop adding one-off RNG helpers, and so copy/flavor text can be **non-repeating** without making the simulation nondeterministic.

Related architecture direction: `docs/refactor-mechanics-encounters-worldgen.md` (“mechanic modules + central registry”). This plan is designed to **not** create a “god module” that knows about every `CellKind`. Instead, it creates a deep module whose **interface is policy-shaped** (stable vs per-move vs cursor-advanced), while mechanic modules (e.g. `town.ts`) own where cursors live and which policy they apply.

## Problem

- The repo already has two randomness mechanisms in `src/core/rng.ts`:
  - **Stream RNG**: `randInt(rngState, maxExclusive) -> { rngState, value }` (advances `world.rngState`).
  - **Keyed picks**: `pickIntExclusive/pickFromPool` keyed by `{ seed, stepCount, cellId, salt? }` (does not advance `world.rngState`).
- **Policy is currently implicit** and distributed across call sites. Agents frequently add new RNG helpers because the “right” choice is not encoded at a single seam.
- Copy selection needs both:
  - deterministic “random-looking” picks that **do not** consume `world.rngState`
  - deterministic **no-repeat** sequences for action feedback copy

## Goals

- **One deep seam for copy selection**: callers select copy via **policy-shaped operations**, not by “keyed vs stream” or by bespoke helper functions.
- **Variety without nondeterminism**: provide a deterministic **no-repeat per run** policy for “one-time actions” / feedback copy, so text doesn’t repeat across towns.
- **Simulation determinism preserved**: worldgen/combat/resource outcomes remain deterministic and testable.
- **OCP-friendly**: this should fit the “mechanic module” direction; the copy module should not need to import or know about every tile/mechanic.

## Non-goals

- Introducing “ephemeral” nondeterminism (`Math.random`) in core.
- Moving all RNG call sites at once (combat/worldgen can remain stream-threaded as-is initially).
- Storing pre-generated strings on every cell.

## Proposed architecture

### 1) New deep module: `src/core/rng.ts` (copy policies)

Provide a small, policy-shaped interface for selecting lines.

#### Concepts (vocabulary)

- **Module**: `rng` (deep; hides selection policy and deterministic shuffles)
- **Interface**: policy-shaped operations: `stable`, `perMove`, `cursorAdvance`
- **Implementation**: uses existing keyed PRNG (`pickIntExclusive`) under the hood

#### Interface (no mechanics knowledge required)

- **`stable`** (for place descriptions; exported from `src/core/rng.ts`):
  - Deterministic line selection derived from `(seed, placeId[, salt])`.
  - No state stored; repeated visits show the same line.
- **`perMove`** (for “random-looking but replay-stable per move”; exported from `src/core/rng.ts`):
  - Deterministic line selection derived from `(seed, stepCount, cellId[, salt])`.
  - No state stored; changes as `stepCount` changes.
- **`cursorAdvance`** (for action feedback that should not repeat; exported from `src/core/rng.ts`):
  - Deterministic per-run sequence derived from `(seed, cursor[, salt])`, implemented as a deterministic shuffle + cursor index.
  - Returns `{ line, nextCursor }`.
  - Callers own where the cursor lives (encounter-only vs run-global), and when it increments.

### 2) Minimal run state for cursors (not per-cell strings)

Add a small cursor map for no-repeat copy uses:

- Option A (preferred for cross-town variety): store one or more cursors on `Run` (`Run.copyCursors?: Record<string, number>`).
  - Reset on new run.
  - Names are owned by the game/mechanic layer; `copy.ts` does not care what they mean.

- Option B (encounter-local variety): store cursor(s) on the encounter.
  - We ended up preferring run-scoped cursors + tags (and using `salt` when we want per-place sequences, e.g. per-town rumors) so copy state stays concentrated on `Run`.

### 3) Town owns which semantic uses it calls (no god module)

`src/core/town.ts` selects copy by policy:

- Town entry copy: `stable` (`townId` anchored).
- Purchase feedback copy: `cursorAdvance` (cursor advanced per successful purchase), with cursor stored on `Run` for cross-town variety.

This keeps the “what does Town do?” logic in the Town mechanic module, aligned with `docs/refactor-mechanics-encounters-worldgen.md`.

## Implementation steps

### Step 1 — Add copy policies (no behavior changes yet)

Files:
- Add/extend `src/core/rng.ts`

Deliverables:
- Functions:
  - `stable({ seed, placeId, pool, salt? }) -> string`
  - `perMove({ seed, stepCount, cellId, pool, salt? }) -> string`
  - `cursorAdvance({ seed, cursor, pool, salt? }) -> { line: string, nextCursor: number }`
  - Internal deterministic shuffle helper (Fisher–Yates using keyed picks).

Notes:
- `stable` / `perMove` / `cursorAdvance` must not import tiles/registry or mechanics; they are pure and in-process.

### Step 2 — Extend `Run` with copy cursors

Files:
- Update `src/core/types.ts` (`Run`)
- Update `src/core/reducer.ts` new-run initialization and restart paths as needed

Deliverables:
- `Run.copyCursors` initialized as `{}` and populated lazily by tag.

### Step 3 — Fix town purchase repetition via no-repeat-per-run

Files:
- Update `src/core/town.ts`

Changes:
- Replace buy feedback copy with a run-global cursor tag (e.g. `town.buyFeedback`) advanced via the random/copy seam.
- Increment cursor on each successful purchase action (food/troops/etc.) by advancing that tag.
- Keep place description entry copy `copy.stable` (seed + townId), not cursor-based.

### Step 4 — Tests

Add tests ensuring:
- **Town buy copy no-repeat**: within one run, repeated successful purchases produce different lines until cycling.
- **Town enter copy stable**: re-entering the same town yields the same entry line.
- Existing PRNG golden tests remain unchanged (`tests/core/rng.test.ts`).

Potential file:
- Add `tests/core/copy.test.ts` and/or extend `tests/core/town.reducer.test.ts`.

## Acceptance criteria

- Repeated “buy” actions in towns do **not** repeat the same line every time (within a pool cycle).
- Town entry description is stable for a given town (does not change per visit).
- No nondeterministic RNG is introduced in `src/core/**`.
- No new ad-hoc RNG helpers are needed in feature modules to achieve copy variety.

## Follow-ups (optional, after this plan)

- Migrate other “action feedback” copy (combat exit lines, farm harvest lines) to `copy.cursorAdvance` where repetition is noticeable.
- After `docs/refactor-mechanics-encounters-worldgen.md` registry work: allow mechanics to declare which cursor(s) they need, while `copy.ts` remains the single selection policy module.

