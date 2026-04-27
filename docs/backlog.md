# Deferred backlog (The Unbound)

This file captures ideas discussed during design, kept out of the current phase's implementation plan. Nothing here is committed to; it is a parking lot for later phases.

## World scale / run types

- Map size presets (example): quick 7×7, normal 10×10, epic 15×15.
- Wrapping worlds as a way to make small maps feel larger.

## UI interaction model (future)

- Contextual action pad: most gameplay is choosing among ~5 buttons; at most 9 shown.
- Event “beats” that remap the 3×3 grid temporarily (fight → Attack/Flee; loot → Collect/Leave; goal → OK), potentially with consistent corner/meta placement.
- “Sprites for all buttons” to avoid text-heavy UI; placeholders acceptable early.

## Visibility / navigation

- Minimap with visited/revealed tiles (fog-of-war).
- “Lost” mechanic: coordinates disappear until a recognizable landmark is found.

## Economy / combat / encounters

- Resources: gold. (Food basics implemented in v0.0.5; hunger→army pressure implemented in v0.0.6; gold comes later.)
- Towns sell food and troops.
- Combat as main encounter type, but not the only one.
- Mountains/swamps can cluster: if we increase their food cost, they should also carry “opportunity” (bonus events/loot/higher encounter odds) so they feel like risk/reward.
- Cooldowns / anti-farming: revisit fight spots yields diminished/blocked encounters (“spirits are quiet; come back later”).
- Event spawn probabilities influenced by player stats and time-since-visit (e.g., when poor, more likely to find a chest).
- Tavern where you pay for rumors explaining game mechanics.

## Prototype follow-ups

- Spawn safety: ensure starting position is at least ~5 tiles away (torus Manhattan) from the Castle (and maybe other PoIs).
- Food delta UX: consider collapsing `-1` + `+N` into a single animated net delta when both occur on the same move.
- Spawn-on-signpost: goal narrative concatenates with signpost message and can get clipped; consider prioritizing signpost message (or a shorter goal line) at start.
- Two signposts should not point to the same PoI?
- Lore styling: render lore body text in grey, and render place names (Castle / Farm names) in white for emphasis.

## Win condition structure

- Keys are quest-locked (not random drops).
- Reach three gates with three keys to win.

## Teaching / tutorial philosophy

- No tutorial screens; teach via contextual one-line text when mechanics first appear.
- Possibly variations for every terrain type, not just one every time.


