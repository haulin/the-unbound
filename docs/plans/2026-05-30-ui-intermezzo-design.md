# UI intermezzo — design

## Status

Shipped. Touches the TIC-80 platform ([`src/platform/tic80/`](../../src/platform/tic80/)) and the encounter authoring layer — helpers in [`encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts), and the five encounter defs ([`camp`](../../src/core/mechanics/defs/camp.ts), [`farm`](../../src/core/mechanics/defs/farm.ts), [`locksmith`](../../src/core/mechanics/defs/locksmith.ts), [`town`](../../src/core/mechanics/defs/town.ts), [`combat`](../../src/core/mechanics/defs/combat.ts)) now all route through them. One narrative constant nudges ([`src/core/constants.ts`](../../src/core/constants.ts)): `LORE_MAX_CHARS_PER_LINE` 19→20.

Three cross-cutting refactors and one small game-feel addition landed alongside the visual changes:

- The sprite registry in [`src/core/spriteIds.ts`](../../src/core/spriteIds.ts) was restructured from where-it-renders categories (`buttons`, `stats`, `cosmetics`, …) to what-it-depicts categories (`inventory`, `enemies`, `actions`, `centers`, …), collapsing six concept duplicates into a single canonical id each. The TIC-80 `.tic` sprite sheet was then reshuffled so thematically-related sprites sit in the same column. See Key decision 7.
- A grid-transition reveal bug specific to combat variants was fixed in [`src/platform/tic80/rightGridRenderPlan.ts`](../../src/platform/tic80/rightGridRenderPlan.ts). See Key decision 8.
- The five encounter defs now share one authoring shape — three helpers in [`encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts) (`makeRightGrid`, `previewEncounterProvider`, `gridButton`) plus a per-mechanic action table cover the right-grid layout, the spiral-reveal placeholder, the reducer dispatch, and the preview plate. See Key decision 10.
- The panel chrome became a three-tier progression — default → blood (player holds vial) → bronze (player has forged the key) — turning the existing single bronze upgrade into a visible arc that mirrors the player's two milestones toward the goal. See Key decision 9.

Reducer math, world, and the terminal platform are otherwise unchanged.

## Documentation reviewed

- [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md) — renderer-consumes-models; "buttons are read from the registry, never hardcoded".
- [`docs/backlog.md`](../backlog.md) — UI intermezzo backlog items (donkey/steps overlap, button scale, panel structure).
- [`docs/plans/2026-04-29-v0.0.8-ui-polish.md`](2026-04-29-v0.0.8-ui-polish.md) — the previous UI pass (9-slice, hover tint, lore color, texture overlay) whose chrome this builds on.
- [`docs/plans/2026-05-29-v0.5-the-wyrm-plan.md`](2026-05-29-v0.5-the-wyrm-plan.md) — the encounter that pushed the last piece of inventory into the held-slot bar.

## Why this exists

By the end of v0.5, the right side of the screen was carrying more state than it had room for. The 3×3 grid was rendered at 2× sprite scale (32 px cells), the seed/position/steps stats and the held inventory shared the same strip above the grid, and the donkey icon was beginning to overlap the steps value. The minimalism that worked at v0.0.8 had become cramped — three companion slots and the bronze key already exceed what fits in the corner.

Two contributing forces:

- Sprites were drawn at 2× because at 1× they look small on the TIC-80's 240×136 viewport. The cost was a six-fold reduction in usable real estate (a 32×32 cell is 4× the area of 16×16 plus padding).
- The right side had no chrome of its own — only the grid, with everything else (stats, inventory) floating in negative space around it. There was no place for new content to live.

The intermezzo was an experiment: bring buttons down to native 1× scale, treat the right side as a framed surface with internal structure, and see if the resulting whitespace could absorb the stats and inventory cleanly. It did, and it bought enough additional width to also restructure the left panel.

## Architecture

