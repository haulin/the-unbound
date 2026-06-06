# Tentative roadmap (The Unbound)

Tentative milestones plus ideas in other sections below. Each milestone should close with a **lore pass**: update the mechanics index and line pools in `lore.ts` so they match what shipped (combat copy, new verbs, teaching lines). Catch up previous milestones when a pass was skipped.

## Polish backlog (boy-scout each milestone)

- **Registry kind-coverage validation.** A mechanic declaring `moveEventPolicyByKind: { foo: { ambushPercent: 100 } }` without a matching `combatVariantByKind[foo]` falls through to the preview placeholder silently. Add a registry-time check (`docs/backlog.md` already tracks this in the broader registry hardening task).
- **Recruit helper coupling (henge → mountain).** `henge.ts` imports `brigandRecruitCost` / `brigandRecruitEligibility` / `brigandRecruitLootScale` from `mountain.ts` because both use the same recruitable-bandit math. That ties a PoI encounter to a terrain file and makes brigand tuning silently affect henge. Extract neutral shared helpers (e.g. `recruitableBandit.ts` or combat-layer recruit utilities) when a third recruitable source appears—or sooner if recruit rules diverge per variant.

## Issues
- Arriving in a farm with 1 food gives food, but game over as well.
- Food delta UX: consider collapsing `-1` + `+N` into a single animated net delta when both occur on the same move.
- Two signposts should not point to the same PoI?

## Polish for demo:
- Balance pass: town prices, scout cost, combat gold drops...
- Wyrm balance: combat tuning, Blood/payment economy.
- Hide debug stuff, pick seed for new game randomly
- title screen, about screen, back to menu, resume, controls
- animations for left panel — illustration transitions (modal enter/leave, overworld move), lore line stagger. **Spec:** `docs/plans/2026-06-05-button-badges-design.md` § Phase 2 pointer + addendum 2026-06-05.
- lore audit and polish
- more exciting win / lose

## Ideas
- loot drops in lore title +Ng/+Mf/+Ls
- make rainbows modals - if player chooses to not take gold, next visit it increases, maybe sell rumors as well - camps can do the same
- Fight hit/miss is shown in lore lines.
- first hit in fights does a max N damage (10?)
- sound fx
- Consider making roads cost food only ~50% of the time (mechanics/balance change; would require tests + tuning).
- skip modal if nothing to do (not enough money or cooldown - camp/farm/town)
- every 28 days a plague comes that kills half your army
- buying scout shows animation - switch to show map, reveal tiles, hide map (if it was hidden)
- show round number during fights
- battle log - every fight attempt marks ✓/✗ in the lore lines
- morale modifying battle odds, +2, +5, +10% either way (curse could lower it, praying at altar could clear a curse)
- active item that allows you to auto-win a fight or land a hit at least
- passive item no food consumed for 10 steps
- bank gives interest on deposits
- an item that gives more gold from fights / selling
- orchard get 5 free food
- plant a tree to pick 5 free food every cooldown
- different types of enemies (magic/strength) or different loot drops
- companion that allows you to recruit goblins (goblin chief?)
- Camp local map — see *Camp local map* in Deferred backlog.
- maybe adjust worldgen as it feels like swamps & mountains are too common
- When I accidentally leave a town I cannot return, have to step out and back. Consider 5 action buttons with middle leave/reenter.
- PoI leave lines (camp/farm farewell)


**v0.9 — Slot System: Trading & Farm Animals**

See `docs/2026-05-27-slot-system-design.md` for the full design.

- The Crossing PoI: new sell-only PoI. Buttons show held slots' sprites; tapping sells that slot for half its purchase price. Instance name pool: Salt Crossing, Crow's, Brass, Three-Lane, Big Oak, Stoneford, Pilgrim's. Worldgen: 1–2 per map.
- Sprite-flash animation primitive: pulse slot icon when event-triggered effect fires. Shared by all slots with event-driven P or N.
- Boar specialty added to Farm pool. P3' opening volley (~25% of enemy army at combat start) + N15 bidirectional Mule exclusion. New 16×16 sprite (low body, bristled back, tusks). Lore lines for `BOAR_*` and `*_REFUSED_LINES` already in `lore.ts`.
- Mule update (paired with Boar): wire Mule end of the bidirectional exclusion. Mule N1 (-1 food per Camp Search) gets the sprite-flash treatment in passing. Also implement mule negative. Mule upside is not communicated well enough. Only one lore line spells it out.
- Lore pass.

