# Refactor: render decoupling + worldgen plugins

**Date**: 2026-05-28
**Supersedes**: nothing (operationalizes [docs/refactor-mechanics-encounters-worldgen.md](../refactor-mechanics-encounters-worldgen.md))

## Goal

End state: adding a new PoI mechanic = one file in `src/core/mechanics/defs/` + register it. No edits to `render.ts`, `signpost.ts`, `rightGridRenderPlan.ts`, or `world.ts`.

Two phases, in order. Phase B (precursor) first because it's smaller, lower-risk, and immediately removes the "edit 4 unrelated files" tax for the upcoming slot/Lair/Crossing work. Phase A (worldgen) is the bigger lift and gates Lair + Crossing placement cleanly.

References: [docs/refactor-mechanics-encounters-worldgen.md](../refactor-mechanics-encounters-worldgen.md), [docs/the-unbound-learnings.md](../the-unbound-learnings.md).

## Phase B (precursor): render & PoI decoupling

### B1. `previewPlate` per mechanic

Add to `MechanicDef` ([src/core/mechanics/types.ts](../../src/core/mechanics/types.ts)):

```ts
previewPlate?: (s: State) => readonly { spriteId: number; text: string; color: number }[] | null
```

Indexed in `buildMechanicIndex` as `previewPlateByEncounterKind`.

Move each branch out of [src/platform/tic80/render.ts](../../src/platform/tic80/render.ts):

- `combatMechanic.previewPlate`: return single line `{ spriteId: SPRITES.stats.enemy, text: '${enemyArmy}', color: UI_COLOR_TEXT }`. The animated `target: 'enemyArmy'` delta overlay stays in render.ts as a separate pass keyed off the anim queue (no change to its mechanism).
- `campMechanic.previewPlate`: replaces the `computeCampPreviewModel` + the 3 lines built inline at render.ts:227-263. Returns 0–3 lines using existing `CAMP_FOOD_GAIN`/army-gain/scout-cost logic.
- `townMechanic.previewPlate`: replaces render.ts:264-309. One line per offer in `town.offers`.
- `farmMechanic.previewPlate`: replaces render.ts:310-340. Two lines (food + beast).
- `locksmithMechanic.previewPlate`: replaces render.ts:341-369. Two lines (gold + food).

Render.ts collapses to a single loop:

```ts
} else if (encounterKind) {
  drawIllustrationWithTextureOverlay(spriteIdAtPos, illX, illY)
  const lines = previewPlateByEncounterKind[encounterKind]?.(s)
  if (lines?.length) drawPreviewPlateChrome(lines, illX, illY, illSize)
  if (encounterKind === 'combat') drawEnemyArmyDeltaOverlay(s, /* plate anchor */)
}
```

`drawPreviewPlateChrome` is extracted from the duplicated plate-drawing in render.ts (same shape across all four branches today).

Delete `computeCampPreviewModel` (moves into camp.ts as internal helper for the previewPlate).

### B2. PoI signpost contributions

Add to `MechanicDef`:

```ts
poiSignpost?: {
  rank: number
  // `cell` is narrowed to the specific Cell variant for this mechanic's kinds
  name: (cell: Cell) => string
}
```

Register on: gate (rank 0), locksmith (rank 10), farm (rank 20), town (rank 30), camp (rank 40), henge (rank 50). Multiples of 10 leave room to slot future PoIs (e.g. Lair, Crossing) between existing ranks without renumbering every file. gateOpen handled by gate mechanic's `kinds: ['gate', 'gateOpen']`.

Refactor [src/core/signpost.ts](../../src/core/signpost.ts): drop the hardcoded `PoiKind` union, the inline `POI_KIND_RANK` map, and the `switch (cell.kind)` candidate builder. Iterate `MECHANIC_INDEX.poiSignpostByKind` instead. The min-distance + tie-break algorithm stays put.

### B3. `rightGridRenderPlan` mode iteration

Add to `MechanicDef`:

```ts
previewEncounter?: () => Encounter
```

Each mechanic with an `encounterKind` returns its grid-transition synthesis stub (the `{ kind: 'town', sourceCellId: -1, restoreMessage: '' }` literals currently inlined at [src/platform/tic80/rightGridRenderPlan.ts](../../src/platform/tic80/rightGridRenderPlan.ts):56-63).

`spriteIdForModeCrossCell` loses its hardcoded mode-string union; type becomes `'blank' | 'overworld' | EncounterKind`. Body becomes:

```ts
const encounter = mode === 'blank' || mode === 'overworld' ? null : previewEncounterByKind[mode]?.() ?? null
```

`GridTransitionAnim.params` in [src/core/types.ts](../../src/core/types.ts) also loses its hardcoded mode union — becomes `'blank' | 'overworld' | EncounterKind`.

### B4. Test updates