Both panels are now framed surfaces split into three bands. The left mirrors the right's layout language so they read as siblings rather than "the panel and the buttons":

```
Left panel (128 px wide)            Right panel (112 px wide)
+-----------+----------+             +-----------------------+
|           |          |             |  seed  pos  steps     |  <- top band (stats)
|           |  stats   |             +-----------------------+
|   illus   |  column  |             |     [N]               |
|  (64x64)  |  (3 stats|             |  [W][C][E]            |  <- grid (3x3)
|           |  centred)|             |     [S]               |
+-----------+----------+             +-----------------------+
|                      |             |   blood scout mule    |  <- bottom band (held)
|  lore body           |             +-----------------------+
|  (~7 lines x 20 ch)  |
+----------------------+
```

Layout constants live in [`src/platform/tic80/layout.ts`](../../src/platform/tic80/layout.ts); colors and per-band offsets in [`src/platform/tic80/uiConstants.ts`](../../src/platform/tic80/uiConstants.ts); rendering in [`src/platform/tic80/render.ts`](../../src/platform/tic80/render.ts); right-grid op planning in [`src/platform/tic80/rightGridRenderPlan.ts`](../../src/platform/tic80/rightGridRenderPlan.ts). Nothing reaches into core.

## Key decisions

### 1. Native 1× sprite scale, even though pixel art shrinks

The single biggest source of new space was dropping the right-grid sprites from 32×32 (2× scale) back to 16×16 (native). 16 px sprites on a 240 px viewport feel small in isolation, but inside 24×24 cells the surrounding padding reads as breathing room rather than emptiness. We considered an intermediate 24×24 (1.5× scale) but rejected it: TIC-80 has no fractional sprite scale and we have no appetite to redraw 28 sprites at a new resolution. 1× is the only practical option, and once the chrome was in place the icons stopped looking lost.

The grid is now `3 × (24 px cell + 4 px gap) = 80 px` wide instead of the old `3 × (32 px cell + ~0 gap) = 96 px`. The 16 px reclaimed went directly into the new bands.

### 2. Border shape, not color, carries category

The previous experiment added thick dashed colored borders per cell (red for food, green for scout, etc.). Every cell shouted equally loud and the eye had no hierarchy. The new system is the opposite: borders are 1 px, the same dark grey palette index, and differ only in shape and weight.

| Category | Border | Why |
|---|---|---|
| Meta (4 corners) | Single, dark navy (`UI_COLOR_GRID_CELL_BORDER_META = 15`, Sweetie16 very dark navy) | Always-present chrome (goal, map, minimap, restart). Recedes most. |
| Action (encounter buttons) | Single, grey (`UI_COLOR_GRID_CELL_BORDER = 14`, Sweetie16 muted blue-grey) | "Click me to do a thing." |
| Terrain (overworld neighbours) | Double, grey, 2 px inset (same color as action) | "This is the world; clicking moves you there." |
| Empty / center | No border | Center is never a button. |

Action and terrain share one color because the shape (single vs double border) already carries the distinction — we tried distinct colors first and the grid started shouting again. If we ever do want to tint terrain separately, splitting `UI_COLOR_GRID_CELL_BORDER` back into two constants is a one-line change.

The terrain double-border is the dominant visual signal: overworld cells say *map* by looking like map cells, encounter cells say *button* by looking like buttons. The eye sorts the grid into "what can I click vs what is the world" without reading any text.

### 3. Border reveal locked to sprite reveal during grid transitions

When entering an encounter, the spiral reveal animation swaps each cross cell's sprite from overworld to encounter one at a time (N → W → S → E → C, 5 frames apart). Before this change, the categories were resolved from live `s.encounter` — which was already the new encounter the moment the animation started — so all five borders flipped from double to single at the very first frame of the move-slide, while sprites still showed the old overworld view. The reveal looked broken: terrain-shaped sprites with action borders.