**v0.10 — Random Encounters & World Texture**

- Random encounter pool on specific tiles (probably road/grass): loot find / lone soldier joins / cursed tile / traps / fellow traveller with rumor / something negative TBD
- controller support
- Lore pass.

**v0.11 — Slot System: People & Economy**

- Captain specialty added to Camp pool. P4 +10% combat odds + N7 +ambush% in woods/mountains. New 16×16 sprite (head + shoulders + flag-on-pole). New lore pool `CAPTAIN_*`. Camp preview plate: drop +food on search (3-line cap).
- Fisherman specialty added to Town pool. P8 double lake yields + N8 +1 troop loss per flee. New 16×16 sprite (rod-on-shoulder). New lore pool `FISHERMAN_*`.
- Magpie specialty added to Farm pool. P probabilistic 30% refund on folk payments (Town food, Camp/Town hires, Locksmith fee); shows original price, gold check against original, refund visible. No demo negative; balanced by probability + higher purchase price. New 16×16 bird sprite. New lore pool `MAGPIE_*`.
- Final slot-system audit against pairing rules in `the-unbound-learnings.md` (P+P slot exemptions, ledger consistency).

**v0.12 — Taverns** (demo release milestone)
- Tavern PoI (named, standalone, one or two per map)
- Buy rumors: reveals one named PoI location for gold (locksmith, gate, lair, random landmark)
- Gambling mini-game (bet gold, contextual buttons, slight house edge)
- Tavern flavor text pool (warmer, unreliable narrator register)
- Tavern rumors may reveal which Town carries which specialty hire (Scout / Healer / Fisherman).
- Collectibles to find. Maybe just getting one of each creatures (healer/scout/beast) - shows on home page instead of question marks. Another home page challenge icon is - not using a map the whole run.

**v0.13 — Second Gate (Silver)**
- Silver keyholder, silver gate, silver border
- Map size increases (10×10)
- Slot system carries over between gates (all seven slots persist).
- Balance pass across full run arc: food, gold, army, run length

**v0.14 — Polish & Teaching**
- Game over messages per cause (starvation, combat, fleeing with 1 troop)
- Win messages per gate tier
- Full flavor text audit — tone consistency, missing tile types, first-visit teaching lines
- Sprite audit and bank reshuffle if needed

**v0.15 — Third Gate & Release Candidate**
- Gold gate, gold border
- Epic map size (15×15)
- Full balance pass
- Paid content gate (one gate free, two gates paid — Hoplite model)
- Itch.io + web release, Android via Capacitor if viable

# Deferred backlog

This file captures ideas discussed during design, kept out of the current phase's implementation plan. Nothing here is committed to; it is a parking lot for later phases.

## Hover-focused preview plate

When the player hovers a right-grid offer button, show only that offer's preview-plate lines (e.g. scout hire cost alone) instead of every offer on the PoI. Trade-off: clearer center sprite, but after moving to a modal the cursor often sits on one button and hides the other offers' prices. Revisit with explicit UX (e.g. only on deliberate hover delay, or terminal-only).

## Camp local map

Separate from Scout map reveal and from free exploration. Needs its own design pass before implementation.

**Core idea:** At a camp, pay gold for *local* intelligence (~3 leagues radius). Buyer beware: the roll might reveal nothing new (you already mapped it), or high-value targets (rainbow `R`, wyrm/locksmith/gate `W`/`L`/`G`), or mid-tier PoIs (`T`/`C`/`F`) if you lack a Scout.

**Letter economy (draft tensions to resolve):**

