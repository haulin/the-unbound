# The Slot System

Catalog of Positive and Negative effects that any slot — current or future — can draw from. The pairing rules and the sprite-flash UI convention live here too.

The actual slot roster, the PoI changes (Farm/Camp/Town specialty pools, The Crossing), the implementation phasing, and the parked/deferred ideas live in [`backlog.md`](./backlog.md). World tone and diegetic reasoning behind these choices live in [`lore-and-tone.md`](./lore-and-tone.md). Lore lines themselves live in [`../src/core/lore.ts`](../src/core/lore.ts).

## Pairing rules

- A slot's negative must bite *adjacent* to its positive — same domain, different beat. Same-resource cancellation (+1 gold / -1 gold) is forbidden because it nets to zero and gives no strategic shape.
- Effects fire on discrete events (combat, Camp Search, Town visit, flee, ambush roll, etc.). Per-step ticks are banned — they generate UI noise and force constant attention.
- Passive stat changes are allowed but discouraged. Where an event-trigger can carry the cost, prefer it.
- Positive-only slots are allowed when the 1-of-3 slot opportunity cost is enough balance.
- Aim for unique negatives across active slots. Duplicates should be reviewed.

## Sprite-flash on activation

Convention for any slot whose effect fires at a discrete event: pulse the slot's button-strip icon for 200–400ms. One animation primitive, used by every event-triggered P or N. Makes the cause visible to the player.

## Positive effect pool

Effects available to current or future slots. Grouped by domain.

### Food / inventory

- +50 food carry cap
- Double lake yields
- Biome finder: chance of +1 food per visited tile of a specific biome
- Free food on flee
- First aid: prevent next starvation casualty

### Army / combat

- +10% combat odds
- Opening volley: kill ~25% of enemy army at start of combat (with floor and cap)
- Kick in a pinch: +1 guaranteed hit on round 1
- Revive 1 wounded soldier per combat
- Free flee: no troop loss on next flee
- Skip one combat per run (sneak / distract past)
- +1 troop per Camp Search

### Navigation

- Halve woods/swamp lost chance
- Reveal farms/camps/henges on the map when oriented

### Economy

- Prices -1 in towns
- Reduce any payment by 1 gold or food
- Probabilistic refund of 1 on any payment (~30% chance)
- Biome finder: chance of +1 gold per visited tile of a specific biome
- Better gambling odds at taverns *(depends on taverns landing)*

## Negative effect pool

### Food / inventory

- -1 food per Camp Search
- -1 food per combat
- -1 lake yield (post-doubling)

### Army / combat

- +X% ambush chance in woods/mountains
- +1 troop loss per flee
- Enemy gets +1 first hit (loud)
- -10% combat odds
- -1 troop per Camp Search

### Navigation

- +X% lost chance in woods/swamp

### Economy

- -1 gold per Town visit
- +1 prices in towns
- Locksmith asks +N gold/food
- Worse gambling odds at taverns *(depends on taverns landing)*
- Barkeep tips/rumors cost more *(depends on taverns landing)*

### Cooldowns

- +1 cooldown on lakes/camps/henges

### Terrain

- Cannot enter a specific terrain (Rainbow's End variant: no gold from rainbows while held)
- -1 troop on first step into a specific terrain

### Constraint

- Cannot coexist with another named slot