The fix factors out the reveal lookup ([`transitionModeForCell`](../../src/platform/tic80/rightGridRenderPlan.ts)) and shares it between sprite resolution and category resolution. Each cross cell asks "what mode should I render as this frame?" and gets back either the `from` or `to` mode based on the spiral phase. Both the sprite and the border now flip in the same frame for the same cell. Center, corners, and pre-transition phases are handled by the same function.

This is the only piece of the intermezzo that's genuinely architectural rather than aesthetic. Before, the border layer was a static function of state; now it participates in the same animation timeline as the sprites.

### 4. Two panels, three bands each, dividers as chrome

The right panel splits at fixed y-coordinates: top frame inset → stats band (8 px) → 1 px divider → grid (vertically centered in the remaining height) → 1 px divider → held band (16 px) → bottom frame inset. The dividers are a single dark-navy pixel row (`UI_COLOR_RIGHT_PANEL_DIVIDER = 15`) drawn inside the frame's inner extent. Same palette as the meta-cell borders — chrome that defines without competing.

The left panel mirrors the structure with a T-junction:

- A vertical divider between the 64×64 illustration and the stats column.
- A horizontal divider between the header band (illustration + stats) and the lore body.

They meet at one pixel and frame the illustration as its own quadrant. The vertical divider stops 5 px short of the horizontal divider; that gap matches the visible inset the horizontal divider keeps from the frame ornament, so the negative space around the dividers reads as deliberate rather than accidental.

Stats are vertically centered within the header band, then lifted by 3 px (`UI_LEFT_PANEL_STATS_OPTICAL_LIFT_PX`) to compensate for the top frame ornament's heavier visual weight and the icons' transparent top padding. Mathematical centering looked low; optical centering needed an explicit fudge.

### 5. Width transfer: left +8 px, right -8 px, gap 0 px

The original split was 120 / 120 with no gap. The right panel needed to shrink anyway to give its new frame chrome breathing room around the 80-px grid; the question was how to spend the freed pixels.

Two sub-decisions, settled in order:

- **Right panel: 120 → 112.** Anything narrower starts crowding the 80-px grid against its frame. Anything wider wastes pixels — the stats and held bands are icon-sized and well under 112 px.
- **Left panel + inter-panel gap: spent on the left.** We tried 8 px, 2 px, and 1 px gaps between panels. 8 felt like dead space; 2 and 1 still read as unintended seams. Widening the left panel to 128 and dropping the gap to 0 was the only configuration where the seam disappeared (the braided frame ornaments tile continuously across the abutment) *and* the lore got the room it needed.

The 8 px transferred to the left bought a comfortable 20-character lore wrap (`LORE_MAX_CHARS_PER_LINE: 19 → 20`; the opening narrative goes from 8 lines to 7), 9 px of lateral padding inside the frame, and room for the internal dividers without crowding.

`RIGHT_PANEL_LEFT_GAP_PX = 0` is kept as a named constant so re-introducing a gap (for ultra-wide handhelds or TV output) is a one-line change.

### 6. Encounter close as a first-class flow (locksmith)

The locksmith encounter previously left the modal open after the bronze key was purchased, requiring a second Leave press — and worse, it accepted a second pay-gold press that successfully deducted more gold for a key the player already owned. Both classes of bug share a root cause: the pay reducers were going through `applyDeltas` (apply, stay) rather than the "apply, then exit" pattern the player expected.

The wyrm's bribe path already did the right thing — its `reduceCombatPay` in [`combat.ts`](../../src/core/mechanics/defs/combat.ts) was written inline at v0.5 and closes the encounter as part of the success branch. The intermezzo extracts that pattern into a shared helper, [`applyDeltasAndClose`](../../src/core/mechanics/encounterHelpers.ts), and routes locksmith's pay-gold and pay-food reducers through it. The success message is preserved (unlike `leaveEncounter`, which restores the tile-enter message); the encounter is cleared; the overworld grid transition is enqueued. No double-pay guard is needed because there is no second-press surface.