- Exploration still reveals everything eventually (~50-step “optimal” pattern); paid intel is a shortcut, not a replacement for the loop.
- Scout already reveals farms/camps/henges when oriented; paid letters are for players *without* Scout or who want to skip food spend on wandering.
- `R` = pay gold to learn where more gold might be — feels odd; price tiering may need `R` cheap or excluded from camp rolls.
- `W`/`L`/`G` are what players most want; should a camp sell *one* gate-chain hint per visit vs several? Multiple buys per camp vs rumor-style cap?
- Revealing all three of `W`/`L`/`G` from one camp may bypass the intended exploration arc — likely cap to one “tier-1” reveal per purchase or per camp cooldown.
- Alphabet buy menu is *only* meaningful in this feature; do not ship letter SKUs without Local Map.

**Modal vs traversal:** Likely a camp modal action (like Search), not a terrain modal.

## Combat balance — deferred

Items considered during the combat-balance design and parked because each needs its own architectural migration or design week. See `docs/plans/2026-06-01-v0.6-combat-balance-design.md`.

- **Henge tiers** — lesser / standard / great henges with distinct lore, sprite, and band-size envelopes. Needs a worldgen + lore split that the v0.6 single-tier henge does not justify yet.
- **3:1 goblin/brigand territorial mix** — woods sometimes spawn brigands, mountains sometimes spawn goblins, weighted 3:1 by terrain. Requires variant-on-encounter migration (the v0.6 variant lookup is keyed on `cell.kind`, not on the encounter itself); earns its own design.
- **Combo breaker / streak smoothing** — guaranteed hit after a run of misses. Dropped after the Monte Carlo sim (`scripts/combat-sim.mjs`) showed that re-flavoring early-game ambushes as soft-math goblins covers the early-game pain without combat memory state.
- **Rich enemies drop more loot** — subsumed by reward scaling (rewards already scale with `initialSpawn`); revisit only if the variant menu grows a "rich" tier with its own lore.
- **Wyrm gold loot when wounded** — cheapens the prize and conflicts with the wyrm-as-boss tone; the v0.5 design intentionally restricts wyrm loot to the blood-quench narrative.

## UI polish — deferred (post-demo)

Items considered during the v0.5 UI intermezzo and intentionally left for later. The intermezzo had a clear scope (panel structure, sprite-scale, sprite-sheet reshuffle, encounter close fix); these are smaller affordance/legibility improvements that didn't fit.

- **Map-toggle highlighted state.** When the map is open, the (0,2) map button should look pressed (white border or similar) rather than identical to its closed state. Same idea for the minimap toggle at (2,0).
- **Disabled-button overlay.** Buttons that are non-actionable in the current state (e.g. movement during end-of-game) look the same as active ones. A checkerboard or stipple overlay would communicate "this exists but you can't use it" without removing the affordance.
- **Goals-button replacement.** The (0,0) corner is `show_goal`, which is useful early and decorative once the player knows the layout. Candidate replacement: a held-inventory hero slot, freeing the bottom band for something else.

## Button badges — post-ship UX (deferred)

Phase 1 shipped per `docs/plans/2026-06-05-button-badges-design.md` addendum 2026-06-05. Playtest: net positive layout; slightly less accessible than preview plates (stats vs badge eye travel, combat delta readability). Do **not** rollback badges; optional polish only:

- Longer delta hold when deltas anchor to Fight / Pay badges.
- Pulse left-panel army (or enemy) stat on change during combat.
- Badge tint when player cannot afford listed price.
- Combat-only minimalist text strip on illustration (constant-gated escape hatch).

Full Phase 2 (illustration transitions + lore stagger) is a separate milestone — see design doc § Phase 2 pointer.

## Larger encounter illustrations — deferred

Button badges freed the left panel; art is still 16×16 scaled 4×. Upgrade path when sheet budget allows:

- **32×32 @ scale 2** in bank 0: ~8 pieces in a reserved #384–#511 band (16 slots each). No runtime bank work; best first step.
- **64×64 @ scale 1** or **warehouse banks 1–7**: store art off-sheet, stage into a fixed slot in bank 0 via `sync(2, bank, false)` + `memcpy` + `sync(2, 0, false)` over two frames. `sync` only swaps RAM sections (use sprites mask `2`); it does not repaint the screen — draw fully first, sync after paint on frame 1, restore bank 0 before any draw on frame 2. One frame of stale illustration is acceptable at ~5 fps UI cadence.
- Not on current roadmap; revisit with v0.14 sprite audit / bank reshuffle.

