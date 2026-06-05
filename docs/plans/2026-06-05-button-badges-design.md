# Button badges & illustration swap — design

## Context

**Prompt:** Move shop/combat price and stat info from left-panel preview plates onto right-grid cell badges; swap illustration sprites so encounters show big center art on the left and small terrain tiles in the grid center; retire preview plates; keep camp Search unbadged; update terminal renderer for parity.

**Reasoning:** Preview plates obscure the left illustration and force the player to read a separate UI region for costs. Per-button badges colocate price with action, eliminate plate/grid ordering coupling, and set up future overworld event illustrations (stranger, loot) without disrupting the sliding terrain cross. Approach 1 — badge on `RightGridCellDef` — keeps badges on the same visibility clock as button borders.

---

## Scope Baseline

**Paraphrase (from brainstorm):**
- Replace preview plates with top badges on action cells (7px chrome: 5px digits + 1px pad each side).
- Universal encounter sprite swap: left illustration = big encounter art (`illustrationSpriteId`, with grain); center grid cell = small map tile (no grain).
- Shop/locksmith/farm/town: `price` badges (grey bg, white text). Combat Fight: `left` badge (red bg, white text). Combat Pay + Return: `price` badge. Camp Search: no badge.
- Grid spacing: gap 4→6px, origin shift (−2, −2) to re-center.
- Badges render in the button pass (border + badge ops together); sprites stay separate (move-slide compatibility).
- Hit testing unchanged: 24×24 cell interior only; badge overflow does not trigger actions.
- Delta popups: `enemyArmy` retarget to Fight `left` badge anchor; gold/food/army stay on stats column in phase 1.
- Retire all preview-plate surfaces: encounter hooks, `previewPlateForOffers`, `CombatVariantConfig.previewPlateLines`, left-panel plate chrome.
- Terminal: embed badge text on action labels; drop separate encounter plate section.

**Narrowed-to:**
- Focus: Phase 1 — badges, instant sprite swap, preview-plate retirement, terminal parity.
- Deferred: Phase 2 — left illustration transitions (overworld + modal, ≤15 frames; slide/clamp/dither TBD); lore line stagger (all contexts, capped at move-slide duration).
- Reason: Illustration animation is one problem spanning overworld and modals; shipping badges first avoids coupling to a second animation system.

**Confirmed:** 2026-06-05

**Addendum 2026-06-05 (post audit):** Implementation decisions locked; GWT expanded to 11 specs; `centerSpriteId` → `illustrationSpriteId`; Pay badge eligibility; flee delta anchoring clarified. **Post-ship:** grid stayed at gap **4** (not 6); 80×80 px footprint; pill badges on 8×8 sprites.

---

## Documentation reviewed

- `docs/the-unbound-learnings.md` — mechanic hooks, renderer-consumes-models, animation as progressive enhancement, teach-through-interaction.
- `docs/plans/2026-05-30-ui-intermezzo-design.md` — grid transition / border-sprite lockstep; encounter authoring shape.
- `docs/plans/2026-05-05-mechanics-owned-encounters-design.md` — encounter hook registry.
- `docs/backlog.md` — backlog idea line 27 (prices on buttons); polish item for left-panel animation.
- No `docs/decisions/INDEX.md` in repo; ADR catalogue not consulted.

---

## Overview

### Problem

Left-panel preview plates sit on top of the 64×64 illustration and duplicate information the player needs at the moment of choice. The grid center cell shows a small decorative sprite while the illustration shows the map tile — the opposite of what reads best in shops and combat. Maintaining plate line order in sync with button slot order (`offersInGridOrder`) is fragile.

### Phase 1 outcome

1. **Badges** — optional metadata on `RightGridCellDef`, rendered above the button border in TIC; appended to action labels in terminal.
2. **Sprite swap** — on encounter open (immediate snap, same as today): left panel draws `illustrationSpriteId` at illustration scale; center grid cell draws the map tile at player position at 1× (no grain overlay). Same rule for every encounter kind (town, camp, farm, locksmith, combat).
3. **Preview plate removal** — delete the hook and all left-panel plate chrome; combat stats live on the Fight badge.