This belongs in the intermezzo because the UX change is fundamentally visual: the player sees the purchase land, the success lore appears, the grid transitions back to overworld. Before, they saw the purchase land and then had to wonder if they were supposed to press Leave again.

(`reduceCombatPay` could now be refactored to call `applyDeltasAndClose` too — same pattern, same helper. Left for a follow-up since combat's pay path also runs `applyCombatResolved` on the source cell, which the current helper doesn't model.)

### 7. Sprite registry by depicted concept, not by render site

The old `SPRITES` tree had top-level categories `tiles`, `interactivePois`, `buttons`, `stats`, `cosmetics`, `smallStats8x8`, `ui8x8` — categorized by *where* the sprite was drawn (a button, a stat icon, an illustration). Several concepts had duplicate sprites — food existed as `buttons.food` (the right-grid button) AND `stats.food` (the left-panel stat icon), even though both rendered the same drawing. The cost was that the renderer trusted two different food sprite ids to remain visually identical; in practice they drifted.

The restructure groups by *what the sprite depicts*: `terrain`, `poi`, `inventory`, `enemies`, `actions`, `centers`, `small`, `ui`. Six pairs collapsed to a single canonical id each (food, gold, troop, scout, beast, rumor). The renderer chooses scale and chrome based on call site rather than reaching for a different sprite.

This unlocked a sprite-sheet reshuffle in TIC-80 into thematic columns. The relationships are now visible in the .tic editor itself:

| Column | Contents |
|---|---|
| 2 | lake / farm / food / donkey — the homestead column |
| 4 | henge / locksmith / fight / enemy / kiln / key — the conflict-and-keys column |
| 6 | cave / heart / wyrm / blood vial — the wyrm's-lair column |

The "aligns thematically-related sprites into the same column" test in [`tests/core/spriteIds.v0.4.test.ts`](../../tests/core/spriteIds.v0.4.test.ts) asserts each column's `id mod 16` so accidental reshuffling fails fast with a named error rather than silently scattering the layout.

The renumbering shipped in two phases: the registry restructure renamed paths only (IDs unchanged) so call-site updates could land without touching the .tic file; then a separate pass updated the numeric IDs once the editor reshuffle was settled. Both phases were small focused diffs guarded by the same test surface.

### 8. Spiral reveal uses live encounter when entering, placeholder only when leaving

The cross-cell reveal during a grid transition (N → W → S → E → C) needs to render the *to* mode for cells that have flipped and the *from* mode for cells that haven't. Each cell's mode-of-the-moment comes from [`transitionModeForCell`](../../src/platform/tic80/rightGridRenderPlan.ts); the renderer then asks each encounter's `previewEncounter()` factory for a placeholder state to render against.

For most encounter kinds this was invisible: town's preview shape matches its real shape because `rightGrid` reads `town.offers` off the source cell directly. But combat encounters have a *variant* layer (standard / wyrm / brigand), and the variant is resolved by walking from the encounter's `sourceCellId` to the cell's `kind`. The `previewEncounter()` placeholder carries `sourceCellId: -1` (no source cell exists outside an encounter), so the variant lookup short-circuited to `STANDARD_COMBAT_VARIANT`. STANDARD has no `payment` config, so the wyrm's gold/pay button at (0, 1) was invisible for the entire 5-step reveal — then snapped into existence the instant the transition completed and the renderer fell back to live state. The center also briefly showed the STANDARD enemy sprite instead of the wyrm; the fight and return cells happened to share sprites between variants, so they read correctly.

The fix in `synthesizeStateForMode`: prefer the live encounter when its `kind` matches the requested mode. On entry the reducer sets the real encounter on state *before* the gridTransition starts firing frames, so live state has the real wyrm encounter, the variant resolves correctly, and the pay button reveals on phase 0 like every other N cell. On exit the live encounter is null, so the placeholder is still used for the *from* mode — which is correct because the *to* mode (overworld) flips immediately on phase 0 and the placeholder's missing pay button never gets rendered anyway.

