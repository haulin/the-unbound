# Mechanics Registry (Phases 4 + 6: Move Events + Map Labels) Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints.

## Context

**Prompt:** “Nice. Shall we plan the remaining two phases?”

**Reasoning:** Continue the approved mechanics-registry design (`docs/plans/2026-05-04-mechanic-modules-registry-design.md`) by migrating the last two remaining “sprinkled switches”:

- **Move events** (current `src/core/tileEvents.ts` + reducer call site) → a registry-backed `rollMoveEvent` using per-kind hazard budgets (with an empty global remainder pool for now), preserving current determinism and behavior.
- **Map labels** (current `GAME_MAP_LABEL_BY_KIND` in `src/core/constants.ts`) → a registry-derived `mapLabelByKind`, preserving current map marker output.

We also adopt the agreed naming preference during implementation: prefer clear variable names like `ambushPercent` / `lostPercent` over abbreviations like `ambushPct`.

---

**Goal:** Route move-event selection and map labeling through derived registries built from `MECHANICS`, preserving gameplay behavior.

**Architecture:** Extend `MechanicDef` + `MECHANIC_INDEX` with two new exclusive-by-kind surfaces:
- `mapLabelByKind` (derived from per-mechanic `mapLabel?: string`)
- `moveEventPolicyByKind` (derived from per-mechanic `moveEventPolicyByKind?: Partial<Record<CellKind, MoveEventPolicy>>`)

Then update `computeGameMapView` and the move pipeline to consume those derived maps.

**Note (shape vs design):** The design document sketches map labels as a per-kind map. For this phase we intentionally use the simpler `mapLabel?: string` because every currently-labeled mechanic wants a single label across its owned kinds (notably `gate` + `gateOpen` both use `'G'`). If we later need per-kind label differences under one mechanic, we can graduate to a per-kind mapping then.

**Tech Stack:** TypeScript, Vitest

**TDD during implementation:** enforce

**ATDD during implementation:** waive — Internal architecture refactor; existing acceptance tests already define the behavior contract.

---

## File structure (Phases 4 + 6)

- Modify: `src/core/mechanics/types.ts` — add `mapLabel`, move-event types, and `moveEventPolicyByKind`.
- Modify: `src/core/mechanics/registry.ts` — derive `mapLabelByKind` and `moveEventPolicyByKind` with validation.
- Modify: `src/core/mechanics/index.ts` — register new hazard mechanic(s).
- Create: `src/core/mechanics/moveEvents.ts` — `rollMoveEvent` (keyed RNG; hazard budgets + empty global pool).
- Create: `src/core/mechanics/defs/terrainHazards.ts` — owns hazard policies for `woods`, `swamp`, `mountain`.
- Modify: `src/core/reducer.ts` — call `rollMoveEvent` instead of `rollTileEvent`.
- Modify: `src/core/gameMap.ts` — use registry-derived labels.
- Modify: `src/core/constants.ts` — remove `GAME_MAP_LABEL_BY_KIND`.
- Modify tests:
  - `tests/core/mechanics.registry.test.ts` — add unit coverage for `mapLabelByKind` and `moveEventPolicyByKind`.
  - `tests/core/tileEvents.test.ts`, `tests/core/tileEvents.scout.test.ts` — migrate to `rollMoveEvent` (and optionally rename files).

---

## Chunk 1 (Phase 6): Map labels via registry

### Task 1: Add placeholder `mapLabelByKind` to the registry (keep typecheck green)

**Files:**
- Modify: `src/core/mechanics/types.ts`
- Modify: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Extend `MechanicDef`**

In `src/core/mechanics/types.ts`, add:

```ts
mapLabel?: string
```

- [ ] **Step 2: Extend the derived index (placeholder only)**

In `src/core/mechanics/registry.ts`, add to `MechanicIndex`:

```ts
mapLabelByKind: Partial<Record<CellKind, string>>
```

Initialize `mapLabelByKind = {}` and include it in the returned `MechanicIndex`, but do **not** populate it yet.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 2: Add a failing registry unit test for map labels

**Files:**
- Modify: `tests/core/mechanics.registry.test.ts`

