# Mechanics Registry (Phase 2+3: Encounters + Right-Grid) Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints.

## Context

Phase 1 is already implemented on this branch: `MechanicDef` + `MECHANICS` + derived `onEnterByKind`, with `src/core/tiles/registry.ts` routing tile-enter through the derived mapping.

This plan implements the next two small slices of the approved design (`docs/plans/2026-05-04-mechanic-modules-registry-design.md`):

- **Phase 2:** Add `startEncounterByKind` and route camp/town modal start in the move pipeline through the registry (removing the hardcoded `destKind === 'camp'|'town'` branch in `reducer.ts`).
- **Phase 3:** Add `rightGridByEncounterKind` and route encounter cross remaps in `rightGrid.ts` through the registry (preserving corners + overworld cross in core).

---

**Goal:** Reduce “sprinkled switches” by routing (1) camp/town encounter start, and (2) encounter right-grid layouts through derived registries built from `MECHANICS`, preserving existing gameplay behavior.

**Architecture:** Extend `MechanicDef` + `buildMechanicIndex` to produce:

- `startEncounterByKind: Partial<Record<CellKind, StartEncounterFn>>`
- `rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>>`

Then consume those maps in `src/core/reducer.ts` and `src/core/rightGrid.ts`.

**Tech Stack:** TypeScript, Vitest

**TDD during implementation:** enforce

**ATDD during implementation:** waive — Internal architecture refactor; existing acceptance tests already define the behavior contract.

---

## File structure (Phase 2+3)

- Modify: `src/core/mechanics/types.ts` — add `StartEncounterFn`, `RightGridProvider`, and the new optional fields on `MechanicDef`.
- Modify: `src/core/mechanics/registry.ts` — extend `MechanicIndex` + `buildMechanicIndex` to derive `startEncounterByKind` + `rightGridByEncounterKind` with loud validation.
- Modify: `src/core/mechanics/index.ts` — export `MECHANIC_INDEX` built once from `MECHANICS` (so consumers don’t rebuild).
- Modify: `src/core/tiles/registry.ts` — consume `MECHANIC_INDEX` (no behavior change; small cleanup).
- Modify: `src/core/reducer.ts` — route camp/town modal starts via `startEncounterByKind`.
- Modify: `src/core/rightGrid.ts` — route encounter remaps via `rightGridByEncounterKind` (corners + overworld remain core-owned).
- Modify: `src/core/mechanics/defs/camp.ts` — add `startEncounter` + `rightGrid` for `'camp'`.
- Modify: `src/core/mechanics/defs/town.ts` — add `startEncounter` + `rightGrid` for `'town'`.
- Add: `src/core/mechanics/defs/combat.ts` — encounter-UI-only mechanic to own `'combat'` right-grid layout.
- Modify: `tests/core/mechanics.registry.test.ts` — extend tests to cover new registry surfaces + validation.

---

## Chunk 1 (Phase 2): `startEncounterByKind` + reducer routing

### Task 1: Extend `MechanicDef` + `MechanicIndex` with a placeholder `startEncounterByKind` (typecheck stays green)

**Files:**
- Modify: `src/core/mechanics/types.ts`
- Modify: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Add StartEncounterFn type + optional field**

In `src/core/mechanics/types.ts`, add:

```ts
import type { Encounter } from '../types'

export type StartEncounterFn = (args: { kind: CellKind; cellId: number; restoreMessage: string }) => Encounter
```

Then extend `MechanicDef`:

```ts
startEncounter?: StartEncounterFn
```

- [ ] **Step 2: Add placeholder map to the index type and return value**

In `src/core/mechanics/registry.ts`, add to `MechanicIndex`:

```ts
startEncounterByKind: Partial<Record<CellKind, StartEncounterFn>>
```

Initialize it to `{}` and include it in the returned object, but do **not** populate it yet.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 2: Add a failing unit test that expects startEncounter to be indexed by kind

**Files:**
- Modify: `tests/core/mechanics.registry.test.ts`

- [ ] **Step 1: Extend the `mech()` helper**

Update the helper so it can optionally include `startEncounter`, while remaining compatible with `exactOptionalPropertyTypes`:

```ts
function mech(
  id: string,
  kinds: readonly CellKind[],
  onEnter?: TileEnterHandler,
  startEncounter?: StartEncounterFn,
): MechanicDef {
  return {
    id,
    kinds,
    ...(onEnter ? { onEnter } : {}),
    ...(startEncounter ? { startEncounter } : {}),
  }
}
```

- [ ] **Step 2: Add a failing test**

Add:

