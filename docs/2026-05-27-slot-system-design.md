# Slot System Design — 2026-05-27

Outcome of a design brainstorm. The slot system gives players a choice of up to three companions or pieces of gear per run, drawn from a pool of seven. Each companion brings a clear advantage and (most) a counterweight. Selling them happens at The Crossing, a new sell-only PoI.

This document captures the chosen design and the implementation notes. The effect pool and pairing rules live in [`slot-system.md`](./slot-system.md). World tone and the lore restrictions that shape the slot system live in [`lore-and-tone.md`](./lore-and-tone.md). Roadmap phasing lives in [`backlog.md`](./backlog.md). Line pools live in [`../src/core/lore.ts`](../src/core/lore.ts).

## Decision context

Existing PoIs sold companions (Scout, Mule) but the game lacked a way to part with them. Selling people directly felt off; selling animals and items felt more natural. After working through the brainstorm we settled on:

- A mixed slot system: 5 people, 2 animals, totaling 7 companions.
- A new sell-only PoI (The Crossing) for parting with any slot. Roughly half the purchase price refunded.
- A diegesis where companions leave willingly: they go with another party that suits them better, and the gold is compensation for the time and food the road has cost.
- No fae, no household spirits, no fantasy ecology. The world stays folk-mythological.
- No chattel slavery. The player is not a slaver.

## The roster

### 1. Mule

A pack-beast bought at farms. Carries food the company couldn't otherwise; in return, it eats from camp stores.

- Type: animal
- Source PoI: Farm specialty pool
- Sell PoI: The Crossing
- Positive: +50 food carry cap
- Negative: -1 food per Camp Search (eats from camp stores)
- Sprite: existing
- Lore pool: `MULE_*` (renamed from `FARM_BUY_BEAST_LINES` / `FARM_BEAST_ALREADY_LINES`)

### 2. Scout

A scout (person) bought at camps or towns. Halves the lost chance in woods and swamps, and reveals minor PoIs on the map when oriented.

- Type: person
- Source PoIs: Camp specialty pool, Town specialty pool
- Sell PoI: The Crossing
- Positives: halve woods/swamp lost chance + reveal farms/camps/henges on the map when oriented
- Negative: none (1-of-3 slot opportunity cost is the balance)
- Sprite: existing
- Lore pools: existing `TOWN_SCOUT_HIRE_LINES`, `TOWN_SCOUT_ALREADY_HAVE_LINES`, `BARKEEP_TIPS.scout`. Add `CAMP_SCOUT_*` for the Camp variant.

### 3. Healer

A healer (person) hired in some towns. Revives a wounded soldier after every combat. Her kit needs constant restocking, so she draws on your purse at town visits.

- Type: person
- Source PoI: Town specialty pool
- Sell PoI: The Crossing
- Positive: revive 1 wounded soldier per combat
- Negative: -1 gold per Town visit (maintenance — bandages, herbs, salve)
- Sprite: existing
- Lore pool: new `HEALER_BUY_LINES`, `HEALER_BARKEEP_TIPS`, `HEALER_SELL_LINES`. Use both *healer* and *hedge-healer* across lines for character (same pattern as *wyrm / dragon*).

### 4. Boar

A trained boar bought at farms. Charges hard at the opening of a combat, gores a chunk of the enemy line, then is too wounded to repeat the move that fight.

- Type: animal
- Source PoI: Farm specialty pool
- Sell PoI: The Crossing
- Positive: opening volley — kills roughly 25% of the enemy army at start of combat. Suggested formula: `min(enemy/2, max(3, enemy/4))`. Tune in playtest.
- Negative: cannot coexist with the Mule. Purchase refused with a lore line if the other is held; player must sell at The Crossing first. Refusal works both directions.
- Sprite: new. 16×16 silhouette: low fat body, bristled back, tusks at the front.
- Lore pool: new `BOAR_BUY_LINES`, `BOAR_SELL_LINES`, `BOAR_MULE_REFUSED_LINES`, `MULE_BOAR_REFUSED_LINES`.

### 5. Captain

A banner-bearer hired at camps. Soldiers fight harder under a known standard; the banner is also visible from afar, drawing predators and bandits in woods and mountains.

- Type: person (banner-bearer)
- Source PoI: Camp specialty pool
- Sell PoI: The Crossing
- Positive: +10% combat odds
- Negative: +X% ambush chance in woods and mountains while held (suggest start 5–10%)
- Sprite: new. 16×16: head + shoulders + a vertical pole rising over the head with a small flag. Top-half-on-buttons works because the flag sits above the head.
- Lore pool: new `CAPTAIN_BUY_LINES`, `CAPTAIN_SELL_LINES`, `CAPTAIN_BARKEEP_TIPS`.

### 6. Fisherman

A fisherman (person) hired in some towns. Every lake the company visits yields twice the food. His gear is heavy enough that fleeing costs the company an extra soldier.

- Type: person
- Source PoI: Town specialty pool
- Sell PoI: The Crossing
- Positive: double lake yields
- Negative: +1 troop loss per flee in combat
- Sprite: new. 16×16: head + shoulders + wide-brim hat + rod or pole over one shoulder (vertical line rising above the figure).
- Lore pool: new `FISHERMAN_BUY_LINES`, `FISHERMAN_SELL_LINES`, `FISHERMAN_BARKEEP_TIPS`.