- [ ] **Step 1: Add failing test**

```ts
it('indexes map labels by kind (including multi-kind ownership)', () => {
  const mechanics: MechanicDef[] = [{ id: 'gate', kinds: ['gate', 'gateOpen'], mapLabel: 'G' }]
  const idx = buildMechanicIndex(mechanics)
  expect(idx.mapLabelByKind.gate).toBe('G')
  expect(idx.mapLabelByKind.gateOpen).toBe('G')
})
```

- [ ] **Step 2: Run test**

Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: FAIL (placeholder map is empty).

### Task 3: Populate `mapLabelByKind` in `buildMechanicIndex`

**Files:**
- Modify: `src/core/mechanics/registry.ts`

Inside the per-kind loop:

```ts
if (m.mapLabel != null) mapLabelByKind[kind] = m.mapLabel
```

Note: duplicate map-label ownership by kind is impossible as long as **kind ownership is unique** (already enforced by `ownerByKind`).

- [ ] Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: PASS.

### Task 4: Add map labels to `gate` and `locksmith`

**Files:**
- Modify: `src/core/mechanics/defs/gate.ts` (`mapLabel: 'G'`)
- Modify: `src/core/mechanics/defs/locksmith.ts` (`mapLabel: 'L'`)

- [ ] Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 5: Add map labels to `farm`, `camp`, `henge`, `town`

**Files:**
- Modify: `src/core/mechanics/defs/farm.ts` (`mapLabel: 'F'`)
- Modify: `src/core/mechanics/defs/camp.ts` (`mapLabel: 'C'`)
- Modify: `src/core/mechanics/defs/henge.ts` (`mapLabel: 'H'`)
- Modify: `src/core/mechanics/defs/town.ts` (`mapLabel: 'T'`)

- [ ] Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 6: Route `computeGameMapView` labels through `MECHANIC_INDEX.mapLabelByKind`

**Files:**
- Modify: `src/core/gameMap.ts`

Replace:

```ts
import { GAME_MAP_LABEL_BY_KIND, SCOUT_GLOBAL_REVEAL_KINDS } from './constants'
```

with:

```ts
import { SCOUT_GLOBAL_REVEAL_KINDS } from './constants'
import { MECHANIC_INDEX } from './mechanics'

const { mapLabelByKind } = MECHANIC_INDEX
```

Then replace:

```ts
const label = GAME_MAP_LABEL_BY_KIND[kind]
```

with:

```ts
const label = mapLabelByKind[kind]
```

- [ ] Run:

```bash
npm test -- tests/core/gameMap.test.ts
```

Expected: PASS.

### Task 7: Remove `GAME_MAP_LABEL_BY_KIND` constant

**Files:**
- Modify: `src/core/constants.ts`

Delete:
- `GAME_MAP_LABEL_BY_KIND` export

Keep:
- `SCOUT_GLOBAL_REVEAL_KINDS` unchanged (reveal policy stays in `gameMap.ts` for now).

- [ ] Run:

```bash
npm test -- tests/core/gameMap.test.ts
```

Expected: PASS.

### Task 8: Chunk 1 verification

- [ ] Run:

```bash
npm run verify
```

Expected: PASS.

---

## Chunk 2 (Phase 4): Move events via hazard budgets + empty global remainder pool

### Task 9: Add placeholder move-event surfaces (keep typecheck green)

**Files:**
- Modify: `src/core/mechanics/types.ts`
- Modify: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Add move-event types + `moveEventPolicyByKind` to `MechanicDef`**

In `src/core/mechanics/types.ts`, add:

```ts
export type MoveEventSource = 'woods' | 'mountain' | 'swamp' | 'henge'
export type MoveEvent =
  | { kind: 'fight'; source: MoveEventSource }
  | { kind: 'lost'; source: 'woods' | 'swamp' }

export type MoveEventPolicy = {
  ambushPercent: number
  lostPercent: number
  scoutLostHalves?: boolean
}
```

Extend `MechanicDef`:

```ts
moveEventPolicyByKind?: Partial<Record<CellKind, MoveEventPolicy>>
```

