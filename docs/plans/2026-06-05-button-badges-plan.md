# Button badges & illustration swap — Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints.

**Design reference:** [`docs/plans/2026-06-05-button-badges-design.md`](2026-06-05-button-badges-design.md)

## Context

**Prompt:** Move shop/combat price and stat info from left-panel preview plates onto right-grid cell badges; swap illustration sprites; retire preview plates; update terminal renderer.

**Reasoning:** Per-button badges colocate cost with action; `illustrationSpriteId` vs center `tilePreview` removes plate/grid ordering coupling; registry and renderer changes follow UI intermezzo patterns.

## Scope Baseline

**Paraphrase (from design):**
- Badges on action cells; universal illustration swap; preview plate retirement; terminal parity; grid gap 4 (kept after playtest); combat flee badge; camp Search unbadged.

**Narrowed-to:**
- Focus: Phase 1 per design definition of done.
- Deferred: Phase 2 illustration transitions + lore stagger.
- Reason: ship badges and swap first.

**Confirmed:** 2026-06-05

---

**Goal:** Replace preview plates with cell badges and encounter illustration swap across TIC and terminal.

**Use case:** Player opens a town or combat modal and sees prices/stats on buttons, large encounter art on the left, small terrain tile in the grid center.

**Non-goals:**
- Left-panel illustration animation (phase 2).
- Lore line stagger.
- Button-anchored gold/food/army deltas (stats column unchanged except `enemyArmy` → Fight badge).
- Combat fallback strip (constant-gated escape hatch only if playtest fails).

**Architecture:** Extend `RightGridCellDef` + `makeRightGrid`; mechanic offer tables supply badges; TIC `actionCellOps` draws border+badge together; registry drops preview-plate indexes, adds `deltaAnchorsByTarget` on combat.

**Tech Stack:** TypeScript core + TIC-80 render plan + terminal render + vitest.

**Complexity Budget (soft defaults):**
- <= 3 changed source files per task (excluding tests)
- No new runtime dependencies
- No new abstraction with fewer than 2 callers

**TDD during implementation:** waive — experimental UI likely to iterate after first ship; implement first, add spot tests at end

**ATDD during implementation:** waive — design GWT specs remain the behavioral contract; no per-spec acceptance file; migrate existing tests only

---

## Testing strategy (relaxed)

**Budget:** ~8–12 new/changed test cases total — not one test per GWT spec, not RED-before-every-task.

| Keep / migrate | Drop |
|----------------|------|
| Update `v0.5` / `v0.6` acceptance where they assert `previewPlate` → assert `.badge` on grid cells | Delete `previewPlate.test.ts` (replace with one small file, not 11 `it`s) |
| One consolidated `rightGrid.badges.test.ts` (~5 cases: town price, camp search vs scout, combat fight/pay/return, center tilePreview, illustration id) | Separate `button-badges.acceptance.test.ts` mirroring every GWT |
| Update 2–3 terminal `render.test.ts` cases (suffix format, no plate bracket) | Hit-test file (S9 — existing `hitTestGridCell` behavior unchanged; manual verify) |
| Fix `mechanics.registry.test.ts` for registry shape | Parameter sweeps per encounter kind |

**Verification gate:** `npm run verify` + manual TIC smoke (town, combat, camp search, locksmith) before calling phase 1 done. Tweak badges/colors in constants without test churn.

**After UI stabilizes:** optionally add GWT acceptance tests per design doc if the experiment sticks.

---

## Documentation reviewed

- `docs/plans/2026-06-05-button-badges-design.md`
- `docs/plans/2026-05-30-ui-intermezzo-design.md`
- `docs/the-unbound-learnings.md`
- N/A — no `docs/decisions/INDEX.md` in repo

---

## Spec Traceability

Design GWT specs (S1–S11) guide manual smoke and the consolidated test file — **not** a 1:1 automated mapping.

| Spec | Behavior | Task(s) | Automated |
| ---- | -------- | ------- | --------- |
| S1–S2 | Shop price + illustration swap | T4, T8–T10 | `rightGrid.badges` town cases |
| S3–S4 | Camp search / scout | T5 | `rightGrid.badges` camp cases |
| S5 | Locksmith dual prices | T6 | `rightGrid.badges` locksmith case |
| S6–S8 | Combat badges + leave free at PoI | T7 | `rightGrid.badges` + v0.5/v0.6 migrate |
| S7 | Pay when eligible | T7 | one case in `rightGrid.badges` |
| S9 | Badge click no action | — | manual (unchanged hit test) |
| S10–S11 | Terminal suffixes | T11 | `render.test.ts` |