```ts
it('indexes startEncounter handlers by kind', () => {
  const startCamp: StartEncounterFn = ({ cellId, restoreMessage }) => ({
    kind: 'camp',
    sourceKind: 'camp',
    sourceCellId: cellId,
    restoreMessage,
  })

  const mechanics = [mech('camp', ['camp'], undefined, startCamp)]
  const idx = buildMechanicIndex(mechanics)
  expect(idx.startEncounterByKind.camp).toBe(startCamp)
})
```

- [ ] **Step 3: Run just the unit test**

Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: FAIL (the placeholder map is still empty).

### Task 3: Populate `startEncounterByKind` in `buildMechanicIndex`

**Files:**
- Modify: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Populate within the existing per-kind loop**

Inside the `for (kind of m.kinds)` loop, set:

```ts
if (m.startEncounter) startEncounterByKind[kind] = m.startEncounter
```

Note: duplicate `startEncounter` ownership by kind is impossible as long as **kind ownership is unique** (already enforced by `ownerByKind` validation).

- [ ] **Step 2: Run the registry tests**

Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: PASS.

### Task 4: Add `startEncounter` to camp + town mechanic defs

**Files:**
- Modify: `src/core/mechanics/defs/camp.ts`
- Modify: `src/core/mechanics/defs/town.ts`

- [ ] **Step 1: Add `startEncounter` lambdas**

In `camp.ts`:

```ts
startEncounter: ({ cellId, restoreMessage }) => ({
  kind: 'camp',
  sourceKind: 'camp',
  sourceCellId: cellId,
  restoreMessage,
}),
```

In `town.ts`:

```ts
startEncounter: ({ cellId, restoreMessage }) => ({
  kind: 'town',
  sourceKind: 'town',
  sourceCellId: cellId,
  restoreMessage,
}),
```

- [ ] **Step 2: Run acceptance tests that exercise camp/town starts**

Run:

```bash
npm test -- tests/core/v0.2-map-scout.acceptance.test.ts
npm test -- tests/core/v0.3-gold-towns.acceptance.test.ts
```

Expected: PASS.

### Task 5: Export a single built `MECHANIC_INDEX` and update tile-enter routing to use it (no behavior change)

**Files:**
- Modify: `src/core/mechanics/index.ts`
- Modify: `src/core/tiles/registry.ts`

- [ ] **Step 1: Export `MECHANIC_INDEX` from `src/core/mechanics/index.ts`**

```ts
import { buildMechanicIndex } from './registry'

export const MECHANIC_INDEX = buildMechanicIndex(MECHANICS)
```

- [ ] **Step 2: Use `MECHANIC_INDEX` in `src/core/tiles/registry.ts`**

Replace the local `buildMechanicIndex(MECHANICS)` call with:

```ts
import { MECHANIC_INDEX } from '../mechanics'

const { onEnterByKind } = MECHANIC_INDEX
```

- [ ] **Step 3: Run unit tests + typecheck**

Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
npm run typecheck:test
```

Expected: PASS.

### Task 6: Route camp/town encounter starts in `reducer.ts` through `startEncounterByKind`

**Files:**
- Modify: `src/core/reducer.ts`

- [ ] **Step 1: Import the derived map**

At module scope:

```ts
import { MECHANIC_INDEX } from './mechanics'

const { startEncounterByKind } = MECHANIC_INDEX
```

- [ ] **Step 2: Replace the hardcoded camp/town branch**

In the move pipeline (current block around `destKind === 'camp'` / `destKind === 'town'`), replace it with:

```ts
const starter = startEncounterByKind[destKind]
if (starter) {
  nextEncounter = starter({ kind: destKind, cellId: destCellId, restoreMessage: preEncounterMessage })
  didStartCamp = nextEncounter.kind === 'camp'
  didStartTown = nextEncounter.kind === 'town'
} else {
  // existing rollTileEvent branch unchanged
}
```

- [ ] **Step 3: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

### Task 7: Chunk 1 verification

- [ ] Run:

```bash
npm run verify
```

Expected: PASS.

---

## Chunk 2 (Phase 3): `rightGridByEncounterKind` + right-grid routing

### Task 8: Add RightGridProvider + placeholder `rightGridByEncounterKind` (typecheck stays green)

**Files:**
- Modify: `src/core/mechanics/types.ts`
- Modify: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Add encounter + right-grid types**

In `src/core/mechanics/types.ts`, add:

```ts
import type { State, Encounter } from '../types'
import type { RightGridCellDef } from '../rightGrid'