The asymmetry — live state for entry, placeholder for exit — is not a hack but the right shape: at entry time we have ground truth; at exit time we don't, and the placeholder is fit for purpose for the brief frames it appears.

### 9. Panel chrome as a milestone arc (default → blood → bronze)

v0.5 introduced a single chrome upgrade: the panel border swapped from grey to bronze the moment the player forged the bronze key. The intent was "visual reward for being closer to the goal", which worked, but the reward arc was incomplete — bleeding the wyrm for the blood vial is the *prerequisite* to forging the key, and it was passing without acknowledgement. The player's first major milestone got no visual response; only the second one did.

This intermezzo adds a third tier between them. The chrome now reflects the inventory token currently held:

| Tier | Trigger | Sprite top-left |
|---|---|---|
| Default | (starting state) | `panelBorder = 258` |
| Blood | `inventory.includes('blood')` | `panelBorderBlood = 261` |
| Bronze | `inventory.includes('bronzeKey')` | `panelBorderBronze = 264` |

The selection is checked in reverse milestone order — bronze first, blood second, default last — in [`panelFrameTopLeftFor`](../../src/platform/tic80/render.ts). In practice the three states are mutually exclusive because the locksmith reducer consumes `'blood'` when forging the key (see [`consumeBlood` in `defs/locksmith.ts`](../../src/core/mechanics/defs/locksmith.ts)), but the chrome doesn't lean on that invariant — if a future mechanic ever leaves both tokens in inventory at once, the chrome still picks the latest milestone correctly. Both panel callers (`drawLeftPanel`, `drawRightPanelFrame`) now route through the same `panelFrameTopLeftFor(s)` helper instead of repeating the inventory check inline.

This is mostly a small change with a disproportionate effect on game feel. The first time the player loots the wyrm for the vial, the entire frame responds — a quiet "you found a thing the world cares about" that the previous flow only delivered on the second milestone. The progression now has two visible beats instead of one, which roughly halves the time the player spends wondering if they're on the right path.

A small plumbing simplification rode along: nine-slice registry entries used to record all 9 sprite ids per variant. The block layout on a TIC-80 sprite sheet is fully determined by the top-left id (3 wide × 3 tall, row stride +16), so the registry now stores only the top-left and `drawNineSliceFrame` in [`nineSlice.ts`](../../src/platform/tic80/nineSlice.ts) derives the other 8 inline. Adding the next chrome variant (silver gate? see v0.12 in the backlog) is a one-line addition to the registry.

### 10. Encounter authoring as one shape

The intermezzo touched every encounter type (right-grid layout, preview plate, spiral-reveal animation, panel chrome), which made the existing divergence between mechanic defs expensive to ignore — five encounter files had five different shapes for the same job. Part of the intermezzo's job is therefore to canonicalise the encounter authoring surface so the next mechanic (the brigand recruit at v0.7, or a fisherman's hut later) is a pattern-match against any existing def rather than a choose-your-own-style exercise.