---

## File structure (phase 1)

| File | Responsibility |
|------|----------------|
| `src/core/rightGrid.ts` | Export `CellBadge`; extend `RightGridCellDef` |
| `src/core/mechanics/encounterHelpers.ts` | `makeRightGrid` split, `encounterIllustrationSpriteId`, drop plate helpers |
| `src/core/mechanics/types.ts` | Remove plate types; add `DeltaAnchorSpec`, `deltaAnchorsByTarget` on encounter |
| `src/core/mechanics/registry.ts` | Drop plate indexes; index `deltaAnchorsByTarget`, `illustrationByEncounterKind` |
| `src/core/mechanics/defs/{town,camp,farm,locksmith,combat}.ts` | Badges + `illustrationSpriteId` |
| `src/core/mechanics/defs/{wyrm,mountain,woods,henge}.ts` | Replace `previewPlateLines` with badge helpers on variant |
| `src/platform/tic80/layout.ts` | `CELL_GAP_PX`, `GRID_ORIGIN_*` |
| `src/platform/tic80/uiConstants.ts` | Badge colors |
| `src/platform/tic80/rightGridRenderPlan.ts` | `actionCellOps`, badge draw ops |
| `src/platform/tic80/render.ts` | Illustration swap, drop plate chrome, grid delta anchors |
| `src/platform/terminal/render.ts` | Badge suffixes; drop plate section |
| `tests/core/rightGrid.badges.test.ts` | Consolidated badge + swap unit tests (~5 cases) |
| `tests/platform/terminal/render.test.ts` | Terminal suffix updates (2–3 cases) |

---

## Chunk 1: Core model + grid factory

### Task 1: CellBadge types + makeRightGrid split

**Use case:** Encounter grid cells can carry optional badge metadata resolved at the same time as sprite/action.

**Non-goals:** TIC drawing; mechanic-specific badge text.

**Files:**
- Modify: `src/core/rightGrid.ts`
- Modify: `src/core/mechanics/encounterHelpers.ts`

- [ ] **Step 1: Implement** (see design § Architecture)

In `src/core/rightGrid.ts`:

```typescript
export type CellBadge = { variant: 'price' | 'left'; text: string }

export type RightGridCellDef = {
  spriteId?: number
  tilePreview?: RightGridTilePreview
  action?: Action | null
  badge?: CellBadge
}
```

In `encounterHelpers.ts`:
- Rename `centerSpriteId` → `illustrationSpriteId` on `RightGridSpec`.
- Extend `RightGridActionCell` with optional `badge?: CellBadge`.
- Add optional `leaveBadge?: CellBadge | ((s: State) => CellBadge | null)` on `RightGridSpec`.
- Change `makeRightGrid` return type to `{ provider: RightGridProvider; illustrationFor: (s: State) => number }`.
- Center cell (1,1): `{ tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null }`.
- Leave cell (1,2): attach `leaveBadge` when present.

- [ ] **Step 2: `npm run build`** — expect mechanic def compile errors until Chunk 2.

- [ ] **Step 3: Ask for commit approval**

---

### Task 2: encounterIllustrationSpriteId + registry illustration index

**Files:**
- Modify: `src/core/mechanics/encounterHelpers.ts`
- Modify: `src/core/mechanics/registry.ts`
- Modify: `src/core/mechanics/types.ts`

- [ ] **Step 1: Implement**

Add `illustrationSpriteId?: (s: State) => number` on `MechanicEncounter`; registry indexes `illustrationByEncounterKind`.

```typescript
export function encounterIllustrationSpriteId(s: State): number | null {
  const enc = s.encounter
  if (!enc) return null
  return MECHANIC_INDEX.illustrationByEncounterKind[enc.kind]?.(s) ?? null
}
```

- [ ] **Step 2: Ask for commit approval**

---

### Task 3: Retire preview-plate types from mechanic types + registry

