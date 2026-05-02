# Tentative roadmap (The Unbound)


**v0.4 — PoI Rework & Terrain Payoff**
- Farms become modal encounters: Buy Food (cheap, gold) / Buy Beast (one per run, gold) / Leave
- Food carry limit, 2 per troop, tame beast possession adds +50
- Farms sell food cheaper than towns, guaranteed stock, no cooldown on purchase, sells tame beast
- Camps reworked: Search (food + troops, cooldown) / Local Map (fixed price, fixed radius, buyer beware) / Leave
- Locksmith becomes modal: Pay Gold / Give food / Leave (Offer Troops deferred)
- Lake: fishing gives 2-3 food on visit, cooldown, re-orients position
- Rainbow's end: gives gold on visit (both ends), one-time per run or cooldown
- Henge fights scale harder (enemy = player×2..player×3 (min 10)), reward 10..25 gold+food
- Swamp upside: small chance of rare herb (food bonus or combat buff) or gold from a corpse
- Mountains upside: small chance of cave loot (gold or food cache)

**v0.5 — Random Encounters & World Texture**
- Random encounter pool on any tile (5-6 types): loot find / lone soldier joins / cursed tile / abandoned supplies / fellow traveller with rumor / something negative TBD
- Camps re-orient position (consistent with farms/signposts/towns)
- Multiple flavor text variations per tile type (deterministic rotation by seed+step)
- Contextual first-visit lore for every mechanic introduced so far

**v0.6 — Taverns**
- Tavern PoI (named, standalone, one or two per map)
- Buy rumors: reveals one named PoI location for gold (locksmith, gate, random landmark)
- Gambling mini-game (bet gold, contextual buttons, slight house edge)
- Tavern flavor text pool (warmer, unreliable narrator register)

**v0.7 — Sanctuary & Special Items**
- Sanctuary PoI (named, rare — one per map)
- Pegasus: buy for gold, one-use fast travel to any visited tile
- Tame Beast moves here from farms if beast-on-farm feels narratively weak in playtests
- Sanctuary flavor text pool (strange, feral register)

**v0.8 — Second Gate (Silver)**
- Silver keyholder, silver gate, silver border
- Map size increases (10×10)
- Scout / beast / pegasus carry over between gates
- Balance pass across full run arc: food, gold, army, run length

**v0.9 — Polish & Teaching**
- Game over messages per cause (starvation, combat, fleeing with 1 troop)
- Win messages per gate tier
- Full flavor text audit — tone consistency, missing tile types, first-visit teaching lines
- Sprite audit and bank reshuffle if needed

**v1.0 — Third Gate & Release Candidate**
- Gold gate, gold border
- Epic map size (15×15)
- Full balance pass
- Paid content gate (one gate free, two gates paid — Hoplite model)
- Itch.io + web release, Android via Capacitor if viable

## Issues
- Fleeing a fight from henge starts cooldown.
- Leaving a camp shows no message.
- Arriving in a farm with 1 food gives food, but game over as well.
- When I accidentally leave a town I cannot return, have to step out and back.
- It's a bit rough when neither town sells food.
- The fight algo is a bit weird. Long streaks of hit or miss.

# Deferred backlog

This file captures ideas discussed during design, kept out of the current phase's implementation plan. Nothing here is committed to; it is a parking lot for later phases.

## Win condition structure

- Keys are quest-locked (not random drops).
- Reach three gates with three keys to win.

## World scale / run types

- Map size presets (example): quick 7×7, normal 10×10, epic 15×15.

## UI interaction model (future)

- No tutorial screens; teach via contextual one-line text when mechanics first appear.
- Possibly variations for every terrain type, not just one every time.
- Contextual action pad: (farm/shop/town “beats”, loot flows, etc.); combat uses fight/return + corners today.
- Event “beats” that remap the 3×3 grid for non-combat encounters (loot → Collect/Leave; etc.), potentially with consistent corner/meta placement.
- Left panel: reuse combat-style mode transitions for other modes (town, shop) if/when added.
- Animation scheduling: consider extracting reducer-side animation enqueueing into a dedicated pure helper once iteration stabilizes.

## Visibility / navigation

- Replay of the steps at game end.

## Economy / combat / encounters

- Richer encounter types beyond current combat (traps, loot beats, etc.).
- Mountains/swamps can cluster: if we increase their food cost, they should also carry “opportunity” (bonus events/loot/higher encounter odds) so they feel like risk/reward.
- Event spawn probabilities influenced by player stats and time-since-visit (e.g., when poor, more likely to find a chest).
- Consider making roads cost food only ~50% of the time (mechanics/balance change; would require tests + tuning).
- Buy map features - add Cs, Fs, Ts for gold.
- Collectibles to find.

## shop clarity (deferred)

- Balance pass: town prices, scout cost, combat gold drops.
- Town offer UI: decide whether to show quantity, price, or both (e.g. `3/5`), and whether bundle sizes should vary per offer/town.
- Farms selling food (cheaper than towns).

## Tavern / rumors (deferred)

- Tavern where you pay for rumors explaining game mechanics.
- Barkeep/tavern tips pool lives in `src/core/lore.ts` as `BARKEEP_TIPS` (UI not implemented yet).

## Swamp opportunity

Swamps are pure-risk (lost only). If playtest shows swamps are universally avoided:

- Strange-fish food find (1–3 food, RNG-amount, mutually exclusive with the lost roll). Same shape as combat reward; "probabilistic flavor" pattern is already established (deterministic flavor picker + RNG amount).
- Or: under future Scout (deferred companions), swamps cost less food when Scout slot is filled (Cartographer-style effect).


## Prototype follow-ups

- Spawn safety: ensure starting position is at least ~5 tiles away (torus Manhattan) from the Gate (and maybe other PoIs).
- Food delta UX: consider collapsing `-1` + `+N` into a single animated net delta when both occur on the same move.
- Two signposts should not point to the same PoI?

## Companions as quest rewards (deferred)

Instead of or alongside keys, each gate world contains a named companion who has been trapped longer than you. Finding and convincing them to join requires a meaningful quest (cost scales with gate tier). Each companion removes a persistent friction from the game:

Cartographer — reveals unvisited landmarks on the coordinate view; "lost" events are shorter
Healer — plagues and battle losses reduced; eats extra food as upkeep
Tame beast — increases max food carry capacity beyond army_size×2

With all three companions at the final gate, the ending changes. "You don't go alone."
Companions make late-game feel like earned evolution rather than stat accumulation. Each stage can be designed with/without specific companions in mind. Requires per-stage progression redesign — defer until core loop is validated across all three gates.