export type EncounterKind = Encounter['kind']
export type RightGridProvider = (s: State, row: number, col: number) => RightGridCellDef
```

Extend `MechanicDef`:

```ts
rightGridEncounterKind?: EncounterKind
rightGrid?: RightGridProvider
```

- [ ] **Step 2: Add placeholder map to the index**

In `src/core/mechanics/registry.ts`, add to `MechanicIndex`:

```ts
rightGridByEncounterKind: Partial<Record<EncounterKind, RightGridProvider>>
```

Initialize it to `{}` and include it in the returned object, but do **not** populate it yet.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck:test
```

Expected: PASS.

### Task 9: Add failing unit tests for `rightGridByEncounterKind` indexing + validation

**Files:**
- Modify: `tests/core/mechanics.registry.test.ts`

- [ ] **Step 1: Add a failing indexing test**

```ts
it('indexes rightGrid providers by encounter kind', () => {
  const p: RightGridProvider = () => ({ action: null })
  const mechanics: MechanicDef[] = [
    { id: 'camp', kinds: ['camp'], rightGridEncounterKind: 'camp', rightGrid: p },
    { id: 'combat', kinds: [], rightGridEncounterKind: 'combat', rightGrid: p },
  ]
  const idx = buildMechanicIndex(mechanics)
  expect(idx.rightGridByEncounterKind.camp).toBe(p)
  expect(idx.rightGridByEncounterKind.combat).toBe(p)
})
```

- [ ] **Step 2: Add failing validation tests**

```ts
it('throws if two mechanics claim the same rightGridEncounterKind', () => {
  const p: RightGridProvider = () => ({ action: null })
  const mechanics: MechanicDef[] = [
    { id: 'a', kinds: [], rightGridEncounterKind: 'camp', rightGrid: p },
    { id: 'b', kinds: [], rightGridEncounterKind: 'camp', rightGrid: p },
  ]
  expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate.*rightgrid/i)
})

it('throws if rightGrid and rightGridEncounterKind are not both set', () => {
  const p: RightGridProvider = () => ({ action: null })
  expect(() => buildMechanicIndex([{ id: 'a', kinds: [], rightGrid: p }])).toThrow(/rightgrid/i)
  expect(() => buildMechanicIndex([{ id: 'b', kinds: [], rightGridEncounterKind: 'camp' }])).toThrow(/rightgrid/i)
})
```

- [ ] **Step 3: Run the registry tests**

Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: FAIL (placeholder map only).

### Task 10: Implement `rightGridByEncounterKind` population + validation in `buildMechanicIndex`

**Files:**
- Modify: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Add paired-field + duplicate validation**

In the per-mechanic loop, add:

```ts
const encounterKind = m.rightGridEncounterKind
const provider = m.rightGrid

if ((encounterKind && !provider) || (!encounterKind && provider)) {
  throw new Error(`Mechanic ${m.id} must set both rightGridEncounterKind and rightGrid`)
}

if (encounterKind && provider) {
  const prev = rightGridByEncounterKind[encounterKind]
  if (prev) throw new Error(`Duplicate rightGridEncounterKind: ${encounterKind}`)
  rightGridByEncounterKind[encounterKind] = provider
}
```

- [ ] **Step 2: Run registry tests**

Run:

```bash
npm test -- tests/core/mechanics.registry.test.ts
```

Expected: PASS.

### Task 11: Add encounter right-grid providers to mechanic defs (camp/town/combat)

**Files:**
- Add: `src/core/mechanics/defs/combat.ts`
- Modify: `src/core/mechanics/defs/camp.ts`
- Modify: `src/core/mechanics/defs/town.ts`
- Modify: `src/core/mechanics/index.ts`

- [ ] **Step 1: Add `combatMechanic` (encounter-UI-only; owns no `CellKind`)**

Create `src/core/mechanics/defs/combat.ts`:

```ts
import { ACTION_FIGHT, ACTION_RETURN } from '../../constants'
import { SPRITES } from '../../spriteIds'
import type { MechanicDef, RightGridProvider } from '../types'

const combatRightGrid: RightGridProvider = (_s, row, col) => {
  if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.fight, action: { type: ACTION_FIGHT } }
  if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_RETURN } }
  if (row === 1 && col === 1) return { spriteId: SPRITES.stats.enemy, action: null }
  return { action: null }
}

export const combatMechanic: MechanicDef = {
  id: 'combat',
  kinds: [],
  rightGridEncounterKind: 'combat',
  rightGrid: combatRightGrid,
}
```

- [ ] **Step 2: Add camp right-grid provider**

In `src/core/mechanics/defs/camp.ts`, add:

```ts
import { ACTION_CAMP_LEAVE, ACTION_CAMP_SEARCH } from '../../constants'
import { SPRITES } from '../../spriteIds'
```

and add to the exported mechanic:

```ts
rightGridEncounterKind: 'camp',
rightGrid: (_s, row, col) => {
  if (row === 0 && col === 1) return { action: null } // North disabled
  if (row === 1 && col === 0) return { spriteId: SPRITES.buttons.search, action: { type: ACTION_CAMP_SEARCH } }
  if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_CAMP_LEAVE } }
  if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.campfireIcon, action: null }
  return { action: null }
},
```

- [ ] **Step 3: Add town right-grid provider (avoid importing from `src/core/rightGrid.ts` to prevent runtime cycles)**

In `src/core/mechanics/defs/town.ts`, add:

```ts
import {
  ACTION_TOWN_BUY_FOOD,
  ACTION_TOWN_BUY_RUMOR,
  ACTION_TOWN_BUY_TROOPS,
  ACTION_TOWN_HIRE_SCOUT,
  ACTION_TOWN_LEAVE,
} from '../../constants'
import { SPRITES } from '../../spriteIds'
import type { TownOfferKind } from '../../types'
```

Then add to the exported mechanic:

```ts
rightGridEncounterKind: 'town',
rightGrid: (s, row, col) => {
  const pos = s.player.position
  const cell = s.world.cells[pos.y]![pos.x]!
  if (cell.kind !== 'town') return { action: null }
  const town = cell

  function actionForOffer(o: TownOfferKind) {
    if (o === 'buyFood') return { type: ACTION_TOWN_BUY_FOOD } as const
    if (o === 'buyTroops') return { type: ACTION_TOWN_BUY_TROOPS } as const
    if (o === 'hireScout') return { type: ACTION_TOWN_HIRE_SCOUT } as const
    return { type: ACTION_TOWN_BUY_RUMOR } as const
  }

  function spriteIdForOffer(o: TownOfferKind | undefined): number | null {
    if (!o) return null
    if (o === 'buyFood') return SPRITES.buttons.food
    if (o === 'buyTroops') return SPRITES.buttons.troop
    if (o === 'hireScout') return SPRITES.buttons.scout
    if (o === 'buyRumors') return SPRITES.buttons.rumorTip
    return null
  }

  const offerAt = (idx: number) => {
    const o = town.offers[idx]
    if (!o) return { action: null }
    const spriteId = spriteIdForOffer(o)
    if (spriteId == null) return { action: null }
    return { spriteId, action: actionForOffer(o) }
  }

  if (row === 0 && col === 1) return offerAt(0) // North
  if (row === 1 && col === 0) return offerAt(1) // West
  if (row === 2 && col === 1) return offerAt(2) // South
  if (row === 1 && col === 2) return { spriteId: SPRITES.buttons.return, action: { type: ACTION_TOWN_LEAVE } } // East
  if (row === 1 && col === 1) return { spriteId: SPRITES.cosmetics.marketStall, action: null } // Center
  return { action: null }
},
```

- [ ] **Step 4: Register `combatMechanic` in `src/core/mechanics/index.ts`**

Import and add it to `MECHANICS`:

```ts
import { combatMechanic } from './defs/combat'
```

Add `combatMechanic` to the exported `MECHANICS` array.

- [ ] **Step 5: Run right-grid tests**

Run:

```bash
npm test -- tests/core/rightGrid.camp.test.ts
npm test -- tests/core/rightGrid.town.test.ts
```

Expected: PASS.

### Task 12: Route encounter right-grid remaps through `rightGridByEncounterKind`

**Files:**
- Modify: `src/core/rightGrid.ts`

- [ ] **Step 1: Import the derived map**

At module scope:

```ts
import { MECHANIC_INDEX } from './mechanics'

const { rightGridByEncounterKind } = MECHANIC_INDEX
```

- [ ] **Step 2: Replace the encounter if-ladder with registry dispatch**

Replace the combat/camp/town branches with:

```ts
if (s.encounter) {
  const p = rightGridByEncounterKind[s.encounter.kind]
  return p ? p(s, row, col) : { action: null }
}
```

Keep:
- the **corner buttons** exactly as-is (meta buttons remain core-owned),
- `spriteIdForTownOffer` exported (still used by `src/platform/tic80/rightGridRenderPlan.ts`),
- the **overworld cross** logic unchanged.

- [ ] **Step 3: Run right-grid tests**

Run:

```bash
npm test -- tests/core/rightGrid.camp.test.ts
npm test -- tests/core/rightGrid.town.test.ts
```

Expected: PASS.

### Task 13: Chunk 2 verification

- [ ] Run:

```bash
npm run verify
```

Expected: PASS.

---

## Post-merge hygiene (optional)

- If desired, add a small `rightGrid.combat.test.ts` mirroring camp/town tests (not required if `npm run verify` is already green).

