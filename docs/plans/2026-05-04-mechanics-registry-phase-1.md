# Mechanics Registry (Phase 1: Tile-Enter) Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints.

## Context

**Prompt:** “/start see docs/refactor-mechanics-encounters-worldgen.md”

**Reasoning:** Implement the smallest slice of the approved design (`docs/plans/2026-05-04-mechanic-modules-registry-design.md`): introduce `MechanicDef` + `MECHANICS` and migrate tile-enter dispatch (`getOnEnterHandler`) to use a generated registry with loud validation (duplicate kinds, duplicate mechanic ids). This reduces “sprinkled switches” immediately without touching encounter logic, move-events, right-grid, or map labeling yet.

---

**Goal:** Add a mechanics registry and route tile-enter dispatch through it, preserving existing gameplay behavior.

**Architecture:** Add `src/core/mechanics/` with minimal Phase-1 `MechanicDef` + per-mechanic defs and a small registry builder. Update `src/core/tiles/registry.ts` to use derived `onEnterByKind` with default fallback (`onEnterDefaultTerrain`).

**Tech Stack:** TypeScript, Vitest

**TDD during implementation:** enforce

**ATDD during implementation:** waive — Internal architecture refactor; existing acceptance tests already define the behavior contract.

---

## File structure (Phase 1)

- Create: `src/core/mechanics/types.ts` — Phase-1 `MechanicDef`.
- Create: `src/core/mechanics/registry.ts` — build + validate derived registries.
- Create: `src/core/mechanics/defs/*.ts` — one file per mechanic owning existing tile-enter behavior.
- Create: `src/core/mechanics/index.ts` — exports `MECHANICS`.
- Modify: `src/core/tiles/registry.ts` — replace hardcoded `onEnterByKind` with derived mapping.
- Create: `tests/core/mechanics.registry.test.ts` — unit tests for the registry builder.

---

## Chunk 1: Mechanics registry + tile-enter dispatch

### Task 1: Add failing unit tests for registry validation + indexing

**Files:**
- Create: `tests/core/mechanics.registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildMechanicIndex } from '../../src/core/mechanics/registry'
import type { MechanicDef } from '../../src/core/mechanics/types'
import type { CellKind } from '../../src/core/types'
import type { TileEnterHandler } from '../../src/core/tiles/types'
import { onEnterGate } from '../../src/core/tiles/onEnterGate'

function mech(id: string, kinds: readonly CellKind[], onEnter?: TileEnterHandler): MechanicDef {
  // Note: `exactOptionalPropertyTypes` is enabled in test TS config, so we must
  // omit `onEnter` entirely when undefined (not set `onEnter: undefined`).
  return onEnter ? { id, kinds, onEnter } : { id, kinds }
}

describe('mechanics registry', () => {
  it('throws if two mechanics share the same id', () => {
    const mechanics = [mech('dup', ['gate'], onEnterGate), mech('dup', ['locksmith'], onEnterGate)]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate mechanic id/i)
  })

  it('throws if two mechanics claim the same kind (even if one has no onEnter)', () => {
    const mechanics = [mech('a', ['gate']), mech('b', ['gate'], onEnterGate)]
    expect(() => buildMechanicIndex(mechanics)).toThrow(/duplicate kind ownership/i)
  })

  it('indexes onEnter handlers by kind (including multi-kind ownership)', () => {
    const mechanics = [mech('gate', ['gate', 'gateOpen'], onEnterGate)]
    const idx = buildMechanicIndex(mechanics)
    expect(idx.onEnterByKind.gate).toBe(onEnterGate)
    expect(idx.onEnterByKind.gateOpen).toBe(onEnterGate)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails (RED)**

Run: `npm test -- tests/core/mechanics.registry.test.ts`  
Expected: FAIL (module `src/core/mechanics/registry` missing).

---

### Task 2: Implement minimal Phase-1 `MechanicDef`

**Files:**
- Create: `src/core/mechanics/types.ts`

- [ ] **Step 1: Add the file**

```ts
import type { CellKind } from '../types'
import type { TileEnterHandler } from '../tiles/types'

