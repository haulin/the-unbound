# Deferred backlog (The Unbound)

This file captures non-v1 ideas discussed during design, kept out of the prototype’s implementation plan. Nothing here is committed to; it is a parking lot for later phases.

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

- Resources: army size, gold. (Food basics implemented in v0.0.5; later tie into army pressure/economy.)
- Towns sell food and troops.
- Combat as main encounter type, but not the only one.
- Cooldowns / anti-farming: revisit fight spots yields diminished/blocked encounters (“spirits are quiet; come back later”).
- Event spawn probabilities influenced by player stats and time-since-visit (e.g., when poor, more likely to find a chest).

## Prototype follow-ups (post v0.0.5)

- Spawn safety: ensure starting position is at least ~5 tiles away (torus Manhattan) from the Castle (and maybe other PoIs).
- Food delta UX: consider collapsing `-1` + `+N` into a single animated net delta when both occur on the same move.
- Spawn-on-signpost: goal narrative concatenates with signpost message and can get clipped; consider prioritizing signpost message (or a shorter goal line) at start.
- Lore styling: render lore body text in grey, and render place names (Castle / Farm names) in white for emphasis.

## Win condition structure

- Keys are quest-locked (not random drops).
- Reach three towers with three keys to win.

## Teaching / tutorial philosophy

- No tutorial screens; teach via contextual one-line text when mechanics first appear.

## Dev workflow / repo hygiene (post-prototype)

- Prototype can be run by copy-pasting a **complete single-file cart** (`the-unbound.js`) into TIC-80.
- After the prototype answers the core question, initialize this folder as a **git repo** and start committing changes.
- Keep large reference material out of the repo. Optional: see `LOCAL.md` (local-only) for offline reference docs.
- Consider a TypeScript + build step for later phases (out of scope for the prototype).