**Files:**
- Modify: `src/core/mechanics/types.ts`
- Modify: `src/core/mechanics/registry.ts`
- Modify: `tests/core/mechanics.registry.test.ts` (update expectations only)

- [ ] **Step 1: Implement** — remove plate hooks; add `deltaAnchorsByTarget`, `DeltaAnchorSpec`; update registry test.

- [ ] **Step 2: Batch Chunk 2 mechanic defs** in same session so tree compiles.

- [ ] **Step 3: Ask for commit approval**

---

## Chunk 2: Mechanic defs

### Task 4: Town + farm badges and illustration swap

**Files:** `town.ts`, `farm.ts`

- [ ] Implement badge on offer slots; `illustrationSpriteId` on encounter; remove preview plate providers.

- [ ] Ask for commit approval

---

### Task 5: Camp badges (Search none, scout price)

**Files:** `camp.ts`

- [ ] Implement; delete `campSearchPreviewPlate` entirely (no badge on search).

- [ ] Ask for commit approval

---

### Task 6: Locksmith dual price badges

**Files:** `locksmith.ts`

- [ ] Implement static price badges on gold/food pay buttons.

- [ ] Ask for commit approval

---

### Task 7: Combat badges + variant cleanup + delta anchors

**Files:** `combat.ts`, `wyrm.ts`, `mountain.ts`, `woods.ts`, `henge.ts`

- [ ] Implement fight/pay/return badges per design; `deltaAnchorsByTarget`; remove all `previewPlateLines` from variants.

- [ ] Ask for commit approval

---

## Chunk 3: TIC platform

### Task 8: Layout + badge constants

**Use case:** 6px gap fits 7px badges; grid stays centered.

**Non-goals:** Badge drawing logic.

**Files:**
- Modify: `src/platform/tic80/layout.ts`
- Modify: `src/platform/tic80/uiConstants.ts`

- [ ] **Step 1: Update constants**

```typescript
// layout.ts — shipped: gap 4 (playtest preferred; shorter move-slide distance)
export const CELL_GAP_PX = 4
// GRID_ORIGIN_* derived: centered in right panel avail band (no manual −2 offset)
```

```typescript
// uiConstants.ts — pill badges (#310/#311), see design addendum for glyph advance
export const UI_BADGE_HEIGHT_PX = 7
export const UI_BADGE_PAD_X = 2
export const UI_BADGE_PAD_RIGHT = 1
export const UI_BADGE_OFFSET_X = 1
export const UI_BADGE_OFFSET_Y = 4  // pair with CELL_GAP; ≈ HEIGHT − GAP for flush fill
```

- [ ] **Step 2: Visual smoke** — `npm run dev` (manual): grid centered, no overlap.

- [ ] **Step 3: Ask for commit approval**

---

### Task 9: rightGridRenderPlan — actionCellOps + badges

**Use case:** Badges appear with button borders during grid cross-reveal.

**Non-goals:** Left panel changes.

**Specs addressed:** S1, S6 (visual)

**Files:**
- Modify: `src/platform/tic80/rightGridRenderPlan.ts`
- Extend ops type with `{ kind: 'print', x, y, text, color }` if not present

- [ ] **Step 1: Extend `RightGridRenderOp` union** with badge rect + print ops.

- [ ] **Step 2: Implement `badgeOpsForCell(row, col, badge)`** — 7px rect above cell top, left +1px, colors from variant.

- [ ] **Step 3: Refactor `borderOpsForCell` → `actionCellOps`** — border + badge when `viewForCell` returns badge from def.

- [ ] **Step 4: Thread badge from `getRightGridCellDef`** in `viewForCell` / static plan builder (read `def.badge` alongside category).

- [ ] **Step 5: Verify** — `npm test` (no new test required; covered by acceptance in T12).

- [ ] **Step 6: Commit approval**

**Note:** `viewForCell` must resolve full `RightGridCellDef` including badge, not just `CellView`. Extend `CellView` or parallel lookup.

---

### Task 10: render.ts — illustration swap, drop plate, grid delta anchors

**Use case:** Left panel shows encounter art; enemyArmy deltas fly from Fight badge.

**Non-goals:** Stats-column army/gold/food delta changes.

**Specs addressed:** S2, S6

**Files:**
- Modify: `src/platform/tic80/render.ts`

- [ ] **Step 1: Replace illustration source**

