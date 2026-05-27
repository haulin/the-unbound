# Tentative roadmap (The Unbound)

UI update intermezzo:
- donkey overlaps steps stat. Need to reshuffle UI again.

**v0.5 — The Wyrm**

Main-arc obstacle that gives a run its middle act. Lives in a cave in the mountains; bleeds when bested; the Locksmith needs the blood as the quench for the bronze key.

- Lair PoI: cave-tile sprite; worldgen places it by replacing a mountain tile in a mountain cluster (once per map).
- Wyrm encounter: combat with action buttons — Fight / Pay (bribe in gold to draw blood without combat) / Flee.
- Non-lethal framing: combat ends when blood is drawn; the wyrm crawls back to recover. No death animation needed.
- The Blood: new inventory state, like the bronze key. UI indicator alongside the key icon.
- Pay button pattern debuts here in combat.
- Fights rework - more enemies should yield bigger rewards, winning against 2x armies is sometimes impossible. Maybe introduce a combo breaker where player lands a guaraneed hit after missing 3-4x in a row.
- The fight algo is a bit weird. Long streaks of hit or miss.
- Locksmith change: additive — requires Blood + existing gold/food payment. Without Blood, no modal opens; tile shows inline flavor only (uses the planned "skip modal if nothing to do" pattern from Ideas).
- Signpost wiring: Lair becomes a valid signpost target alongside Locksmith and Gate.
- Barkeep tips: `wyrm` category added to existing town tip pool; `goal` category extended with quench/wyrm hints.
- First-visit Lair lore.
- Lore writing: `WYRM_*` line pools, `LAIR_*` pool, `LOCKSMITH_NO_BLOOD_LINES`, `LOCKSMITH_BLOOD_READY_LINES`, and updated `LOCKSMITH_PURCHASE_LINES` with quench beats.
- Audit `lore.ts` mechanics index against final implementation.

**v0.6 — Camps, Towns, Terrain & Henge Scaling**

