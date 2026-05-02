# Plan: Core bitwise cleanup (`src/core/**` → `rng.ts` only)

**Status:** implemented (2026-04-28)

## Goal

Remove truncate-to-int / unsigned patterns (`| 0`, `>>> 0`, and similar coercions) from all of `src/core/**` **except** `src/core/rng.ts`. Keep 32-bit xorshift, hashing, and pool indexing inside `rng.ts`. Game-facing deterministic flows stay deterministic; flavor text / exit-line indices may shift if integer coercion paths change—update tests accordingly.

## `randInt` contract (centralize u32 here)

- **Normalize `rngState` inside `randInt`** (and return an updated state in the same 32-bit unsigned space): apply the same coercion currently implied by callers (`>>> 0` / chained `xorshift32`), so callers pass `world.rngState` and raw numbers without casting.
- **Normalize `maxExclusive` inside `randInt`**: define and test this contract explicitly:
  - If `maxExclusive` is not finite, or `maxExclusive <= 0`: treat it as `1`.
  - Otherwise: `maxExclusive = Math.trunc(maxExclusive)` and clamp to at least `1`.
  - Use the normalized value for `next % maxExclusive`.
  - Callers stop doing `(n | 0)` / `>>> 0` / `Math.max(1, ...)` before calling.
- **Return value**: keep `value` in `0 .. maxExclusive-1` with the same distribution as today for the same normalized inputs. Returning `rngState` already in u32 form is fine **inside** `rng.ts` only.

Required: add `tests/core/rng.test.ts` (or extend existing tests) for the normalization edge cases above.

## Determinism hardening (proof, not prose)

- Add a small “golden vector” test that fixes:
  - an initial `rngState`
  - a list of `maxExclusive` values
  - the expected sequence of `{ rngState, value }` pairs from `randInt`
- This guards the refactor from accidentally changing RNG progression while removing call-site casts.

## Scope

- **In scope**: mechanical refactor of `src/core/**` to remove bitwise ops outside `src/core/rng.ts`.
- **Allowed scope exception**: mechanical updates to `tests/core/**` to track any expectation changes caused by the refactor.
- **Out of scope**: `src/platform/**` changes (none expected).

## Files to touch (current hotspots)

### RNG / combat

- `src/core/rng.ts` — implement `randInt` normalization; keep `u32`, `xorshift32`, `hashSeedStepCell`, `pickIndex` bitwise usage here only.
- `src/core/combat.ts` — remove `| 0` / `>>> 0` from cell index, army sizes, `randInt` args/returns, and comparison locals; use `Math.trunc` / `Math.max(0, …)` where non-negative integers are required.

### Reducer / world

- `src/core/reducer.ts` — replace wide `| 0` usage (UI clock/anim, resources, encounter, combat rewards, `gameOverMessage` key, move actions) with explicit integer helpers or `Math.trunc` / `Math.max` as appropriate.
- `src/core/world.ts` — replace `(x) | 0` truncation after division with `Math.floor` or `Math.trunc` consistent with existing semantics (non-negative grid stats).

### Tiles

- `src/core/tiles/onEnterCamp.ts` — drop `>>> 0` on `world.rngState`; drop `| 0` on resources, `randInt` values, and line indices.
- `src/core/tiles/onEnterFarm.ts` — same as camp.
- `src/core/tiles/onEnterHenge.ts` — replace `| 0` on cooldown / step comparisons with integer-safe reads.
- `src/core/tiles/poiUtils.ts` — replace `k = ((seed | 0) + …) | 0` with additive integer normalization (e.g. `Math.trunc` on components or rely on invariants from callers).

### Other modules

- Re-grep after edits: some files had no bitwise at plan time but **line-selection refactors** may touch `signpost.ts`, tile handlers, `constants.ts`, etc. without adding `| 0` / `>>> 0` outside `rng.ts`.
- **Tests**: `tests/core/rng.test.ts` holds **normalization + golden-vector** checks for `randInt` progression.

## Ordered steps

1. **Extend `randInt` in `rng.ts`** — document behavior; normalize `rngState` and `maxExclusive`; ensure modulo path matches current semantics for typical inputs.
2. **Add focused `prng` tests** — required: normalization edges + golden vectors for RNG progression.
3. **Update `combat.ts`** — rely on `randInt` normalization; use non-bitwise integer coercion for indices and army math.
4. **Update tile handlers** (`onEnterCamp`, `onEnterFarm`, `onEnterHenge`, `poiUtils`) — align with new `randInt` usage; keep `world.rngState` threading straightforward.
5. **Update `reducer.ts`** — large mechanical pass: resources, encounter, combat branch, UI animation/clock, move deltas; introduce a tiny local helper (e.g. `asInt(n, fallback)`) only if it reduces repetition without spreading bitwise elsewhere.
6. **Update `world.ts`** — replace float-to-int truncations after averaging / bucketing.
7. **Tests** — refresh `tests/core/combat.reducer.test.ts`, `farms.reducer.test.ts`, `army-camps.reducer.test.ts`, and any expectations that tied to exact line indices or mirrored `>>> 0`; keep assertions on deterministic RNG **progression** where that is the intent.
8. **Verification** — run inventory greps and full `npm run verify`.

## Acceptance criteria

- **Inventory + enforcement (precise grep)**:
  - `rg '\\| 0' src/core --glob '!**/rng.ts'` returns no matches
  - `rg '>>> 0' src/core --glob '!**/rng.ts'` returns no matches
  - (Optional) if needed: `rg '<<\\s*\\d|>>\\s*\\d|>>>\\s*\\d' src/core --glob '!**/rng.ts'` returns no matches
- **`npm run verify`** passes (TypeScript build + cart bundle + tests as defined by the project).
- **Determinism**: given the same initial state, RNG state evolution and combat outcomes that are intentionally seeded remain reproducible; acceptable behavior change: harvest/recruit/signpost wording or line index selection.
- **Callers**: no `u32` / `>>> 0` / `| 0` workaround immediately before or after `randInt` except what remains encapsulated in `rng.ts`.

## Notes

- Prefer **`Math.trunc`** for “drop fractional part” and **`Math.floor`** where the domain is non-negative and floor matches prior `(x) | 0` behavior.
- Tests may contain `| 0` / `>>> 0` mirroring old patterns; clean up when touching those tests, but the acceptance grep targets `src/core` only.