Phase 2 (separate milestone) adds left-panel illustration transitions and optional lore stagger — not part of this design's implementation scope.

### Badge semantics (`price` | `left`)

Variant names describe **what the text means** for TIC chrome coloring. **`text` is the full display string everywhere** — no separate resource tag.

| Variant | Meaning | Examples | TIC chrome |
|--------|---------|----------|------------|
| `price` | Cost to press the button | `-3`, `-5`, `-1` | Dark grey bg, white text |
| `left` | Remaining quantity (not a cost) | `8`, `12` | Red bg, white text |

**No `resource` field.** Considered and rejected:

- **Terminal:** append `text` verbatim — e.g. `buy_food (-3)`, `locksmith_pay_food (-5)`, `return (-1)`, `fight [8]`. Action label disambiguates gold vs food; not worth a parallel encoding.
- **Delta animation:** badges are display-only. Deltas are enqueued by reducers after `buy()` / combat resolution via `applyDeltas({ deltas: [...] })` — the reducer already knows targets and amounts. Wiring badge metadata into delta calculation would duplicate truth and desync if a price constant changes. Camp Search outcomes are unknown pre-press — badge cannot drive those deltas anyway.

*Future (out of scope):* fly resource deltas from the **button that was pressed** instead of the stats column. Multi-target purchases (e.g. buy troops: `-5` gold and `+2` army) would need a policy: cost-only from button, fan both popups from button, or keep gains on stats column. `DeltaAnimTarget` already carries the unit; no badge metadata required.

Camp Search deliberately has **no badge** — search is unknown until pressed (*Teach through interaction*).

### Combat Return (flee) badge

Flee (`RETURN`, east cell) always costs 1 army. **Include a `price` badge** `{ text: '-1', variant: 'price' }` on combat Return only (not PoI Leave buttons — those are free).

Rationale: same *Teach through interaction* rule as shop prices — cost visible before press. Bare `-1` is intentionally terse; action context + first press teach the unit. **Phase 1:** the flee `-1` army delta popup still anchors to the **stats column** (unchanged from today); only `enemyArmy` deltas move to the Fight badge. PoI Leave (town/camp/farm) stays unbadged.

### Layout tweak

**Design draft** considered `CELL_GAP_PX` 4 → 6 for badge headroom. **Shipped (playtest):** kept **gap 4** — badges fit in the inter-cell gap; smaller slide distance makes overworld grid transitions feel smoother.

