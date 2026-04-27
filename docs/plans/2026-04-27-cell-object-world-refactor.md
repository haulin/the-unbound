# Cell-Object World Refactor Plan (boy scout follow-up)

## Context

The prototype has started to accumulate *parallel structures*:

- `world.tiles: number[][]` (base terrain + specials)
- `world.farms[]`, `world.camps[]` (named PoIs)
- `resources.farmNextReadyStep[]`, `resources.campNextReadyStep[]` (cooldowns)

This works for 1–2 PoI types, but scales poorly when adding towns/shops/henges and other “tile has attributes” features. We want a model that keeps the code maintainable as the number of feature tiles grows.

## Decision summary

- **Now**: do this refactor immediately (boy scout rule).
- **Cell objects**: the world is a 2D grid of cell objects, not numeric tile ids.
- **String `kind`**: cells have `kind: 'grass' | 'farm' | ...` as the canonical domain value.
- **Cooldowns live on cells**: farms/camps store their own `nextReadyStep`; remove `resources.*NextReadyStep[]`.
- **Exclusive kinds**: a cell is exactly one kind at a time (terrain vs farm vs camp, etc.).
- **Stable ids**: for any cell needing an id, use `id = y * world.width + x` (cell index).
- **Seed meaning**: stable within a version/build; cross-version stability is out of scope for now.

## Non-goals

- No gameplay changes: v0.0.6 rules stay the same (hunger→army, camp recruit +2 food, game over, signpost tie-breaks, UI headlines, etc.).
- No save/load system work (none exists today).
- No attempt to keep seed outputs stable across future versions.

## Invariants to preserve

- **Pure reducer**: `processAction(prev, action) -> next` only.
- **Immutable updates**: updating a cell must clone only the row + cell (not the whole grid).
- **Determinism discipline**:
  - RNG is consumed only on “ready payout” outcomes (farm harvest, camp recruit).
  - Revisit/empty/cooldown flavor must not consume RNG.
- **Verification stays green**: keep `npm run verify` passing at each checkpoint.

## Target data model (end state)

### `CellKind` (initial set)

Terrain kinds map to the existing prototype’s tile set:

- `'grass' | 'road' | 'mountain' | 'lake' | 'swamp' | 'woods' | 'rainbow'`

Feature kinds (v0.0.6):

- `'castle' | 'signpost' | 'farm' | 'camp'`

### `Cell` union (minimal, v0.0.6)

- Terrain: `{ kind: <terrainKind> }`
- Castle: `{ kind: 'castle' }`
- Signpost: `{ kind: 'signpost' }`
- Farm: `{ kind: 'farm'; id: number; name: string; nextReadyStep: number }`
- Camp: `{ kind: 'camp'; id: number; name: string; nextReadyStep: number }`

### `World`

- Replace numeric tiles with cells:
  - `world.cells: Cell[][]`
- Remove:
  - `world.tiles`
  - `world.castlePosition`
  - `world.farms`
  - `world.camps`

### `Resources`

Reduce to true resources:

- `food: number`
- `armySize: number`

Cooldown state is in the relevant cell’s `nextReadyStep`.

## Constants/config migration

Move away from “flat exported numbers” toward kind-keyed definitions (while keeping compatibility aliases during migration):

- `TERRAIN[kind] = { spriteId, message, enterFoodCost }`
- `FEATURES[kind] = { spriteId, count, cooldownMoves, ... }`

Add helpers used across core + renderer:

- `spriteIdForKind(kind: CellKind): number`
- `enterFoodCostForKind(kind: CellKind): number`
- `terrainMessageForKind(kind: CellKind): string`

## Plan (keep `npm run verify` green at each step)

### Step 1: Types scaffolding (compile-only change)

Files:
- `src/core/types.ts`

Work:
- Add `CellKind` + `Cell` union.
- Add `world.cells` **in addition to** existing world fields (temporary dual representation).
- Keep `Resources` fields for now (cooldown arrays still exist until Step 4).

