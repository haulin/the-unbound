# Tentative roadmap (The Unbound)



v0.1 — The Map & Scout

Coordinate display blanks when lost (teleport events trigger this)
Lost resolves on visiting any known landmark
Scout companion slot (structural only — joins you, reveals unvisited PoIs on coordinate view)
Scout acquisition deferred to gold epic

v0.2 — Towns

Town PoI (named, combined farm+camp+one action)
Up to 4 contextual buttons (3 actions + leave)
Town flavor text pool
Structurally ready for gold transactions without implementing them yet

v0.3 — Gold (mini-epic)

Gold resource (display, earn from combat, carry limit TBD)
Town sells food and troops for gold
Keyholder price becomes gold instead of food
Scout hired in town for gold

v0.4 — Second Gate

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