## After demo wishlist
- Map size presets (example): quick 7×7, normal 10×10, epic 15×15.
- Reach three gates with three keys to win.
- Replay of the steps at game end.
- Event spawn probabilities influenced by player stats and time-since-visit (e.g., when poor, more likely to find a chest).
- Pegasus / fast-travel: bought somewhere for gold, one-use jump to any visited tile. Unsolved: destination selection UI within the 4-button constraint.
- Multi-criteria gate test for silver/gold gates: "the gate measures you." Bronze accepts the key alone; silver might accept key OR (key + army threshold); gold asks everything (key AND army AND gold AND something else). Gives runs alternate paths and reasons to over-build a stat.
- Dynamic `GOAL_NARRATIVE` that rewrites itself as the player learns: prologue → "the forge has heat enough but lacks the quench" → "the smith is waiting" → "only the gate remains." Held back from demo so first-time players can discover the arc; revisit when most players have multiple runs under their belt.
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

### Effect pool (brainstorm catalog)

Effects available to current or future slots. Includes both already-wired-to-demo-slots (kept here for swap inspiration; canonical truth lives in slot defs) and unallocated. Grouped by domain. Composition rules live in `the-unbound-learnings.md` under *Slot composition*.

**Positive — Food / inventory**
- +50 food carry cap
- Double lake yields
- Biome finder: chance of +1 food per visited tile of a specific biome
- Free food on flee
- First aid: prevent next starvation casualty

**Positive — Army / combat**
- +10% combat odds
- Opening volley: kill ~25% of enemy army at start of combat (with floor and cap)
- Kick in a pinch: +1 guaranteed hit on round 1
- Revive 1 wounded soldier per combat
- Auto-revive `floor(losses/2)` wounded soldiers per combat
- Cannot die in combat — lose all troops, survive with 1; slot self-consumes (Healer leaves after saving once) or charges steep gold/food on the save
- Reveal enemy strength before combat opens — combat becomes a decision, not a roll
- Free flee: no troop loss on next flee
- Skip one combat per run (sneak / distract past)
- +1 troop per Camp Search

**Positive — Navigation**
- Halve woods/swamp lost chance
- Reveal farms/camps/henges on the map when oriented

**Positive — Economy**
- Prices -1 in towns
- Reduce any payment by 1 gold or food
- Probabilistic refund of 1 on any payment (~30% chance)
- Reveal PoI prices in signpost / map before visit (paired with hide-prices-by-default game-wide rule) — information, not discount
- Biome finder: chance of +1 gold per visited tile of a specific biome
- Better gambling odds at taverns *(depends on taverns landing)*

**Negative — Food / inventory**
- -1 food per Camp Search
- -1 food per combat
- -1 lake yield (post-doubling)

**Negative — Army / combat**
- +X% ambush chance in woods/mountains
- +1 troop loss per flee
- Enemy gets +1 first hit (loud)
- -10% combat odds
- -1 troop per Camp Search

**Negative — Navigation**
- +X% lost chance in woods/swamp
- Slot demands a water-adjacent visit every N moves or leaves the party

**Negative — Economy**
- -1 gold per Town visit
- +1 prices in towns
- Locksmith asks +N gold/food
- Worse gambling odds at taverns *(depends on taverns landing)*
- Barkeep tips/rumors cost more *(depends on taverns landing)*

**Negative — Cooldowns**
- +1 cooldown on lakes/camps/henges

**Negative — Terrain**
- Cannot enter a specific terrain (Rainbow's End variant: no gold from rainbows while held)
- -1 troop on first step into a specific terrain

**Negative — Constraint**
- Cannot coexist with another named slot


## Tech
- Animation scheduling: consider extracting reducer-side animation enqueueing into a dedicated pure helper once iteration stabilizes.


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

Healer — plagues and battle losses reduced; eats extra food as upkeep

With all three companions at the final gate, the ending changes. "You don't go alone."
Companions make late-game feel like earned evolution rather than stat accumulation. Each stage can be designed with/without specific companions in mind. Requires per-stage progression redesign — defer until core loop is validated across all three gates.
