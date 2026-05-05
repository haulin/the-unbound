# Tentative roadmap (The Unbound)

UI update intermezzo:
- donkey overlaps steps stat. Need to reshuffle UI again.

**v0.5 — Camps, Terrain Upsides & Henge Scaling**
- Camps reworked: Search (food + troops, cooldown) / Local Map (fixed price, fixed radius, buyer beware) / Leave
- Buy map features - add Cs, Fs, Ts, Rs, L/G for gold.
- Fights rework - more enemies should yield bigger rewards, winning against 2x armies is sometimes impossible. Maybe introduce a combo breaker where player lands a guaraneed hit after missing 3-4x in a row.
- Henge fights scale harder (enemy = player×2..player×3 (min 10)), reward 10..25 gold+food
- Maybe recruit button in fights that allows to pay gold for remaining troops - 1/1, 2/4, 3/9, 4/16, etc
- Swamp upside: small chance of rare herb (food bonus or combat buff) or gold from a corpse
- Mountains upside: small chance of cave loot (gold or food cache)
- Mountains/swamps can cluster: if we increase their food cost, they should also carry “opportunity” (bonus events/loot/higher encounter odds) so they feel like risk/reward.

- for everything we should audit lore.ts and make sure to update lines to reflect new mechanics.

**v0.6 — Random Encounters & World Texture**
- Random encounter pool on any tile (5-6 types): loot find / lone soldier joins / cursed tile / traps / abandoned supplies / fellow traveller with rumor / something negative TBD
- In swamps you can find a healer (picking herbs) that can join your party and prevent random deaths
- Multiple flavor text variations per tile type (deterministic rotation by seed+step)
- Contextual first-visit lore for every mechanic introduced so far

Polish for demo:
- Balance pass: town prices, scout cost, combat gold drops...
- Hide debug stuff, pick seed for new game randomly
- title screen, about screen, back to menu, resume
- animations for left panel



**v0.7 — Taverns**
- Tavern PoI (named, standalone, one or two per map)
- Buy rumors: reveals one named PoI location for gold (locksmith, gate, random landmark)
- Gambling mini-game (bet gold, contextual buttons, slight house edge)
- Tavern flavor text pool (warmer, unreliable narrator register)

**v0.8 — Sanctuary & Special Items**
- Sanctuary PoI (named, rare — one per map)
- Pegasus: buy for gold, one-use fast travel to any visited tile
- Tame Beast moves here from farms if beast-on-farm feels narratively weak in playtests
- Sanctuary flavor text pool (strange, feral register)

**v0.9 — Second Gate (Silver)**
- Silver keyholder, silver gate, silver border
- Map size increases (10×10)
- Scout / beast / pegasus carry over between gates
- Balance pass across full run arc: food, gold, army, run length

**v0.10 — Polish & Teaching**
- Game over messages per cause (starvation, combat, fleeing with 1 troop)
- Win messages per gate tier
- Full flavor text audit — tone consistency, missing tile types, first-visit teaching lines
- Sprite audit and bank reshuffle if needed

**v0.11 — Third Gate & Release Candidate**
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
- Food delta UX: consider collapsing `-1` + `+N` into a single animated net delta when both occur on the same move.
- Two signposts should not point to the same PoI?

# Deferred backlog

This file captures ideas discussed during design, kept out of the current phase's implementation plan. Nothing here is committed to; it is a parking lot for later phases.

## After demo wishlist
- Map size presets (example): quick 7×7, normal 10×10, epic 15×15.
- Reach three gates with three keys to win.
- Replay of the steps at game end.
- Event spawn probabilities influenced by player stats and time-since-visit (e.g., when poor, more likely to find a chest).

## Ideas
- The fight algo is a bit weird. Long streaks of hit or miss.
- when map is toggled on we should highlight the button more - white border maybe
- skip modal if nothing to do (not enough money or cooldown - camp/farm/town)
- maybe adjust worldgen as it feels like swamps & mountains are too common
- Consider making roads cost food only ~50% of the time (mechanics/balance change; would require tests + tuning).
- Collectibles to find.
- buying scout shows animation - switch to show map, reveal tiles, hide map (if it was hidden)
- active item that allows you to auto-win a fight or land a hit at least

## Tech
- Animation scheduling: consider extracting reducer-side animation enqueueing into a dedicated pure helper once iteration stabilizes.




## UI interaction model

- No tutorial screens; teach via contextual one-line text when mechanics first appear.

## shop clarity (deferred)

- Town offer UI: decide whether to show quantity, price, or both (e.g. `3/5`), and whether bundle sizes should vary per offer/town.

## Tavern / rumors (deferred)

- Tavern where you pay for rumors explaining game mechanics.

## Swamp opportunity

Swamps are pure-risk (lost only). If playtest shows swamps are universally avoided:

- Strange-fish food find (1–3 food, RNG-amount, mutually exclusive with the lost roll). Same shape as combat reward; "probabilistic flavor" pattern is already established (deterministic flavor picker + RNG amount).
- Or: under future Scout (deferred companions), swamps cost less food when Scout slot is filled (Cartographer-style effect).


## Prototype follow-ups

- Spawn safety: ensure starting position is at least ~5 tiles away (torus Manhattan) from the Gate (and maybe other PoIs).
- Mechanics registry: add a build-time validator that every `Encounter['kind']` value has a registered `reduceEncounterAction` handler. Today the dispatch silently no-ops if a handler is missing — fine in practice but unfriendly when adding a new encounter and forgetting to wire it.
- Reducer global-allowlist tests: add a focused unit test asserting that `ACTION_TICK` prunes anims and `ACTION_TOGGLE_MAP` works during an active encounter. Today these are covered indirectly via acceptance tests; an explicit reducer-level test would lock the contract that globals always run before encounter dispatch.
- Mechanics registry: replace the runtime `throw` checks in `src/core/mechanics/registry.ts` (rightGrid/reduceEncounterAction without encounterKind, duplicate encounterKind, kind-not-claimed for `enterFoodCostByKind` / `moveEventPolicyByKind`, policy percent ranges) with type-level constraints. Once moved into types, the file shrinks to ~15 lines of pure derivation.
- Animation framework: domain code (`src/core/mechanics/defs/combat.ts`, `src/core/mechanics/encounterHelpers.ts`) shouldn't reference `ENABLE_ANIMATIONS`. The `enqueue*` helpers should no-op silently when animations are off, and only the renderer should branch.
- Combat lore categorization (`ambush` vs `provoked`): combat owns intent-keyed line pools; source mechanics (henge, woods, swamp, mountain) signal intent rather than passing prebuilt strings. Defer until a third combat trigger appears.
- Encounter open: each `onEnterTile` for an encounter mechanic re-checks `cell.kind` and re-fetches the cell via `getCellAt`. The dispatcher already narrows `cell.kind`; the second guard is dead defensive code. Drop after a sweep.

## Companions as quest rewards (deferred)

Instead of or alongside keys, each gate world contains a named companion who has been trapped longer than you. Finding and convincing them to join requires a meaningful quest (cost scales with gate tier). Each companion removes a persistent friction from the game:

Cartographer — reveals unvisited landmarks on the coordinate view; "lost" events are shorter
Healer — plagues and battle losses reduced; eats extra food as upkeep
Tame beast — increases max food carry capacity beyond army_size×2

With all three companions at the final gate, the ending changes. "You don't go alone."
Companions make late-game feel like earned evolution rather than stat accumulation. Each stage can be designed with/without specific companions in mind. Requires per-stage progression redesign — defer until core loop is validated across all three gates.