Verify:
- `npm run verify`

### Step 2: Add structured `TERRAIN`/`FEATURES` defs + helpers

Files:
- `src/core/constants.ts`

Work:
- Introduce `TERRAIN` and `FEATURES` maps.
- Implement `spriteIdForKind`, `enterFoodCostForKind`, `terrainMessageForKind`.
- Keep existing `TILE_*`, `FOOD_COST_*`, `TERRAIN_MESSAGE_BY_TILE_ID` exports as aliases/wrappers during migration.

Verify:
- `npm run verify`

### Step 3: Worldgen emits `cells`

Files:
- `src/core/world.ts`
- `tests/core/world.test.ts` (update expectations to scan `cell.kind`)

Work:
- Base terrain generation produces terrain `Cell` objects (bucket → terrain kind).
- Replace `placeSpecials` growth with a small placer pipeline:
  - `placeCastle`
  - `placeNamedFarms`
  - `placeNamedCamps`
  - `placeSignposts`
- For farm/camp cells:
  - `id = y*width + x`
  - `nextReadyStep = 0`
- Keep old `world.tiles`/arrays only if required as temporary compatibility outputs (short-lived).

Verify:
- `npm run verify`

### Step 4: Cooldowns move into cells; delete cooldown arrays

Files:
- `src/core/tiles/types.ts` (ctx carries `cell`/`kind` instead of `tileId`)
- `src/core/tiles/registry.ts` (dispatch by `kind`)
- `src/core/tiles/onEnterDefaultTerrain.ts` (use `terrainMessageForKind`)
- `src/core/tiles/onEnterFarm.ts` (read/update farm cell’s `nextReadyStep`)
- `src/core/tiles/onEnterCamp.ts` (read/update camp cell’s `nextReadyStep`)
- `src/core/reducer.ts` (enter-cost uses `enterFoodCostForKind(cell.kind)`; handler receives cell)
- `src/core/types.ts` (remove `resources.farmNextReadyStep` / `resources.campNextReadyStep`)
- Update reducer tests: `tests/core/farms.reducer.test.ts`, `tests/core/army-camps.reducer.test.ts`

Work:
- Handler updates return `world` with the destination cell updated (clone row + cell).
- Remove any remaining padding/normalization for cooldown arrays (`normalizeResources` becomes just resource defaults).

Verify:
- `npm run verify`

### Step 5: Signposts scan `world.cells`

Files:
- `src/core/signpost.ts`
- `src/core/tiles/onEnterSignpost.ts`
- `tests/core/signpost.test.ts`

Work:
- Enumerate PoIs by scanning the cell grid for `castle`/`farm`/`camp`.
- Tie-break:
  - distance
  - kind rank: castle > farm > camp
  - `id` ascending for same kind

Verify:
- `npm run verify`

### Step 6: Renderer draws sprite ids from `kind`

Files:
- `src/core/world.ts` (add `getSpriteIdAt` or repurpose `getTileIdAt` to return sprite id)
- `src/platform/tic80/render.ts` (use sprite ids derived from cell kind)

Work:
- Ensure minimap and preview-grid rendering still draw correctly (they want sprite ids).

Verify:
- `npm run verify`

### Step 7: Cleanup dual representation

Files:
- `src/core/types.ts`, `src/core/world.ts`, any remaining call sites

Work:
- Delete old `world.tiles`/arrays and any adapter glue.
- Ensure remaining code uses only `world.cells` + helpers.

Verify:
- `npm run verify`

## Documentation updates

Files:
- `docs/backlog.md`

Work:
- Add a short architecture note: we use cell objects (`world.cells`) to scale to towns/shops/henges without parallel cooldown arrays.

## Notes / risks

- This is a wide refactor; the main risk is “half migrated” state. The checkpoints above are designed to keep the project runnable the whole time.
- Cross-version seed stability is explicitly not addressed; when we add a save system, we can choose to persist full world state if needed.