export type MechanicDef = {
  id: string
  kinds: readonly CellKind[]

  // Phase 1: tile-enter routing only.
  onEnter?: TileEnterHandler
}
```

- [ ] **Step 2: Re-run the test (still RED)**

Run: `npm test -- tests/core/mechanics.registry.test.ts`  
Expected: FAIL (registry builder missing).

---

### Task 3: Implement registry builder with loud validation

**Files:**
- Create: `src/core/mechanics/registry.ts`

- [ ] **Step 1: Implement `buildMechanicIndex`**

```ts
import type { CellKind } from '../types'
import type { TileEnterHandler } from '../tiles/types'
import type { MechanicDef } from './types'

export type MechanicIndex = {
  ownerByKind: Partial<Record<CellKind, string>>
  onEnterByKind: Partial<Record<CellKind, TileEnterHandler>>
}

export function buildMechanicIndex(mechanics: readonly MechanicDef[]): MechanicIndex {
  const seenIds = new Set<string>()
  const ownerByKind: Partial<Record<CellKind, string>> = {}
  const onEnterByKind: Partial<Record<CellKind, TileEnterHandler>> = {}

  for (let i = 0; i < mechanics.length; i++) {
    const m = mechanics[i]!

    if (seenIds.has(m.id)) {
      throw new Error(`Duplicate mechanic id: ${m.id}`)
    }
    seenIds.add(m.id)

    for (let k = 0; k < m.kinds.length; k++) {
      const kind = m.kinds[k]!
      const prevOwner = ownerByKind[kind]
      if (prevOwner) {
        throw new Error(`Duplicate kind ownership: ${kind} claimed by ${prevOwner} and ${m.id}`)
      }
      ownerByKind[kind] = m.id
      if (m.onEnter) onEnterByKind[kind] = m.onEnter
    }
  }

  return { ownerByKind, onEnterByKind }
}
```

- [ ] **Step 2: Run the unit tests**

Run: `npm test -- tests/core/mechanics.registry.test.ts`  
Expected: PASS.

---

### Task 4: Add mechanic defs (gate/locksmith/signpost)

**Files:**
- Create: `src/core/mechanics/defs/gate.ts`
- Create: `src/core/mechanics/defs/locksmith.ts`
- Create: `src/core/mechanics/defs/signpost.ts`

- [ ] **Step 1: Add defs for gate/locksmith/signpost**

`src/core/mechanics/defs/gate.ts`

```ts
import { onEnterGate } from '../../tiles/onEnterGate'
import type { MechanicDef } from '../types'

export const gateMechanic: MechanicDef = {
  id: 'gate',
  kinds: ['gate', 'gateOpen'],
  onEnter: onEnterGate,
}
```

`src/core/mechanics/defs/locksmith.ts`

```ts
import { onEnterLocksmith } from '../../tiles/onEnterLocksmith'
import type { MechanicDef } from '../types'

export const locksmithMechanic: MechanicDef = {
  id: 'locksmith',
  kinds: ['locksmith'],
  onEnter: onEnterLocksmith,
}
```

`src/core/mechanics/defs/signpost.ts`

```ts
import { onEnterSignpost } from '../../tiles/onEnterSignpost'
import type { MechanicDef } from '../types'

export const signpostMechanic: MechanicDef = {
  id: 'signpost',
  kinds: ['signpost'],
  onEnter: onEnterSignpost,
}
```

- [ ] **Step 2: Run the unit tests**

Run: `npm test -- tests/core/mechanics.registry.test.ts`  
Expected: PASS.

---

### Task 5: Add mechanic defs (farm/camp)

**Files:**
- Create: `src/core/mechanics/defs/farm.ts`
- Create: `src/core/mechanics/defs/camp.ts`

- [ ] **Step 1: Add defs for farm/camp**

`src/core/mechanics/defs/farm.ts`

```ts
import { onEnterFarm } from '../../tiles/onEnterFarm'
import type { MechanicDef } from '../types'