### 7. Magpie

A tame magpie bought at farms. She palms a coin out of any payment about a third of the time. Her purchase price is noticeably higher than the other Farm animals.

- Type: animal
- Source PoI: Farm specialty pool
- Sell PoI: The Crossing
- Positive: probabilistic refund — on each payment the player makes (any gold or food deducted by an action button, including the Wyrm bribe and future taverns/gambling stakes), 30% chance to refund 1. Player sees the original price quoted; gold check against the original; on a successful roll the deduction is reduced by 1 and the magpie sprite flashes. The Crossing's sell-side payouts are refunds to the player, not payments, and do not count.
- Negative: none for demo. Balance via probability gating + higher purchase price (2–3× a Mule's cost).
- Sprite: new. 16×16: small bird, black-and-white split, long tail.
- Lore pool: new `MAGPIE_BUY_LINES`, `MAGPIE_SELL_LINES`, `MAGPIE_BARKEEP_TIPS`.

## PoI changes

### Farm — specialty pool

- Buttons: Buy food / Buy [specialty] / Leave
- Specialty pool: {Mule, Boar, Magpie}
- Each Farm has one specialty assigned at worldgen by seed.

### Camp — specialty pool

- Buttons: Search / Hire [specialty] / Leave
- Specialty pool: {Scout, Captain}
- Each Camp has one specialty assigned at worldgen.

### Town — specialty pool

- Buttons: Buy food / Hire [specialty] / Leave
- Specialty pool: {Scout, Healer, Fisherman}
- Each Town has one specialty assigned at worldgen.
- Once taverns land, tavern rumors may reveal which Town carries which specialty.

### The Crossing — new sell-only PoI

- Buttons: [slot 1] / [slot 2] / [slot 3] / Leave — each shows the held slot's sprite; tapping sells that slot for half its original purchase price. Empty slot buttons are hidden.
- Type name: *Crossing*
- Instance name pool: *Salt Crossing*, *Crow's Crossing*, *Brass Crossing*, *Three-Lane Crossing*, *Big Oak Crossing*, *Stoneford Crossing*, *Pilgrim's Crossing*
- Diegesis: a road junction where caravans pass and trade with passing travelers. Drovers, smiths, and factors buy what you carry. The fiction is bi-directional; the mechanic is one-directional sell-only.
- Worldgen: 1–2 per map, fixed at worldgen.

### Naming conflicts to resolve

- `Ember Cross` (Camp pool) → `Ember Watch`
- `Weather Cross` (Henge pool) → `Weather Stones`

## Implementation notes

- **Mule lore pool rename.** `FARM_BUY_BEAST_LINES` → `MULE_BUY_LINES`, `FARM_BEAST_ALREADY_LINES` → `MULE_ALREADY_LINES`. Touches callsites beyond `lore.ts`. Land alongside the Boar so the Mule-related work happens in one place.
- **Magpie price-quoting UX.** The player must see the *original* price; the gold check is against the original; the deduction is reduced by 1 only on a successful 30% roll. Confirm against the existing town-purchase flow before locking implementation.
- **Boar/Mule bidirectional exclusion.** At purchase time, check the held slots. Refuse buy with one of two lore pools depending on direction (`BOAR_MULE_REFUSED_LINES` or `MULE_BOAR_REFUSED_LINES`). Same UX pattern as "you already have a beast at heel" today.
- **Sprite-flash animation primitive.** One shared animation, used by every event-triggered P or N. Wire up for: Mule N1, Healer P5+N9, Boar P3'+N15, Captain P4+N7, Fisherman P8+N8, Magpie P. See [`slot-system.md`](./slot-system.md#sprite-flash-on-activation) for the convention.
- **Specialty pool infrastructure.** Generalize the existing single-Hire-Scout pattern at Camps/Towns into a per-PoI specialty (one of the slot pool, chosen at worldgen by seed). Farms gain the same pattern. Modal stays 3 buttons + Leave.

## Deferred (canonical list lives in [`backlog.md`](./backlog.md))

- Magpie negative: tavern-noticed-theft combat trigger — depends on taverns and gambling landing.
- Human Haggler (peddler / chapman) as a person-flavored economy slot alongside Magpie.
- Bear at a Menagerie PoI as a third animal slot.
- The Menagerie PoI itself, revived if a third+ exotic animal joins the roster.
- Boat-lake PoI as a parallel source for the Fisherman.
- Elephant Captain as animal fallback if the banner sprite proves too tight.
- Magpie's original gambling positive — revisit when gambling lands.
- Goblin slot — depends on whether goblins land as combat enemies or a people.
- Crossing as bi-directional bazaar (buy + sell at the same PoI).
- Rainbow's-End variant of the terrain-restriction negative — interesting only if a slot needs a specific cost.

## References

- [`slot-system.md`](./slot-system.md) — living catalog of P/N effects and pairing rules
- [`lore-and-tone.md`](./lore-and-tone.md) — world tone, companion register, what the world doesn't have
- [`backlog.md`](./backlog.md) — roadmap phasing and the canonical deferred list
- [`../src/core/lore.ts`](../src/core/lore.ts) — line pools