Note (shape vs design): we use an explicit per-kind mapping so one mechanic can own multiple hazard kinds with different budgets, while validating that policy keys are a subset of the mechanic’s claimed `kinds`.

- [ ] **Step 2: Add placeholder map to `MechanicIndex`**

In `src/core/mechanics/registry.ts`, add:

```ts
moveEventPolicyByKind: Partial<Record<CellKind, MoveEventPolicy>>
```

Initialize `moveEventPolicyByKind = {}` and include it in the returned `MechanicIndex`, but do **not** populate it yet.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 10: Add failing unit tests for move-event policy indexing + validation

**Files:**
- Modify: `tests/core/mechanics.registry.test.ts`

Add:

```ts
it('indexes move event policies by kind', () => {
  const mechanics: MechanicDef[] = [
    {
      id: 'hazards',
      kinds: ['woods', 'swamp'],
      moveEventPolicyByKind: {
        woods: { ambushPercent: 15, lostPercent: 10, scoutLostHalves: true },
        swamp: { ambushPercent: 0, lostPercent: 20, scoutLostHalves: true },
      },
    },
  ]
  const idx = buildMechanicIndex(mechanics)
  expect(idx.moveEventPolicyByKind.woods?.lostPercent).toBe(10)
  expect(idx.moveEventPolicyByKind.swamp?.lostPercent).toBe(20)
})

it('throws if a move-event policy allocates more than 100%', () => {
  const mechanics: MechanicDef[] = [
    {
      id: 'bad',
      kinds: ['woods'],
      moveEventPolicyByKind: {
        woods: { ambushPercent: 60, lostPercent: 60 },
      },
    },
  ]
  expect(() => buildMechanicIndex(mechanics)).toThrow(/moveeventpolicy.*100/i)
})
```

- [ ] Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: FAIL (placeholder map, no validation/population yet).

### Task 11: Populate + validate `moveEventPolicyByKind` in `buildMechanicIndex`

**Files:**
- Modify: `src/core/mechanics/registry.ts`

Add to the per-mechanic loop (before the per-kind loop):

```ts
const policyByKind = m.moveEventPolicyByKind
if (policyByKind) {
  for (const k in policyByKind) {
    if (!m.kinds.includes(k as CellKind)) {
      throw new Error(`Mechanic ${m.id} sets moveEventPolicyByKind for ${k} but does not claim that kind`)
    }

    const policy = policyByKind[k as keyof typeof policyByKind]!
    const ambushPercent = policy.ambushPercent
    const lostPercent = policy.lostPercent
    if (ambushPercent < 0 || lostPercent < 0 || ambushPercent > 100 || lostPercent > 100 || ambushPercent + lostPercent > 100) {
      throw new Error(`MoveEventPolicy for ${k} must have ambushPercent + lostPercent <= 100`)
    }
  }
}
```

Then inside the per-kind loop:

```ts
const policy = policyByKind?.[kind]
if (policy) moveEventPolicyByKind[kind] = policy
```

Note: duplicate policy ownership by kind is impossible as long as **kind ownership is unique** (already enforced by `ownerByKind`).

- [ ] Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: PASS.

### Task 12: Add a `terrainHazardsMechanic` defining current woods/swamp/mountain budgets

**Files:**
- Create: `src/core/mechanics/defs/terrainHazards.ts`
- Modify: `src/core/mechanics/index.ts`

Create `terrainHazards.ts`:

```ts
import {
  MOUNTAIN_AMBUSH_PERCENT,
  SWAMP_LOST_PERCENT,
  WOODS_AMBUSH_PERCENT,
  WOODS_LOST_PERCENT,
} from '../../constants'
import type { MechanicDef, MoveEventPolicy } from '../types'

const woods: MoveEventPolicy = { ambushPercent: WOODS_AMBUSH_PERCENT, lostPercent: WOODS_LOST_PERCENT, scoutLostHalves: true }
const swamp: MoveEventPolicy = { ambushPercent: 0, lostPercent: SWAMP_LOST_PERCENT, scoutLostHalves: true }
const mountain: MoveEventPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 }

export const terrainHazardsMechanic: MechanicDef = {
  id: 'terrainHazards',
  kinds: ['woods', 'swamp', 'mountain'],
  moveEventPolicyByKind: { woods, swamp, mountain },
}
```