- `tests/core/rightGrid.camp.test.ts` / `rightGrid.town.test.ts`: still pass (no API change to `getRightGridCellDef`).
- New focused tests: `tests/core/previewPlate.test.ts` covering each mechanic's `previewPlate` shape (no rendering involved).
- `tests/core/signpost.test.ts`: still passes (algorithm unchanged); add one test that "removing a mechanic's `poiSignpost` removes it from candidates" to lock the contract.

## Phase A: worldgen as plugins

### A1. Hook surface

Add to `MechanicDef`:

```ts
placeWorld?: (ctx: { cells: CellGrid; rngState: number; seed: number }) => { rngState: number }
```

Register a shared helper in [src/core/cells.ts](../../src/core/cells.ts):

```ts
export function findCellByKind(cells: CellGrid, kind: CellKind): Vec2 | null
```

Used by gate + locksmith (peer-aware placement).

### A2. Worldgen runner

[src/core/world.ts](../../src/core/world.ts) `generateWorld` shrinks to:

```ts
export function generateWorld(seed: number): GeneratedWorld {
  let rngState = RNG.createStreamRandomFromSeed(seed).rngState
  const base = generateBaseTerrainCells(rngState)
  rngState = base.rngState
  const cells = base.cells

  for (const m of MECHANICS) {
    if (!m.placeWorld) continue
    const r = m.placeWorld({ cells, rngState, seed })
    rngState = r.rngState
  }

  const startPick = pickStart({ rngState })
  rngState = startPick.rngState
  // ...build World, return GeneratedWorld
}
```

`placeFeature`/`placeNamedFeature`/`placeNamedFeatureRng`/`isTerrainCell`/`torusManhattanDistance`/`clampMinTorusDistance` move to a new `src/core/mechanics/worldgenHelpers.ts` (or stay exported from `world.ts` and imported by defs — pick whichever feels cleaner once we're in the code; the cyclic-import risk is low because defs don't import from world.ts today).

Comment at the `MECHANICS` declaration in [src/core/mechanics/index.ts](../../src/core/mechanics/index.ts):

```ts
// MECHANICS array order is also worldgen placement order. Gate/Locksmith are
// peer-aware so their relative order doesn't matter for correctness, but
// reordering changes RNG state advance points → different world layouts.
```

### A3. Migration order (one mechanic per commit)

Smallest first, peer-aware last:

1. **signpost** — terrain-only, no constraints
2. **fishingLake** — terrain-only, ID + cooldown
3. **rainbowEnd** — two ends, second constrained by first; self-contained, no peer mechanic
4. **henge** — named, ID + cooldown
5. **camp** — named, ID + cooldown
6. **farm** — named, beast-gold RNG
7. **town** — named, offers + prices + "first town must offer scout" rule (rule moves into town's placer; counter lives as a closure inside `placeWorld`)
8. **gate** — peer-aware: if `findCellByKind(cells, 'locksmith')` returns a position, respect min-distance; else place freely
9. **locksmith** — same shape, mirrored

After each step: re-run determinism golden snapshot (see A4).

### A4. Determinism harness (added BEFORE A3 starts)

New `tests/core/world.determinism.test.ts`:

```ts
import { generateWorld } from '../../src/core/world'

function serializeLayout(world): string {
  // Stable serialization: list non-terrain cells as `${y},${x}:${cell.kind}:${cell.name ?? ''}:${cell.id ?? ''}`
  // sorted by (y, x). Plus seed and the final rngState (catches RNG advance drift).
  // ...
}

const SEEDS = [12345, 999, 1]
for (const seed of SEEDS) {
  it(`seed ${seed}: layout matches golden`, () => {
    expect(serializeLayout(generateWorld(seed).world)).toMatchSnapshot()
  })
}
```

Run once on `main` BEFORE phase A starts to capture goldens. Then re-run after each migration step. Any drift = either a real intentional change (regenerate snapshot deliberately) or a regression (debug).

### A5. Reorder MECHANICS to match current placement order

Today: `gate, locksmith, signpost, farm, camp, henge, town, terrainHazards, combat, fishingLake, rainbowEnd`

Target (matches world.ts placeFeature sequence; preserves RNG sequence exactly):

```
gate, locksmith, farm, camp, town, henge, signpost, fishingLake, rainbowEnd, terrainHazards, combat
```

terrainHazards and combat have no `placeWorld`, so their position is RNG-neutral but keep them at the end for "non-PoI mechanics last".

This reorder happens as part of A2 (worldgen runner enabled) — before that, MECHANICS order doesn't affect generation.

## Sequencing and risk

- Phase B and Phase A are landable independently (no shared API). B ships first, in 3 chunks (B1, B2, B3). A ships second, in 9+1+1 chunks (determinism harness, then 9 migration commits, then the world.ts cleanup commit).
- Phase B doesn't touch RNG → no determinism risk → existing world tests catch nothing because nothing world-shaped moves.
- Phase A is determinism-sensitive → the golden snapshot test is the safety net.
- Combined diff size: ~600 LOC moved (most of it across-file moves, not net new logic).

## Explicitly out of scope

- Combat preview's animated enemy-delta primitive: stays in render.ts; future "animation hooks per mechanic" tracked in [docs/backlog.md](../backlog.md).
- Defensive `cell.kind` re-checks in `onEnterTile` handlers: already in backlog cleanup notes.
- `placeFeature` attempt-budget hardening: noted as risk in [docs/refactor-mechanics-encounters-worldgen.md](../refactor-mechanics-encounters-worldgen.md); defer until/unless we see hangs.
- `sourceKind` cleanup on non-combat encounters: already done (only `CombatEncounter` has it today).

## Doc updates at end

- Mark Stage B precursor + Stage B as DONE in [docs/refactor-mechanics-encounters-worldgen.md](../refactor-mechanics-encounters-worldgen.md).
- Add a one-liner to [docs/the-unbound-learnings.md](../the-unbound-learnings.md) under "Mechanics live in mechanic modules" capturing the new hooks (`previewPlate`, `poiSignpost`, `previewEncounter`, `placeWorld`).

## Review Feedback Incorporated (2026-05-29)

Independent review + manual human review surfaced these follow-ups; all in scope of this refactor since they're cleanup of code the refactor touched.

### C1. `MechanicDef` discriminated union (kills runtime cross-field throws)

Replace `MechanicDef`'s flat encounter fields with a nested `encounter?: { kind, reduceAction, rightGrid, previewPlate, previewEncounter }` block. Type system then guarantees "any encounter hook can only exist alongside `kind`" — the four `if (m.X && !m.encounterKind) throw` checks in `registry.ts` become unreachable and get deleted. Touches: `types.ts` (the type), `registry.ts` (the loop), 5 encounter defs (combat, camp, town, farm, locksmith — wrap fields under `encounter:`).

### C2. `combat.previewPlate` uses `as CombatEncounter` cast

Drop the `if (!enc || enc.kind !== 'combat') return null` defensive guard — the dispatch contract already guarantees `s.encounter.kind === 'combat'` when this fires. Match the cast pattern camp/town/farm/locksmith already use.

### C3. Strip `| 0` numeric coercions from preview-plate text formatting

8 occurrences across `locksmith.ts` (2), `farm.ts` (2), `town.ts` (4), `combat.ts` (1). All read typed `number` fields; the bitwise-OR-zero is pure slop.

### C4. Delete `CombatEncounter.sourceKind` entirely

Originally scoped as "make optional" — but grep confirmed nobody reads the field anywhere in `src/`. It was a dead write-only field. Deleted from the type, the `startCombatEncounter` arg signature, and the 3 write sites (henge, terrainHazards, the placeholder) plus 5 test fixtures.

### C5. Delete `mechanics/types.ts` re-export of `EncounterKind` / `GridFromKind` / `GridToKind`

Update the 2 callers (`registry.ts`, `encounterHelpers.ts`) to import from `core/types.ts` directly. The re-export is a back-compat aid that nobody needs.

### C6. Rename UI constants to reflect generic use

- `UI_COMBAT_PREVIEW_PLATE_PAD` → `UI_PREVIEW_PLATE_PAD`
- `UI_COMBAT_PREVIEW_PLATE_W` → `UI_PREVIEW_PLATE_W`
- `UI_COMBAT_PREVIEW_PLATE_INSET` → `UI_PREVIEW_PLATE_INSET`
- `UI_FOOD_VALUE_OFFSET_X` → `UI_ICON_VALUE_OFFSET_X`
- `UI_FOOD_VALUE_OFFSET_Y` → `UI_ICON_VALUE_OFFSET_Y`

Combat was the first encounter and food the first stat with a value display; the constants outlived their namesakes.

### C7. Consolidate delta-overlay rendering

Two structurally-identical passes in `render.ts` (the enemyArmy plate overlay and the stats-bar army/food/gold overlay) collapse into one `drawDeltaOverlays(s, anchors)` helper. Per-target semantics (enemyArmy = negative delta is good, others = positive delta is good) encoded in the anchor descriptor as `goodSign?: 1 | -1`.

Note: the *enqueue* side was already unified — all delta animations (including `target: 'enemyArmy'`) go through `enqueueDeltas` (`combat.ts:202`, etc.). C7 only consolidated the rendering side. Stale comment at `combat.ts:69` ("delta overlay is rendered ... as a separate pass") rewritten to match.

### Punted (explicitly)

- Inlining `GridFromKind` / `GridToKind` — cosmetic only, not worth touching every call site.
- Removing `worldgen.ts` as a separate file — its purpose is to break a structural import cycle between `world.ts` (which transitively imports all defs) and the defs (which need `placeFeature`). One extra file is a fair price for cycle-impossibility-by-construction.
