# Tentative roadmap (The Unbound)



v0.1 — Lost

Coordinate display blanks when lost (teleport events trigger this)
Swamp and woods can teleport the player (lost mechanic)
Lost resolves on visiting an orienting feature (signpost, farm)
Mutually exclusive with combat ambush via single per-move event roll
Run starts unoriented; starting tile is inert (no auto-orient)

v0.2 — Map & Scout

Scout companion slot (structural only — joins you, reveals nearest unvisited orienting feature on coordinate view)
Scout acquisition deferred to gold epic
cell.visited tracking
Simplified game-map button (4th left-panel slot). Open design questions:
  - Render visited orienting features as: dots vs tiny 8×8 sprites vs letters (G/L/F/S/T)?
  - Are signposts shown on the map?
  - Under Scout, are gate and locksmith revealed (even though they don't orient)?

v0.3 — Towns

Town PoI (named, combined farm+camp+one action)
Up to 4 contextual buttons (3 actions + leave)
Town flavor text pool
Structurally ready for gold transactions without implementing them yet

v0.4 — Gold (mini-epic)

Gold resource (display, earn from combat, carry limit TBD)
Town sells food and troops for gold
Keyholder price becomes gold instead of food
Scout hired in town for gold

v0.5 — Second Gate

Silver keyholder, silver gate, silver border
Map size step up (10×10)
Balance pass across full run

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
- Contextual action pad: extend beyond v0.0.7 combat (farm/shop/town “beats”, loot flows, etc.); combat uses fight/return + corners today.
- Event “beats” that remap the 3×3 grid for non-combat encounters (loot → Collect/Leave; etc.), potentially with consistent corner/meta placement.
- Left panel: reuse combat-style mode transitions for other modes (town, shop) if/when added.
- Animation scheduling: consider extracting reducer-side animation enqueueing into a dedicated pure helper once iteration stabilizes.

## Visibility / navigation

- Minimap with visited/revealed tiles (fog-of-war).
- “Lost” mechanic: coordinates disappear until a recognizable landmark is found.

## Economy / combat / encounters

- Resources: gold. (Food basics: v0.0.5; hunger→army: v0.0.6; combat food rewards + encounters: v0.0.7; gold economy later.)
- Towns sell food and troops.
- Richer encounter types beyond current combat (traps, loot beats, etc.).
- Mountains/swamps can cluster: if we increase their food cost, they should also carry “opportunity” (bonus events/loot/higher encounter odds) so they feel like risk/reward.
- Event spawn probabilities influenced by player stats and time-since-visit (e.g., when poor, more likely to find a chest).
- Tavern where you pay for rumors explaining game mechanics.
- Collectibles to find.

## Swamp opportunity (deferred from v0.1)

Swamps in v0.1 are pure-risk (lost only). If playtest shows swamps are universally avoided:

- Strange-fish food find (1–3 food, RNG-amount, mutually exclusive with the lost roll). Same shape as combat reward; "probabilistic flavor" pattern is already established (deterministic flavor picker + RNG amount).
- Or: under future Scout (deferred companions), swamps cost less food when Scout slot is filled (Cartographer-style effect).

## Woods fog tuning (potential follow-up to v0.1)

If the lost mechanic feels good on swamp+woods, no further work. If swamp-only feels more lore-pure, woods-lost can be split off as a future toggle (`WOODS_LOST_PERCENT = 0`).

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