- `CELL_GAP_PX`: **4** (unchanged from pre-badges prototype).
- Grid footprint: `3 × 24 + 2 × 4 = **80**` px. `GRID_ORIGIN_X` / `GRID_ORIGIN_Y`: auto-centered in the right-panel avail band between dividers (no manual −2 px nudge).
- Badge placement: top of cell, `UI_BADGE_OFFSET_X = 1`. Vertical: `UI_BADGE_OFFSET_Y` paired with gap — `≈ UI_BADGE_HEIGHT_PX − CELL_GAP_PX` fills the gap flush (shipped: height 7, gap 4, offset 4 → 3 px of gap used).
- Badge height: 7 px; 8×8 horizontal pill sprites (#310 price, #311 left), not filled rects.

---

## Implementation decisions

Locked during design audit (2026-06-05):

1. **`RightGridSpec` splits illustration from center cell.** Rename today's `centerSpriteId` → `illustrationSpriteId` (left panel only). Encounter center cell always resolves to `tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }` — never the decorative sprite. Overworld center cell unchanged (player tile preview).

2. **`encounterIllustrationSpriteId(s)` lives in core** (`src/core/mechanics/encounterHelpers.ts` or adjacent), resolving from the active encounter's `rightGrid` spec / variant config. TIC `drawLeftPanel` calls it; platform does not duplicate swap logic.

3. **Badges attach in mechanic authoring**, not a second pass in `getRightGridCellDef`. Extend `makeRightGrid` slot resolution and offer action tables (`badgeForOffer`) so each returned action cell may include `badge`. Corner/meta cells never get badges.

4. **Combat Pay badge** follows today's plate rule: show `{ text: '-${cost}', variant: 'price' }` only when `payment.isEligible(enc, resources) === 'ok'`. When Pay is visible but ineligible (goblins, too-many brigands), no Pay badge — same as today's missing recruit-cost plate row.

5. **Delta anchors — single shape.** Replace `previewPlateDeltaAnchors` with `deltaAnchorsByTarget` on the combat encounter config:

   ```typescript
   deltaAnchorsByTarget: {
     enemyArmy: { row: 1, col: 0, goodSign: -1 as const },
   }
   ```

   Renderer maps `{ row, col, goodSign? }` → pixel anchor at that cell's top-badge position. Phase 1: only `enemyArmy` listed; gold/food/army remain on left-panel stats icons.

6. **Retire all plate surfaces**, including `CombatVariantConfig.previewPlateLines`, `enemyCountOnlyPlateLines`, `recruitablePreviewPlateLines`, and `CombatVariantPlateLine` if nothing else references them. Replace with `fightBadge` / `payBadge` helpers on the variant config.

7. **Living doc.** This file is the shipped spec. When implementation diverges or playtest retunes, update the design in place (no changelog sections). Git history holds the narrative.

---

## Architecture

### Core: `RightGridCellDef` extension

```typescript
type CellBadge = { variant: 'price' | 'left'; text: string }

type RightGridCellDef = {
  spriteId?: number
  tilePreview?: RightGridTilePreview
  action?: Action | null
  badge?: CellBadge
}
```

Mechanic offer tables (town, camp, farm) colocate `spriteId`, reducer, and badge fn — refactor today's `previewPlate` → `badgeForOffer(state)` returning `CellBadge | null`. `makeRightGrid` attaches the badge when resolving each action slot (`top` / `left` / `bottom`).

**`RightGridSpec` change:**

```typescript
type RightGridSpec = {
  leaveAction: Action
  illustrationSpriteId: RightGridCenterSprite  // was centerSpriteId
  top?: RightGridActionSlot
  left?: RightGridActionSlot
  bottom?: RightGridActionSlot
}
```

`makeRightGrid` center cell (1,1): always `{ tilePreview: { kind: 'relativeToPlayer', dx: 0, dy: 0 }, action: null }`. Action slots may return `{ spriteId, action, badge? }`.

Combat badges (via variant helpers + `makeRightGrid` slots):
- Fight: `{ text: '${enemyArmySize}', variant: 'left' }` always in combat.
- Pay: `{ text: '-${cost}', variant: 'price' }` when `isEligible === 'ok'`.
- Return: `{ text: '-1', variant: 'price' }` always in combat.

Locksmith: each pay button gets its own `price` badge (`-gold`, `-food`).

**Left panel illustration:** `encounterIllustrationSpriteId(s)` reads `illustrationSpriteId` from the encounter's grid spec when `s.encounter` is set; otherwise tile at player position (overworld / auto mode).

### Retire preview plate hooks

Remove from `MechanicEncounter`:
- `previewPlate`
- `previewPlateDeltaAnchors`

Add on combat encounter only:
- `deltaAnchorsByTarget: Partial<Record<DeltaAnimTarget, { row: number; col: number; goodSign?: 1 | -1 }>>`

Remove from registry: `previewPlateByEncounterKind`, `previewPlateDeltaAnchorsByEncounterKind`.

Remove helpers/types: `previewPlateForOffers`, `offersInGridOrder` (only used for plate ordering today), `PreviewPlateProvider`, `PreviewPlateLine`, `PreviewPlateDeltaAnchor`, and combat `previewPlateLines` on `CombatVariantConfig`.

### TIC render pipeline

`rightGridRenderPlan.ts`:

1. **`actionCellOps(row, col, category, badge?)`** — emits border rect + optional badge rect + text in one call. Invoked for every action/meta cell that has a border today.
2. **`spriteOps`** — unchanged separate pass; move-slide continues to slide sprites only.
3. **Grid transition** — badge ops gated by the same `viewForCell` / cross-reveal phase as borders (already shared). Badge never visible before its button border.

`render.ts` `drawLeftPanel`:
- Drop `drawPreviewPlateChrome` and plate-based delta anchors.
- Encounter illustration: `encounterIllustrationSpriteId(s)` when `s.encounter` is set.
- Delta overlay for `enemyArmy`: anchor from `deltaAnchorsByTarget.enemyArmy` → Fight cell badge geometry. Gold/food/army deltas: stats column (unchanged).

Constants in `uiConstants.ts`:
- `UI_BADGE_PRICE_BG`, `UI_BADGE_PRICE_TEXT` (dark grey / white — tune in implementation).
- `UI_BADGE_LEFT_BG`, `UI_BADGE_LEFT_TEXT` (red / white).
- One-line swap to white bg / black text if playtest prefers.

### Terminal render

`gridLabel(s, def)` appends badge when present:
- `price` → ` (${badge.text})` after action name (e.g. `buy_food (-3)`).
- `left` → ` [${badge.text}]` after action name (e.g. `fight [8]`).

Remove `renderEncounter` plate aggregation (`encounter: combat [enemy 8]`). Encounter kind line may stay as `encounter: combat` for agent orientation, or drop plate bracket entirely — **keep kind line, drop bracket stats**.

### Overworld (unchanged in phase 1)

No encounter → left panel shows tile illustration; grid cross shows adjacent tiles. No badges. move-slide behavior unchanged.

### Fallback (playtest only)

If red `left` badge on Fight is illegible or delta popups fight the cursor, allow a **combat-only minimalist strip** (9 px, text-only, no sprite) on the left illustration — last resort, not phase 1 default. Document in plan as a constant-gated escape hatch, not a second system.

---

## Acceptance Specs (GWT)

```
; Shop price on button
GIVEN the player is visiting a town with a food purchase on the left button.
WHEN the town choices are visible.
THEN the left button shows the food gold cost in a badge above the button.
THEN the left illustration shows no price overlay.

; Shop illustration swap
GIVEN the player is visiting a town.
WHEN the town choices are visible.
THEN the left illustration shows the large town art.
THEN the center cell shows the small map tile at the player's position.

; Camp search stays hidden
GIVEN the player is visiting a camp that offers Search.
WHEN the camp choices are visible.
THEN the Search button has no price badge.

; Camp scout hire shows price
GIVEN the player is visiting a camp that offers Scout hire on a grid button.
WHEN the camp choices are visible.
THEN that hire button shows a price badge with the hire gold cost.

; Locksmith dual prices
GIVEN the player is at the locksmith with both pay options available.
WHEN the locksmith choices are visible.
THEN the gold pay button shows a price badge with the gold cost.
THEN the food pay button shows a price badge with the food cost.

; Combat stats on Fight
GIVEN the player is in combat against enemies.
WHEN the combat choices are visible.
THEN the Fight button shows the remaining enemy count in a left badge above the button.
THEN the Return button shows a price badge of -1 above the button.
THEN the left illustration shows the large enemy art with no price overlay.
THEN the center cell shows the small terrain tile only.

; Combat Pay badge when eligible only
GIVEN the player is in combat where Pay is eligible and affordable.
WHEN the combat choices are visible.
THEN the Pay button shows a price badge with the pay gold cost.

; PoI Leave is free
GIVEN the player is visiting a town.
WHEN the town choices are visible.
THEN the Leave button has no price badge.

; Badge clicks don't fire
GIVEN a shop button with a price badge is visible.
WHEN the player presses above the button border where the badge is drawn.
THEN no purchase occurs.

; Terminal suffix format
GIVEN the player is in a town encounter using terminal play with a food purchase on the left button showing cost -3.
WHEN the screen is rendered.
THEN the left action label includes the text (-3) and not a separate preview plate section.

; Terminal fight count format
GIVEN the player is in combat with 8 enemies remaining using terminal play.
WHEN the screen is rendered.
THEN the fight action label includes [8].
```

**Spec count:** 11 specs covering 11 behaviors

---

## Behavioral Impact

- **Modified behaviors:**
  - `tests/platform/terminal/render.test.ts` — encounter plate bracket → badge suffix on action labels.
  - `tests/core/previewPlate.test.ts` — replaced by `rightGrid.badges.test.ts` on `getRightGridCellDef` / encounter grid providers.
  - `tests/core/v0.6-combat.acceptance.test.ts` — S9 plate assertions → Fight/Pay badge on grid cells.
  - `tests/core/v0.5-the-wyrm.acceptance.test.ts` — plate lines → badge fields.
  - TIC left panel — no plate chrome; `enemyArmy` deltas anchor to Fight badge.
- **New behaviors:** GWT specs above (11 behaviors).
- **Existing tests requiring updates:** files listed above; `mechanics.registry.test.ts` if it asserts preview-plate registry keys.
- **Unaffected:** reducers, combat math, worldgen, keyboard/click action dispatch, overworld move slide.

---

## ATDD Decision

- **ATDD:** waive
- **Reason:** Experimental UI — implement first; GWT specs in design remain manual contract; add automated acceptance later if experiment sticks
- **GWT specs written:** yes (design doc — manual / spot-test only)
- **Spec leakage reviewed:** yes
- **Behavioral impact acknowledged:** yes

**Addendum 2026-06-05:** Implementation waives enforce ATDD/TDD per plan; aligns with learnings.md ~15 tests per milestone guidance.

---

## ADR / decision record

Trigger fired: **public contract change** — `MechanicEncounter` loses `previewPlate` / `previewPlateDeltaAnchors`; `RightGridCellDef` gains `badge`.

Run `/document-decision`? **Waived** — hook swap is fully specified here; no new project-wide convention beyond the cell-badge field. Revisit if a third consumer beyond TIC + terminal appears.

---

## Phase 2 pointer (out of scope)

**Status (2026-06-05):** Phase 1 shipped after playtest; Phase 2 not started. See addendum below and `docs/backlog.md` (polish + deferred sections).

Left illustration transitions for overworld moves and modal enter/leave:
- Duration ≤ `MOVE_SLIDE_FRAMES` (15).
- Candidates: directional slide (reuse moveSlide mental model), clamp overlay with underlay, 5-step dither.
- Lore stagger: all contexts, same duration cap, deferred until illustration animation lands.
- One frame of stale illustration during bank-staged art load is acceptable at UI cadence (~5 fps); not required for Phase 2 if art stays in bank 0.

**Post–Phase 1 UX polish (optional, does not reunite stats into one region):**
- Longer delta hold when combat deltas anchor to Fight badge.
- Brief pulse on left-panel army/enemy stat when those values change mid-combat.
- Badge tint when player cannot afford price (gold/food check).
- Combat-only minimalist text strip on illustration — last-resort escape hatch from Risks table; constant-gated.

Captured in `docs/backlog.md` when phase 1 ships.

---

## Addendum 2026-06-05 — Phase 1 playtest & close-out

### Playtest verdict

- **Net positive:** UI reads cleaner; per-button prices match actions; left illustration unobstructed; sets up more encounter art and future 32×32 / bank-staged illustrations.
- **Tradeoff:** Slightly less accessible than preview plates — army, gold, and action cost no longer share one region. In combat, if the player watches the Fight button, delta popups on the badge are hard to read in time; comparing badge price to bank balance requires eye travel to the stats column.
- **Decision:** Ship Phase 1 after review; defer left-panel illustration animation to Phase 2 (separate milestone, not a tail on this branch).

### Grid gap (post-implementation)

- Tried gap **6** during implementation; playtest reverted to **4** — tighter layout, badges still fit, overworld move-slide covers less distance and feels smoother.
- Pair `UI_BADGE_OFFSET_Y` with `CELL_GAP_PX` when retuning (see Layout tweak above).

### TIC badge pill (implementation notes for future tuning)

- Sprites **#310** (price), **#311** (left): **8×8** UI art, not 16×16 — `UI_BADGE_PILL_SHEET_W_PX = 8`, caps 4 px each, middle stretch repeats seam column `cap - 1`. Colorkey **0** so grid hover tint shows through.
- Pill width from glyph **advance** (not bare glyph width): `-` 4 px, `1` 5 px, `0`/`2`–`9` 6 px; padding left 2 px, right 1 px. Logic in `badgeTextWidthPx` / `badgeOpsForCell` (`rightGridRenderPlan.ts`); draw in `render.ts`.

### Larger illustrations (out of roadmap)

Not Phase 1 or 2. Documented in `docs/backlog.md` § *Larger encounter illustrations — deferred*: 32×32 @ scale 2 in bank 0 (~8 in #384–#511 band); 64×64 or warehouse banks via two-frame `sync(2, …)` + `memcpy` staging (sprites mask only — does not repaint screen; draw fully before sync on frame 1, restore bank 0 before draw on frame 2).

### Lore message system (shipped with Phase 1)

Encounter copy uses one optional **title + body** pattern:

| Layer | Rule |
|-------|------|
| **Title** | Named PoIs only (town/farm/camp, henges, wyrm/lair). Terrain, lakes, rainbows, ambush open: body only. |
| **Enter** | `openNamedPoiEncounter({ title: poiTitleFor(cell.name, suffix), enterBody })` stores `restoreMessage = loreMessage(title, body)`. |
| **In-encounter actions** | `setEncounterMessage(state, title, line)` or `loreMessage(title, line)` via `applyDeltas`. |
| **Combat outcomes** | `combatLoreMessage(state, body)` recovers title from `encounter.restoreMessage` via `loreTitleFromRestore`. |

Helpers live in `encounterHelpers.ts`: `poiTitleFor`, `loreMessage`, `loreTitleFromRestore`, `setEncounterLoreBody`, `combatLoreMessage`, `openNamedPoiEncounter`.

**Deferred:** `CAMP_LEAVE` / `FARM_LEAVE` farewell pools; ambush enemy display names (keep ambiguous in copy).

**Camp enter:** `CAMP_ENTER_LINES` in `lore.ts`, wired like town/farm on tile enter.

---

## Risks

| Risk | Mitigation |
|------|------------|
| 7 px badge illegible on device | Constants-only color tweak; optional white-bg variant |
| Green goblin + green delta on red badge | Badge is above button, not on illustration; delta anchors to badge rect |
| Grid transition desync | Badge ops only in `actionCellOps`, same phase gate as borders |
| Terminal label clutter | Verbatim `text`; action name carries context |
| Camp search teaching change | Intentional; Search badge removed — players no longer see +food/+army before pressing (was on preview plate) |
| Pay badge on ineligible variants | Omit badge when `isEligible !== 'ok'`; Pay button may still render |

---

## Test strategy (plan input)

- Replace `previewPlate.test.ts` with one `rightGrid.badges.test.ts` (~5 cases).
- Migrate v0.5 / v0.6 plate assertions to `.badge`; update 2–3 terminal render cases.
- **No** per-GWT acceptance file; manual TIC smoke for visual tuning.
- Update `docs/the-unbound-learnings.md` after ship.
- No new determinism witnesses — presentation only.

## Definition of done (phase 1)

- No preview plate renders in TIC or terminal.
- All encounter kinds use illustration swap + per-button badges per this doc.
- `npm run verify` green; manual smoke (town, combat, camp, locksmith).
- GWT specs validated by spot tests + playtest — full ATDD optional follow-up.
