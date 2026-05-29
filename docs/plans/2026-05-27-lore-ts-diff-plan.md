# lore.ts Diff Plan — 2026-05-27

Companion to [`2026-05-27-slot-system-design.md`](./2026-05-27-slot-system-design.md). All of this plan was applied to [`../src/core/lore.ts`](../src/core/lore.ts) on 2026-05-27.

## What landed 2026-05-27

- `FARM_BUY_BEAST_LINES` → `MULE_BUY_LINES`, `FARM_BEAST_ALREADY_LINES` → `MULE_ALREADY_LINES`. Callsites in `src/core/mechanics/defs/farm.ts` updated.
- `CAMP_NAME_POOL`: `"Ember Cross"` → `"Ember Watch"`. `HENGE_NAME_POOL`: `"Weather Cross"` → `"Weather Stones"`. Five test fixtures and the lore-and-tone tone example updated.
- `FARM_ENTER_LINES` generalized so it no longer presumes the beast-buy option is always available at any given farm.
- New `Companion slots` section in `lore.ts` with the following pools (1–3 anchor lines each — enhance during implementation when the slot is being wired):

  - `MULE_SELL_LINES`
  - `CAMP_SCOUT_HIRE_LINES`, `CAMP_SCOUT_ALREADY_LINES`, `SCOUT_SELL_LINES`
  - `HEALER_BUY_LINES`, `HEALER_ALREADY_LINES`, `HEALER_SELL_LINES`
  - `BOAR_BUY_LINES`, `BOAR_ALREADY_LINES`, `BOAR_SELL_LINES`
  - `BOAR_MULE_REFUSED_LINES`, `MULE_BOAR_REFUSED_LINES`
  - `CAPTAIN_BUY_LINES`, `CAPTAIN_ALREADY_LINES`, `CAPTAIN_SELL_LINES`
  - `FISHERMAN_BUY_LINES`, `FISHERMAN_ALREADY_LINES`, `FISHERMAN_SELL_LINES`
  - `MAGPIE_BUY_LINES`, `MAGPIE_ALREADY_LINES`, `MAGPIE_SELL_LINES`

- New `The Crossing` section: `CROSSING_NAME_POOL`, `CROSSING_ENTER_LINES`, `CROSSING_EMPTY_LINES`.
- `BARKEEP_TIPS` extended with `mule`, `healer`, `boar`, `captain`, `fisherman`, `magpie`, `crossing`. Existing `scout` extended with a Camp-source line.
- `Mechanics index` comment block at the top of `lore.ts` updated: Scout and Tame-beast resource bullets collapsed into a new `Slots` section listing all seven slots; Farms / Camps entries generalized to "specialty hire" with the pool members enumerated; Towns added (previously missing); The Crossing added as a sell-only PoI.

### Folded / dropped during refinement

- `CROSSING_SOLD_LINES` (generic) — dropped. Per-slot `*_SELL_LINES` carry the sale flavor; no shared fallback needed.
- `BOAR_OPENER_LINES`, `CAPTAIN_AMBUSH_LINES`, `HEALER_REVIVE_LINES`, `HEALER_MAINTENANCE_LINES`, `FISHERMAN_LAKE_BONUS_LINES`, `FISHERMAN_FLEE_LOSS_LINES`, `MAGPIE_REFUND_LINES`, `MULE_CAMP_FEED_LINES` — dropped. These were imagined for per-event flash text, but the sprite-flash itself is the event feedback. Mechanic-side flavor is folded into BUY lines and `BARKEEP_TIPS`, where the player can actually read it without a moment-by-moment text fire.

## Open question for implementation

Does The Crossing show up on the Scout-revealed PoI set? Not yet decided. Default position: yes, same shape as camps/henges; confirm when worldgen is wired.

## References

- [`2026-05-27-slot-system-design.md`](./2026-05-27-slot-system-design.md) — chosen design
- [`slot-system.md`](./slot-system.md) — effect pool catalog (now in `backlog.md`) and pairing rules (now in `the-unbound-learnings.md`)
- [`lore-and-tone.md`](./lore-and-tone.md) — voice, world tone, the companion register, what the world doesn't have
- [`../src/core/lore.ts`](../src/core/lore.ts) — line pools