Register it in `src/core/mechanics/index.ts` by importing and adding to `MECHANICS`.

- [ ] Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 13: Implement `rollMoveEvent` with clear variable names (preserve current behavior)

**Files:**
- Create: `src/core/mechanics/moveEvents.ts`

Create:

```ts
import type { CellKind } from '../types'
import { RNG } from '../rng'
import { MECHANIC_INDEX } from './index'
import type { MoveEvent } from './types'

const { moveEventPolicyByKind } = MECHANIC_INDEX

export function rollMoveEvent(args: {
  seed: number
  stepCount: number
  cellId: number
  kind: CellKind
  hengeReady: boolean
  hasScout: boolean
}): MoveEvent | null {
  const { seed, stepCount, cellId, kind, hengeReady, hasScout } = args

  // Forced henge event stage (preserve current behavior).
  if (kind === 'henge') return hengeReady ? { kind: 'fight', source: 'henge' } : null

  const policy = moveEventPolicyByKind[kind]
  if (!policy) return null

  const ambushPercent = Math.max(0, policy.ambushPercent)
  let lostPercent = Math.max(0, policy.lostPercent)
  if (hasScout && policy.scoutLostHalves) lostPercent = Math.floor(lostPercent / 2)

  if (ambushPercent + lostPercent === 0) return null

  const percentile = RNG._keyedIntExclusive({ seed, stepCount, cellId }, 100)
  const hazardSource = kind === 'woods' || kind === 'swamp' || kind === 'mountain' ? kind : null
  if (!hazardSource) return null

  if (percentile < ambushPercent) return { kind: 'fight', source: hazardSource }
  if (percentile < ambushPercent + lostPercent) {
    if (hazardSource === 'mountain') return null
    return { kind: 'lost', source: hazardSource }
  }

  // Global remainder pool stage (empty for now; preserves current behavior).
  // Later, when adding global events, use a distinct keyed roll (salt) so hazard selection stays stable.
  return null
}
```

Note: keep variable names like `ambushPercent`, `lostPercent`, `percentile`.

- [ ] Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 14: Replace `rollTileEvent` usage in the move pipeline

**Files:**
- Modify: `src/core/reducer.ts`

Replace:

```ts
import { rollTileEvent } from './tileEvents'
```

with:

```ts
import { rollMoveEvent } from './mechanics/moveEvents'
```

Then replace the call site accordingly.

- [ ] Run:

```bash
npm test -- tests/core/v0.0.9-key.acceptance.test.ts
npm test -- tests/core/v0.1-lost.acceptance.test.ts
npm test -- tests/core/v0.2-map-scout.acceptance.test.ts
npm test -- tests/core/v0.3-gold-towns.acceptance.test.ts
```

Expected: PASS.

### Task 15: Update tile-event unit tests to use `rollMoveEvent`

**Files:**
- Modify: `tests/core/tileEvents.test.ts`
- Modify: `tests/core/tileEvents.scout.test.ts`

Replace imports of `rollTileEvent` with `rollMoveEvent` from `src/core/mechanics/moveEvents`.

In the tests themselves:
- Replace `rollTileEvent(...)` calls with `rollMoveEvent(...)`.
- Keep the percentile/seed-search helpers; keep the behavior assertions identical.

- [ ] Run:

```bash
npm test -- tests/core/tileEvents.test.ts
npm test -- tests/core/tileEvents.scout.test.ts
```

Expected: PASS.

Optional (nice cleanup): rename the test files to match the new concept:
- `tests/core/moveEvents.test.ts`
- `tests/core/moveEvents.scout.test.ts`

### Task 16: Delete `src/core/tileEvents.ts`

**Files:**
- Delete: `src/core/tileEvents.ts`

- [ ] **Step 1: Ensure there are no remaining imports**

Run:

```bash
rg \"rollTileEvent\" src tests
```

Expected: only false positives in docs, or no matches.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

### Task 17: Chunk 2 verification

- [ ] Run:

```bash
npm run verify
```

Expected: PASS.

---

## Next checkpoint

Plan ready to audit.