```typescript
import { encounterIllustrationSpriteId } from '../../core/mechanics/encounterHelpers'

// in drawLeftPanel else branch (non-minimap/map/sprite/gameover):
const illSpriteId = encounterIllustrationSpriteId(s) ?? spriteIdAtPos
drawIllustrationWithTextureOverlay(illSpriteId, illX, illY)
// DELETE preview plate block (lines ~279-288)
```

- [ ] **Step 2: Grid delta anchors from registry**

Replace `plateAnchorsFromSpecs` usage with `deltaAnchorsFromGridSpecs(specs, s, hints)` mapping `{row,col}` → badge pixel anchor via shared layout helper exported from `rightGridRenderPlan.ts` or duplicated cell origin math.

- [ ] **Step 3: Delete dead code** — `drawPreviewPlateChrome`, `PlateGeometry`, `plateAnchorsFromSpecs` if unused.

- [ ] **Step 4: `npm test` + manual dev smoke**

- [ ] **Step 5: Commit approval**

---

## Chunk 4: Terminal, acceptance, cleanup

### Task 11: Terminal render badges

**Files:** `src/platform/terminal/render.ts`

- [ ] Implement `formatBadgeSuffix` in `gridLabel`; drop plate bracket from `renderEncounter`.

- [ ] Ask for commit approval

---

### Task 12: Migrate tests (end of implementation, not TDD)

**Files:**
- Create: `tests/core/rightGrid.badges.test.ts` (~5 `it`s — town, camp, locksmith, combat, illustration)
- Delete: `tests/core/previewPlate.test.ts`
- Modify: `tests/core/v0.5-the-wyrm.acceptance.test.ts`, `tests/core/v0.6-combat.acceptance.test.ts` — `.badge` not `previewPlate`
- Modify: `tests/platform/terminal/render.test.ts` — 2–3 suffix cases

- [ ] Write consolidated tests after Chunks 1–3 land (copy fixtures from deleted previewPlate file).

- [ ] `npm test` — all green

- [ ] Ask for commit approval

---

### Task 13: Bundle + docs + verify

**Use case:** Shipped cart matches TypeScript; learnings doc reflects new hooks.

**Non-goals:** Phase 2 backlog implementation.

**Files:**
- Regenerate: `the-unbound.js` via `npm run build`
- Modify: `docs/the-unbound-learnings.md` — replace previewPlate hook bullets with badge/cell def + `deltaAnchorsByTarget`
- Modify: `docs/backlog.md` — mark line 27 idea as in progress/done if applicable

- [ ] **Step 1: `npm run verify`**
Expected: build + typecheck + all tests PASS

- [ ] **Step 2: Update learnings** mechanic encounter hooks list.

- [ ] **Step 3: Update design doc** if any implementation detail shifted (living doc rule).

- [ ] **Step 4: Ask for commit approval**

---

## Risks

| Risk | Mitigation |
|------|------------|
| Chunk 2 blocked by Chunk 1 registry type break | Run T3+T4 in same batch or use temporary `@ts-expect-error` max one commit |
| `viewForCell` lacks badge | Task 9 explicitly extends cell resolution |
| Grid transition shows badge before sprite | Badge ops use same phase gate as borders (intermezzo KD3) |
| Wyrm acceptance breaks on plate removal | Task 12 migrates v0.5/v0.6 |
| UI tweak after ship breaks tests | Minimal test budget; constants-only tuning |

## ADR / decision record

waived — covered in design doc — 2026-06-05

---

## Chunk 5: Lore message system + camp enter (2026-06-05)

**Scope:** Unified title/body helpers; camp enter lines; combat pay/flee/victory keeps PoI title.

**Files:**
- `src/core/mechanics/encounterHelpers.ts` — `poiTitleFor`, `loreMessage`, `openNamedPoiEncounter`, `combatLoreMessage`
- `src/core/lore.ts` — `CAMP_ENTER_LINES`
- `src/core/mechanics/defs/{town,farm,camp,henge,combat}.ts`
- `tests/core/encounterHelpers.test.ts`
- `docs/plans/2026-06-05-button-badges-design.md` addendum

**Acceptance:**
- Camp enter shows title + lore line (stable per camp id).
- Henge/wyrm combat pay/flee/victory keeps titled restoreMessage.
- `npm run verify` green.