export const farmMechanic: MechanicDef = {
  id: 'farm',
  kinds: ['farm'],
  onEnter: onEnterFarm,
}
```

`src/core/mechanics/defs/camp.ts`

```ts
import { onEnterCamp } from '../../tiles/onEnterCamp'
import type { MechanicDef } from '../types'

export const campMechanic: MechanicDef = {
  id: 'camp',
  kinds: ['camp'],
  onEnter: onEnterCamp,
}
```

- [ ] **Step 2: Run the unit tests**

Run: `npm test -- tests/core/mechanics.registry.test.ts`  
Expected: PASS.

---

### Task 6: Add mechanic defs (henge/town)

**Files:**
- Create: `src/core/mechanics/defs/henge.ts`
- Create: `src/core/mechanics/defs/town.ts`

- [ ] **Step 1: Add defs for henge/town**

`src/core/mechanics/defs/henge.ts`

```ts
import { onEnterHenge } from '../../tiles/onEnterHenge'
import type { MechanicDef } from '../types'

export const hengeMechanic: MechanicDef = {
  id: 'henge',
  kinds: ['henge'],
  onEnter: onEnterHenge,
}
```

`src/core/mechanics/defs/town.ts`

```ts
import { onEnterTown } from '../../tiles/onEnterTown'
import type { MechanicDef } from '../types'

export const townMechanic: MechanicDef = {
  id: 'town',
  kinds: ['town'],
  onEnter: onEnterTown,
}
```

- [ ] **Step 2: Run the unit tests**

Run: `npm test -- tests/core/mechanics.registry.test.ts`  
Expected: PASS.

---

### Task 7: Add central `MECHANICS` list

**Files:**
- Create: `src/core/mechanics/index.ts`

- [ ] **Step 1: Add `MECHANICS` in one place**

`src/core/mechanics/index.ts`

```ts
import type { MechanicDef } from './types'
import { gateMechanic } from './defs/gate'
import { locksmithMechanic } from './defs/locksmith'
import { signpostMechanic } from './defs/signpost'
import { farmMechanic } from './defs/farm'
import { campMechanic } from './defs/camp'
import { hengeMechanic } from './defs/henge'
import { townMechanic } from './defs/town'

export const MECHANICS: readonly MechanicDef[] = [
  gateMechanic,
  locksmithMechanic,
  signpostMechanic,
  farmMechanic,
  campMechanic,
  hengeMechanic,
  townMechanic,
] as const
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck:test`  
Expected: PASS.

---

### Task 8: Route tile-enter dispatch through mechanics registry

**Files:**
- Modify: `src/core/tiles/registry.ts`

- [ ] **Step 1: Replace hardcoded map with derived index**

```ts
import { onEnterDefaultTerrain } from './onEnterDefaultTerrain'
import type { TileEnterHandler } from './types'
import type { CellKind } from '../types'
import { MECHANICS } from '../mechanics'
import { buildMechanicIndex } from '../mechanics/registry'

const { onEnterByKind } = buildMechanicIndex(MECHANICS)

export function getOnEnterHandler(kind: CellKind): TileEnterHandler {
  return onEnterByKind[kind] || onEnterDefaultTerrain
}
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`  
Expected: PASS.

---

### Task 9: Full verification

- [ ] **Step 1: Run `npm run verify`**

Run: `npm run verify`  
Expected: PASS.

- [ ] **Step 2: Ask for commit approval**

Ask the user whether to commit Phase 1 as a separate commit.

---

## Next phases (not in Phase 1)

- Phase 2: `startEncounterByKind` extraction (camp/town first).
- Phase 3: `rightGridByEncounterKind` extraction.
- Phase 4: `mapLabelByKind` extraction.
- Phase 5: `rollMoveEvent` wrapper + v0.5 global pool.

## Review checklist

- Tile-enter behavior unchanged (existing acceptance tests still green).
- Duplicate mechanic ids fail loudly.
- Duplicate kind ownership fails loudly (even if onEnter missing).
- No new registry list ordering semantics introduced.