- Camps reworked: Search (food + troops, cooldown) / Local Map (fixed price, fixed radius, buyer beware) / Leave
- Buy map features - add Cs, Fs, Ts, Rs, L/G for gold.
- Rich enemies drop more loot
- Henge fights scale harder (enemy = player×2..player×3 (min 10)), reward 10..25 gold+food
- Maybe recruit button in fights that allows to pay gold for remaining troops - 1/1, 2/4, 3/9, 4/16, etc (reuses Wyrm's Pay pattern)
- Swamp upside: small chance of rare herb (food bonus or combat buff) or gold from a corpse
- Mountains upside: small chance of cave loot (gold or food cache)
- Slot system infrastructure (groundwork for later slot work): generalize the existing single-hire pattern at Camps/Towns into a per-PoI specialty (one of a small pool, fixed at worldgen by seed). Farms get the same pattern. Modal stays 3 buttons + Leave. See `docs/2026-05-27-slot-system-design.md`.
- Scout becomes a Camp specialty (in addition to Towns) via the new pool pattern. Scout already exists; this just adds the Camp variant of the hire flow. Lore lines for `CAMP_SCOUT_HIRE_LINES` / `CAMP_SCOUT_ALREADY_LINES` already in `lore.ts`.

- for everything we should audit lore.ts and make sure to update lines to reflect new mechanics.

**v0.7 — Random Encounters & World Texture**
- Random encounter pool on any tile (5-6 types): loot find / lone soldier joins / cursed tile / traps / abandoned supplies / fellow traveller with rumor / something negative TBD
- Healer specialty hire added to Town pool (replaces the original swamp-healer concept). P5 revive 1 wounded per combat + N9 -1 gold per Town visit (maintenance). Existing sprite. New lore pool `HEALER_*`. See `docs/2026-05-27-slot-system-design.md`.
- Multiple flavor text variations per tile type (deterministic rotation by seed+step)
- Contextual first-visit lore for every mechanic introduced so far

Polish for demo:
- Balance pass: town prices, scout cost, combat gold drops...
- Wyrm balance: combat tuning, Blood/payment economy.
- Hide debug stuff, pick seed for new game randomly
- title screen, about screen, back to menu, resume
- animations for left panel
- more exciting win / lose

**v0.8 — Slot System: Trading & Farm Animals**

See `docs/2026-05-27-slot-system-design.md` for the full design.

- The Crossing PoI: new sell-only PoI. Buttons show held slots' sprites; tapping sells that slot for half its purchase price. Instance name pool: Salt Crossing, Crow's, Brass, Three-Lane, Big Oak, Stoneford, Pilgrim's. Worldgen: 1–2 per map.
- Sprite-flash animation primitive: pulse slot icon when event-triggered effect fires. Shared by all slots with event-driven P or N.
- Boar specialty added to Farm pool. P3' opening volley (~25% of enemy army at combat start) + N15 bidirectional Mule exclusion. New 16×16 sprite (low body, bristled back, tusks). Lore lines for `BOAR_*` and `*_REFUSED_LINES` already in `lore.ts`.
- Mule update (paired with Boar): wire Mule end of the bidirectional exclusion. Mule N1 (-1 food per Camp Search) gets the sprite-flash treatment in passing.

**v0.9 — Slot System: People & Economy**

- Captain specialty added to Camp pool. P4 +10% combat odds + N7 +ambush% in woods/mountains. New 16×16 sprite (head + shoulders + flag-on-pole). New lore pool `CAPTAIN_*`.
- Fisherman specialty added to Town pool. P8 double lake yields + N8 +1 troop loss per flee. New 16×16 sprite (rod-on-shoulder). New lore pool `FISHERMAN_*`.
- Magpie specialty added to Farm pool. P probabilistic 30% refund on folk payments (Town food, Camp/Town hires, Locksmith fee); shows original price, gold check against original, refund visible. No demo negative; balanced by probability + higher purchase price. New 16×16 bird sprite. New lore pool `MAGPIE_*`.
- Final slot-system audit against `docs/slot-system.md` (pairing rules, P+P slot exemptions, ledger consistency).

**v0.10 — Taverns** (demo release milestone)
- Tavern PoI (named, standalone, one or two per map)
- Buy rumors: reveals one named PoI location for gold (locksmith, gate, lair, random landmark)
- Gambling mini-game (bet gold, contextual buttons, slight house edge)
- Tavern flavor text pool (warmer, unreliable narrator register)
- Tavern rumors may reveal which Town carries which specialty hire (Scout / Healer / Fisherman).

**v0.11 — Second Gate (Silver)**
- Silver keyholder, silver gate, silver border
- Map size increases (10×10)
- Slot system carries over between gates (all seven slots persist).
- Balance pass across full run arc: food, gold, army, run length

**v0.12 — Polish & Teaching**
- Game over messages per cause (starvation, combat, fleeing with 1 troop)
- Win messages per gate tier
- Full flavor text audit — tone consistency, missing tile types, first-visit teaching lines
- Sprite audit and bank reshuffle if needed

**v0.13 — Third Gate & Release Candidate**
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
- Pegasus / fast-travel: bought somewhere for gold, one-use jump to any visited tile. Unsolved: destination selection UI within the 4-button constraint. Was a v0.8 milestone item, deferred until the UI question is answered.
- Multi-criteria gate test for silver/gold gates: "the gate measures you." Bronze accepts the key alone; silver might accept key OR (key + army threshold); gold asks everything (key AND army AND gold AND something else). Gives runs alternate paths and reasons to over-build a stat.
- Dynamic `GOAL_NARRATIVE` that rewrites itself as the player learns: prologue → "the forge has heat enough but lacks the quench" → "the smith is waiting" → "only the gate remains." Held back from demo so first-time players can discover the arc; revisit when most players have multiple runs under their belt.
- Cross-run memory: persistent flags for "you bled the Wyrm in a prior run" and similar achievements. Lets returning players skip rediscovery and explore other corners of the world. Tone already supports it (lore says "this time might be different"); scope is large.
- Ordinary key as a learnable mistake: let the Locksmith forge a key without the Blood; the gate refuses it; player learns by failure. Brutal for first-timers, interesting for hard mode / repeat players.

## Slot system — deferred (post-demo)

See `docs/2026-05-27-slot-system-design.md` for the demo roster.

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

## Ideas
- when map is toggled on we should highlight the button more - white border maybe
- disabled buttons rendered with a checkerboard overlay?
- skip modal if nothing to do (not enough money or cooldown - camp/farm/town)
- maybe adjust worldgen as it feels like swamps & mountains are too common
- Consider making roads cost food only ~50% of the time (mechanics/balance change; would require tests + tuning).
- Collectibles to find. Maybe just getting one of each creatures (healer/scout/beast) - shows on home page instead of question marks.
- buying scout shows animation - switch to show map, reveal tiles, hide map (if it was hidden)
- active item that allows you to auto-win a fight or land a hit at least
- passive item no food consumed for 10 steps
- bank gives interest on deposits
- an item that gives more gold from fights / selling
- orchard get 5 free food
- plant a tree to pick 5 free food every cooldown
- morale modifying battle odds, +2, +5, +10% either way (curse could lower it, praying at altar could clear a curse)
- every 28 days a plague comes that kills half your army
- different types of enemies (magic/strength) or different loot drops

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

Note: the demo-tier slot system (see `docs/2026-05-27-slot-system-design.md`) covers the *PoI-bought companion* layer. This quest-reward concept is a *late-game evolution* — find named companions through scaling quests in later gates rather than buying them at PoIs. Keep deferred until the core loop validates across three gates.

Instead of or alongside keys, each gate world contains a named companion who has been trapped longer than you. Finding and convincing them to join requires a meaningful quest (cost scales with gate tier). Each companion removes a persistent friction from the game:

Cartographer — reveals unvisited landmarks on the coordinate view; "lost" events are shorter
Healer — plagues and battle losses reduced; eats extra food as upkeep
Tame beast — increases max food carry capacity beyond army_size×2

With all three companions at the final gate, the ending changes. "You don't go alone."
Companions make late-game feel like earned evolution rather than stat accumulation. Each stage can be designed with/without specific companions in mind. Requires per-stage progression redesign — defer until core loop is validated across all three gates.