Three helpers in [`encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts) define the shape:

- **`makeRightGrid({ leaveAction, centerSpriteId, top, left, bottom })`** — the right-grid provider. The leave button is always the return sprite (only its action varies); the center and each named action slot accept either a static value or a `(s: State) => …` function for state-dependent content. Camp/farm/locksmith use the static form; combat passes functions for the variant-based center and the wyrm pay button; town passes functions for its three offer slots, all of which read from `state.world`'s town cell. Named slots (rather than a positional array) let each mechanic keep its original visual placement — no slot-order convention to remember.

- **A per-mechanic action table.** `CAMP_ACTIONS`, `FARM_ACTIONS`, `LOCKSMITH_ACTIONS`, `COMBAT_ACTIONS`, and town's `TOWN_OFFERS` (the last keeps its domain name because cells carry an `offers` array) all share the shape `{ [ACTION_X]: { spriteId, reduce, … } }`. The mechanic's action union is derived as `keyof typeof TABLE`. The reducer dispatch collapses to a single guard plus `TABLE[action.type].reduce(...)`. The right-grid declaration uses **`gridButton(TABLE, ACTION_X)`** so each button's sprite is read from the row that owns its reducer — grid and dispatcher cannot drift. Preview plates that show prices read sprites from the same table; price data lives in the table where it varies per cell (town adds a `priceKey` field) or stays in module constants where it doesn't (farm, locksmith). Adding a new button to a mechanic is one new constant plus one new table row — everything else (action union, dispatch, grid button, plate icon) derives.

- **`previewEncounterProvider('camp')`** returns the canonical `{ kind, sourceCellId: -1, restoreMessage: '' }` placeholder the spiral reveal needs (see Key decision 8). The type signature carves combat out by name (`SimpleEncounterKind = Exclude<EncounterKind, 'combat'>`) because combat needs `enemyArmySize`; the exclusion is explicit rather than clever, so the next reader knows combat is the exception by design.

A handful of smaller seams paid off in the same pass:

- **Frame-tile px unified.** `PANEL_FRAME_TILE_PX = 8` in [`layout.ts`](../../src/platform/tic80/layout.ts) replaces two separate constants (one for each panel) that both encoded "the nine-slice tile is 8 px". Both panels' inner extents and band offsets derive from it.
- **Tier 3 constants consolidated.** Border colors and band bleeds were tracked as four constants (action color, terrain color, top-band bleed, bottom-band bleed). They're now two (`UI_COLOR_GRID_CELL_BORDER`, `RIGHT_PANEL_BAND_BLEED_PX`). The seams are easy to reintroduce if a future tuning forces it; today they were just inviting drift.
- **One playtest leak reverted.** `INITIAL_GOLD` had crept from 15 to 150 during iteration ("skip past gold scarcity while tuning the chrome arc"). Reverted to 15 — the v0.3 design value.

The 244-test suite stayed green throughout.

## Trade-offs and limits

- **Pixel-art legibility.** 16×16 sprites with no scaling are dense. Some icons that were tuned for 32×32 look slightly busy at native scale, particularly the rainbow and the inventory-mule. We accept this; redrawing 28 sprites at a new resolution would have been the work of a v0.x.
- **Frame-ornament padding is a soft constant.** Several layout decisions (`UI_LEFT_PANEL_STATS_OPTICAL_LIFT_PX`, `UI_LEFT_PANEL_DIVIDER_GAP_PX`, `RIGHT_PANEL_BAND_BLEED_PX`) lean on visual judgment of how far the nine-slice ornament's painted pixels extend into its 8 px tile. The top and bottom band bleeds are deliberately one constant — they're symmetric today and if a future ornament asymmetry forces tuning per-band, split `RIGHT_PANEL_BAND_BLEED_PX` back into two. The constants are tuned for the current frame sprites; if those sprites are redrawn, the values need re-checking.
- **Stats centering assumes 3 stat slots.** The header-band centering in `drawLeftPanel` assumes `3 * 16 + 2 * gap = 52` px of stats content. Adding a fourth stat (e.g. day counter) would overflow the illustration height and require revisiting whether the panel still centers or just top-aligns. Acceptable today, flagged for whoever adds a stat.
- **`blank` grid-transition mode is half-supported.** `previewSpriteIdForCell` returns null for blank mode (the cell stays empty); `cellCategory` returns empty. Borders never appear for blank cells, which is correct, but if a future use case wants `from: 'blank'` to look like *something* rather than empty (e.g. a shimmering placeholder), both functions need a new branch.

## Future change vectors

Items that fell out of scope and live in [`docs/backlog.md`](../backlog.md) under "UI polish — deferred":

- **Map-toggle highlighted state.** When the map is open, the (0, 2) map button should look pressed (white border or similar) rather than identical to its closed state. Same idea for the minimap toggle at (2, 0).
- **Disabled-button overlay.** Buttons that are non-actionable in the current state (e.g. movement during end-of-game) currently look the same as active ones. A checkerboard or stipple overlay would communicate "this exists but you can't use it" without removing the affordance.
- **Goals button replacement.** The (0, 0) corner is `show_goal`, which is useful early and decorative once the player knows the layout. Candidate replacement: a held-inventory hero slot, freeing the bottom band for something else.
- **Textured preview-plate background.** Tried during the intermezzo with a checkerboard sprite and 8 retouched plate-eligible icons (food/gold/troop/scout/beast/rumor/enemy/heart) keyed off color #8 so the texture would show through the icons' negative space. Plates looked good in isolation but those same icons are reused as right-grid buttons, and the hover tint stopped behaving consistently across the grid: the 8 modified sprites highlighted "everything except the outline" while unmodified sprites highlighted only the 8 px cell padding. Two adequate-but-not-great fixes exist (per-sprite colorkey, or separate overlay sprites stamped only inside the plate); the latter is the right shape but costs one extra outline sprite per plate-eligible concept and grows with the encounter roster. Reverted to the opaque plate; revisit once the roster locks in and the sprite-sheet cost is known.

These were deliberately deferred — the intermezzo had a clear scope (structure and density) and we held the line.

## What this intermezzo explicitly does not do

- Redraw any 16×16 sprite. Native scale exposes some details that would benefit from re-tuning; we accept them.
- Change core gameplay. The locksmith encounter-close fix is a UX correction (the second pay-press was always a bug); resource math and lore selection are untouched.
- Touch the terminal platform. Terminal already reads from the same encounter providers and is unaffected.
- Add new visual languages. Borders use existing palette indices; the new dividers reuse the meta-border color. No new sprite assets shipped.

## References

- Right-grid rendering: [`src/platform/tic80/rightGridRenderPlan.ts`](../../src/platform/tic80/rightGridRenderPlan.ts).
- Panel rendering: [`src/platform/tic80/render.ts`](../../src/platform/tic80/render.ts) (`drawLeftPanel`, `drawRightPanel`, `drawLeftPanelDividers`, `drawRightPanelDividers`, `drawRightStatsBand`, `drawRightHeldBand`, `panelFrameTopLeftFor`).
- Layout constants: [`src/platform/tic80/layout.ts`](../../src/platform/tic80/layout.ts) (`PANEL_FRAME_TILE_PX`, `RIGHT_PANEL_BAND_BLEED_PX`).
- Color and band tunables: [`src/platform/tic80/uiConstants.ts`](../../src/platform/tic80/uiConstants.ts) (`UI_COLOR_GRID_CELL_BORDER`, `UI_COLOR_GRID_CELL_BORDER_META`).
- Nine-slice machinery: [`src/platform/tic80/nineSlice.ts`](../../src/platform/tic80/nineSlice.ts) (`drawNineSliceFrame` — derives the 9-tile block from its top-left sprite id).
- Sprite registry: [`src/core/spriteIds.ts`](../../src/core/spriteIds.ts).
- Encounter helpers: [`src/core/mechanics/encounterHelpers.ts`](../../src/core/mechanics/encounterHelpers.ts) — `applyDeltasAndClose` (encounter close as one step), `makeRightGrid` (right-grid provider factory), `gridButton` (table-backed action button), `previewEncounterProvider` (typed placeholder factory).
- Encounter defs: each follows the same shape — action constants, action table (`*_ACTIONS` or `TOWN_OFFERS`), reducer dispatch, per-action reducers, worldgen (if any), preview plate, mechanic registration. See Key decision 10.
