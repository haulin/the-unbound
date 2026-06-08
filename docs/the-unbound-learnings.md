# The Unbound — design & coding guide

A short guide for The Unbound. The first half is *game design pillars* — gameplay, UX, and slot composition. The second half is *coding principles*. Both prioritize **durable rules** over "what we changed in v0.x". Deep dives belong in design/plan docs; keep this file lean enough to be safe default context.

For *narrative* tone, see [`lore-and-tone.md`](./lore-and-tone.md). For roadmap and ideas, see [`backlog.md`](./backlog.md).

## Game design pillars

### Every ability is a new verb

A good ability changes what is *possible*, not what is *likely*. The Scout *reveals*. The Boar *charges*. The Mule *carries* what no one else can. If an ability can only be described with a number — `+10% odds`, `revive 1`, `30% chance to refund` — it is a stat tweak. Stat tweaks are invisible during play and forgettable afterward.

Balance the *roster*, not the individual ability. No single slot should fit every run; that is where balance lives. Each individual ability, taken alone, should feel like a cheat code when it clicks.

The design test is not *"is this balanced?"* It is *"is there a moment in a run where having this feels unfair, in my favour?"* If the answer is no, the ability is a draft, not a design.

### Four buttons in two modes

The Unbound's gameplay grammar is **four buttons that mean different things depending on context**. The same hardware (T/R/B/L on a face-button cluster, or four corners of the screen) drives both modes; you are never in both at once.

- **Overworld:** four directional moves — N/E/S/W.
- **PoI modal:** four contextual choices — T/R/B/L. The modal *replaces* the overworld buttons for the duration of the encounter.
- **Modal convention:** within any PoI modal, R is the Leave button. Good practice for muscle memory — the player never has to wonder how to back out of a brand-new PoI type.

Meta-buttons that exist outside the gameplay frame — map toggle (because screen real-estate is expensive), menu / start a new game — are *not* counted in the four-button rule. They sit in their own UI lane and don't compete with gameplay grammar.

New gameplay mechanics must fit this vocabulary. If a feature requires a fifth gameplay input, it requires a redesign first. Minimum-input games are deep at the *state* level, never at the *control* level.

### Teach in line, never in screens

No tutorial screens, no how-to-play modals, no first-launch walkthroughs. Mechanics introduce themselves via a single contextual line of flavour the first time they appear. The player learns the world by encountering it, not by reading about it.

This is also the project's tonal default — see `lore-and-tone.md`'s *"Nothing is explained that can be discovered."*

### Teach through interaction, not absence

When a control cannot be used right now, prefer **pressing it and getting an in-world refusal** over **removing or hiding the button**. An empty slot does not teach; the player must guess whether the game broke, the offer sold out, or they are not meant to look there. A dead button with a short line teaches the rule in one mistake.

Apply this to duplicate companion hires, no-gold failures, rumor caps, and similar gates. Do not hide hire buttons because the player already has that companion; do not reshuffle the modal to swap in the "next" offer unless fiction supports it (deferred: Crossing, per-PoI spent hires). Skipping the modal entirely when only Leave remains is a separate backlog idea — still not the same as hiding individual actions mid-visit.

Pair with *Teach in line*: the lesson is the line you get **because you pressed**, not copy you read before you tried.

### Slot composition

Pairing rules and the activation-flash convention for any current or future slot.

- A slot's negative must bite *adjacent* to its positive — same domain, different beat. Same-resource cancellation (`+1 gold` / `-1 gold`) is forbidden because it nets to zero and gives no strategic shape.
- Effects fire on discrete events (combat, Camp Search, Town visit, flee, ambush roll). Per-step ticks are banned — they generate UI noise and force constant attention.
- Passive stat changes are allowed but discouraged. Where an event trigger can carry the cost, prefer it. Reinforces *"every ability is a new verb."*
- Positive-only slots are allowed when the 1-of-3 slot opportunity cost is enough balance.
- Aim for unique negatives across active slots. Duplicates should be reviewed.

**Sprite-flash on activation.** For any slot whose effect fires at a discrete event, pulse the slot's button-strip icon for 200–400 ms. One animation primitive, shared by every event-triggered P or N. Makes the cause visible to the player.

The unallocated effect pool and parked slot ideas all live in [`backlog.md`](./backlog.md) under *Slot system — deferred (post-demo)*.

### Capture wide, ship narrow

The backlog is intentionally promiscuous. Almost every idea — including ones we will never ship — earns a slot, on the condition that it doesn't violate the gameplay grammar (the four-button rule) or the tone register (folk-myth, no high fantasy).

The reason isn't that we plan to build everything. It is that **architecture knows what's coming** (when v0.7 ships, the seams should already accommodate v0.10 and v0.13 mechanics on the same surface — wide seams now cost less than rewrites later); **idea generation is the hard part** (a half-formed idea costs nothing to capture today and costs the next brainstorm if discarded); and **adjacent ideas spark each other** (sparse backlogs go cold, dense ones generate). The filter is not *"is this likely?"* — it is *"does this break the gameplay grammar?"*

## General principles (mostly repo-agnostic)

- **OCP mindset (Open/Closed Principle)**: design modules to be **open for extension** but **closed for modification** — new behavior should often be “add a new module/entry” rather than “edit 4 unrelated switch statements”.
- **Optimize for the reader**: reduce branching, reduce “where do I look?” tax, name things for clarity.
- **One source of truth**: don’t keep the same fact in two places (tables, re-exports, string→string maps). Unify types/values so wiring becomes obvious.
- **Make change vectors explicit**: write down what’s likely to change, then add *just enough* structure to support it. Avoid speculative abstraction.
- **Keep state simple**: prefer plain data models; keep side-effects localized; keep updates explicit and easy to diff.
- **Prefer composable seams**: design helper APIs so they can be reused without importing half the codebase (pure functions in, pure values out).

## “Plan-shaped code” vs “human-shaped code”

Executing a strict task list tends to produce the minimum structure that passes today’s tests. Humans usually also anticipate *known change vectors* once they’re confirmed.

- Before implementing, write down the **expected change vectors** (what’s likely to get more cases, more UI states, more mechanics).
- Add extension points where they reduce future “sprinkled edits”, but avoid speculative abstraction.

## Repo preferences (when multiple approaches exist)

### Mechanics live in mechanic modules

**Architectural goal**: adding or editing one mechanic should touch the **minimum number of files**. The realistic target is one def file in `src/core/mechanics/defs/*` plus one line in `MECHANICS`. Every cross-cutting registry, switch statement, or constant that hardcodes a mechanic name is a tax on this goal — surface them in review and migrate them to data-driven seams when they become friction.

This means action constants, action union types, encounter shapes, signpost ranks, cell-badge behavior, placement logic, lore-pool wiring, etc. all live on the mechanic def. Core only owns generic dispatch.

- **Where**: `src/core/mechanics/defs/*` + registry in `src/core/mechanics/index.ts`
- **Top-level hooks** (all optional): `onEnterTile`, `poiSignpost`, `placeWorld`, `combatVariant`, `onCombatResolved`, plus declarative fields `kinds`, `mapLabel`, `enterFoodCostByKind`, `moveEventPolicyByKind`. Hook signatures live in `src/core/mechanics/types.ts`.
- **Encounter hooks** (all optional, nested under `encounter: { kind, ... }`): `reduceAction`, `rightGrid`, `illustrationSpriteId`, `deltaAnchorsByTarget`, `previewEncounter`. Per-button costs/stats live on `RightGridCellDef.badge` (returned from `makeRightGrid` / offer tables), not a separate preview-plate provider. The nested shape means the type system enforces "any encounter hook can only exist alongside `kind`" — no runtime cross-field validation needed.
- **Right-grid badges (2026-06):** TIC draws 8×8 pill sprites per action cell; `CELL_GAP_PX = 4`; combat `enemyArmy` deltas anchor to Fight badge via `deltaAnchorsByTarget`. Preview plates retired. Fight button shows the variant enemy illustration with a `[N]` count badge (generic crossed-swords sprite retired).
- **Combat is shape-shared, behavior-injected**: every source mechanic that opens combat (henge, terrain ambushes, wyrm, future brigand recruit) declares a `CombatVariantConfig` on its def — illustration sprite, line pools, optional `payment` block, `victoryReward`. Combat's own reducer never branches on source kind; it walks `encounter.sourceCellId → cell.kind → mechanic.combatVariant`. Fight/pay/return badges are assembled in `combat.ts` from variant payment eligibility. New combat flavors land as new variant configs, not new encounter kinds. See `src/core/mechanics/defs/combat.ts`.
- **Action constants live next to their reducer**: per-mechanic action constants and union types (e.g. `ACTION_CAMP_SEARCH`, `CampAction`) are exported from the def file, not from `src/core/constants.ts`. The central `Action` type in `types.ts` aggregates them via one import per mechanic.
- **MECHANICS array order = worldgen order**: `world.ts` iterates the `MECHANICS` array and calls each `placeWorld` in order, threading `rngState`. Reorder with intent — the determinism golden in `tests/core/world.determinism.test.ts` will catch unintended RNG-shape changes.
- **Peer-aware placement**: when one mechanic's placer needs another's position (e.g. distance constraints), it reads the predecessor via `findCellByKind` and **asserts** (throws naming both mechanics) if the predecessor is missing — not falls back to "no constraint". The assertion is the only line of defense against a silent `MECHANICS` reorder that breaks the chain; the determinism snapshot would only catch it after someone re-snapshotted on autopilot.
- **Acceptable taxes** (unavoidable today): one line per new modal encounter in `types.ts`'s `Encounter` and `Action` unions, one line in the `MECHANICS` array, and (if the mechanic places features) one entry in the determinism golden. Anything beyond that is a candidate for refactoring.
- **Anti-pattern**: per-mechanic explanatory comments that repeat the same rationale in every def. Document the principle once here; let the def files be self-evident.
- **More**: `docs/plans/2026-05-04-mechanic-modules-registry-design.md`

### Seed stability: one stream per concern (pillar)

**Player expectation:** the same seed should mean the same **terrain**, the same **tile positions** for each PoI kind, and the same **combat outcomes** on the same move script — unless we ship an intentional **map-breaking** or **content-breaking** change and say so in release notes.

**What went wrong before v0.8:** all worldgen shared one placement tape (`rngState` threaded through every `placeWorld`). Changing camps, town offer rolls, or town count shifted the tape for **every later placer** and for **`world.rngState` at run start**, so fights on the “same” seed diverged even when combat code did not change. Offers on domain streams (`town.offers`) were a start, but **positions and prices still used the shared tape** — so the expectation of stability was partly luck and partly misaligned docs.

**Target architecture (normative for new work):**

| Concern | Stream | Changing it affects |
|--------|--------|---------------------|
| Terrain noise | `place.terrain` (or root seed only) | Terrain only |
| PoI positions + names for kind *K* | `place.<kind>` (e.g. `place.town`, `place.camp`) | That kind’s tiles only |
| PoI menus/prices for kind *K* | `<kind>.offers` (already used for towns/camps/farms) | That kind’s cell data only |
| Ambush/lost *whether* | Keyed `{ seed, stepCount, cellId }` | Nothing else |
| Lore / shop feedback | Keyed or run `copyCursors` | Nothing else |
| Combat at a given cell (round outcomes, spawn size for that fight) | Keyed `{ seed, cellId, salt: 'fight.' + roundIndex }` or a per-encounter fork — **target** | Other fights and unrelated actions on the run |
| Run-wide sim tape | `world.rngState` — **legacy**; minimize new uses | Everything after each draw |

**Rules:**

1. **Do not** spend placement-tape draws for offer algorithms, flavor, or unrelated mechanics.
2. **Do** use `RNG.createStreamRandomFromSeed(seed, 'place.town')` (etc.) for every random choice inside that mechanic’s `placeWorld`, including `placeFeature` position attempts and per-cell price rolls.
3. **`MECHANICS` order** still matters for **reading the grid** (gate before locksmith distance checks), not for sharing dice between placers.
4. **Classify PRs:** mechanical-only (reducers/combat) → layout + offers + fight script unchanged; content-only → offers/prices; map-breaking → positions or counts — re-snapshot `world.determinism.test.ts` and tell playtesters.
5. **Witness tests:** layout golden for tiles; optional combat witness (fixed seed + moves file) so fight sequences are checkable when offers change.

**Flavor / copy** (unchanged): `createTileRandom` / `createRunCopyRandom` / `keyedInt*` — never `world.rngState`.

**TIC-80 text:** player-visible strings in `lore.ts` (and UI copy) must be **ASCII-only** — use `-` not em dash `—`, straight quotes `"` `'` not curly. TIC fonts cannot render many Unicode punctuation marks; garbled glyphs read as bugs.

**Lore line selection (shop + encounter copy):** not a gameplay pillar — a pacing rule. Within one PoI visit, **denials and routine purchases** (no gold, carry full, buy food/troops, farm food, hire refusals) use `encounterStableLine` so button-mashing does not drain the pool. **Rumors** and **one-shot outcomes** (combat flee/victory/pay success) may advance `copyCursors` for variety. Revisit per pool when adding a mechanic; default to per-visit stable unless fiction wants a fresh line each press.

**Lore-cycling audit (v0.8 and after):** for every random outcome, document *what it is keyed from*. v0.8 fixed **copy** (fail lines per encounter, split buy tags, no stream spend on flavor). **Combat hits** and **world placement** still used the legacy global tape — that was wrong relative to the product rule *“buying a scout must not change the fight waiting at D4”* and *“the wyrm fight script must not depend on how many ambushes you took earlier.”* Wyrm **enter lore** is keyed (`perMoveLine` / `stableLine`); wyrm **FIGHT rounds** are not — they consume `world.rngState` like any other combat.

**Legacy sim tape:** `world.rngState` still threads combat today. New work should **not** add more global-tape consumers; migrate fights to keyed or per-`sourceCellId` streams. Worldgen should leave the tape at a predictable point (`place.start` only) so map edits do not re-roll unrelated fights.

**Status:** v0.8+ should migrate placers to per-kind `place.*` streams; until then, treat any `placeWorld` edit as map-breaking until proven otherwise.

- **More:** `src/core/rng.ts`, `tests/core/world.determinism.test.ts`, `docs/plans/2026-05-02-rng-copy-policy-plan.md`

### Single-source-of-truth is a rule, not a vibe

If you notice any of these, treat it as a cleanup candidate:

- duplicated tables (“same mapping in two files”)
- re-export stubs that add no meaning
- “mapping one string to another” just to satisfy a call site

Prefer unifying the underlying concept so the code becomes direct.

### Animation as progressive enhancement

Animation should improve feel/legibility without infecting game logic.

- Prefer **animation as data** advanced by a simple clock/tick, so it can be replaced or disabled without rewriting core mechanics.
- Prefer **renderer consumes models, not mechanics**: compute deterministic models in core; platform renderers should not replicate game rules.
- **Core emits timing-free events; platform stamps the frames.** Core mechanics return state diffs plus a list of `DomainEvent`s describing what changed (resource, position, encounter open/close, phase boundaries). The platform owns its own clock and animation queue, and a single translator converts events to timed entries. `core/` must never import from `platform/`, and core code must never reference animation frame counts, easing, or "is animation enabled" flags — those are platform concerns. The translator is the only choke point where the timing policy lives.

### Docs reflect the final intent, not the history

Design and plan docs are living specs of *what we intend to ship*, not changelogs of how we arrived there. When a defect or a balance retune lands, **update the design and plan in place to read as if we'd specified the new shape from the start**. Don't append "v0.6.1 retune: actually it's now 0.8". Don't strike-through old numbers. Don't add a "post-implementation refinements" section that contradicts the table above it.

- Past decisions belong in *git history* (commit messages, PR descriptions) and in *ADRs* (`docs/adr/`) when a decision is consequential enough to need a long-form rationale.
- The doc the next person opens should be coherent end-to-end and never make the reader play archaeologist.
- This includes resolving plan-vs-design drift the moment it's found: the design is the source of truth; the plan must be edited to match it (or the design edited if the deviation was the better idea, with the design re-stated cleanly).

If you catch yourself writing "originally we said X, then we changed it to Y", stop — delete X, write Y.

### Comments — minimum viable

Comments rot faster than code. Default is **none**; add one only when the code itself can't carry the meaning.

- **Reasoning belongs in design docs**, not in code. If you're explaining *why* a number or a shape was chosen, that lives in `docs/plans/*-design.md` and the code links to it (or doesn't — `git blame` is one keystroke away).
- **No dates, no version numbers, no "post-X-pass" annotations.** Git history already records who changed what when. Comments saying "halved post-v0.6 polish" age into noise the moment v0.7 lands.
- **No cross-file references.** Pointers like "see `path/to/other.ts`" or "matches `SOME_CONSTANT_OVER_THERE`" age poorly across renames and moves. Either inline the relevant fact, or trust the reader to grep.
- **No narrating the obvious.** `// increment counter`, `// import the module`, `// return the result` add nothing. If the code is unclear, rename or restructure — don't paper over with prose.
- **What's left after these rules:** brief notes on **non-obvious intent, trade-offs the code can't show, or invariants a reader would miss** (e.g. "RNG draw order is fixed so determinism goldens stay stable"). That's the bar.

When in doubt, delete the comment and see if anyone notices.

### Tests — minimum viable, like comments

Hobbyist TIC-80 game; regression cost is "roll back the cart". Test density should track that, not enterprise risk.

- **Acceptance per shipped GWT** — one per spec, hard to lose.
- **Determinism witnesses** — guard RNG draw order against silent drift.
- **Unit tests only where math is non-obvious** — formula edges the type system can't prove.

Push back on AI-default patterns: multi-N parameter sweeps for one invariant (one Monte Carlo with bounds is enough), one `it()` per branch (use `describe.each`), pinned witnesses for behaviors the type system enforces, edge-case tests for inputs the type system already prevents.

Aim for ~15 new tests per milestone, not 60. When in doubt, delete the test and see if a real regression slips through.

## Process notes (keep brief)

- **Iterate quickly** while tuning feel/UX/tables; keep diffs small.
- When direction stabilizes, do an **elegance pass**: consolidate constants, remove one-offs, delete dead exports.
- **Don’t assume; ask**: when UI/feel seems wrong, gather observations and expectations before attributing a cause.
- **Choice prompts (ordering)**: when you need a decision, state your recommendation first (with 1–2 reasons), then present the options.
- **Doc-as-contract during iteration**: once a tweak becomes the baseline, capture it in the relevant design/plan doc; avoid freezing volatile copy strings in docs.

## Agent playtesting

The terminal platform (`npm run play`) is, among other things, an agent-driveable surface. We use it to run *blind playtests* — an LLM agent plays a fresh seed with no access to source, docs, or prior context — to find out what the design teaches itself and what it doesn't.

**When it's useful**: after a balance pass, after adding a mechanic that depends on a teaching chain (signpost → rumor → discovery → action), or when you suspect the game is asking too much of meta-knowledge.

**The minimal recipe**:

1. Pick a seed (`--seed=N`). Same seed = same world for the *first* attempt; on `3` (restart), the run seed advances internally so subsequent attempts get fresh worlds even though the CLI seed stays fixed.
2. Use `--blind` to suppress dev-only affordances (currently the minimap toggle).
3. Use `--moves-file=<path>` (recommended over inline `--moves=`). The agent's loop becomes a single command run twice the same way, with a one-digit append in between:
   ```bash
   : > /tmp/agent-run.txt                                        # fresh start
   echo -n "8" >> /tmp/agent-run.txt
   npm run play -- --seed=N --blind --moves-file=/tmp/agent-run.txt
   ```
   This avoids dragging the entire move string through tokens every turn, makes rewinding require a deliberate truncate (no free retries), and sidesteps shell-quoting bugs.
4. Launch a subagent with these absolute rules in its prompt:
   - Only tool: Shell, only command shape: `echo -n <digit> >> <path>` followed by `npm run play -- --seed=N --blind --moves-file=<path>`. No piping/grepping the output (it filters out the action labels the agent needs).
   - No file reads, no web, no other shell commands, no `cat`/`ls`/`pwd`.
   - One key per turn — no batching multiple digits in a single append (kills observation discipline).
   - Restart only after `[GAME OVER]` — appending `3` while alive throws away map memory and progress.
5. Each turn: agent narrates observation + hypothesis + intended next move, then appends one digit and re-runs.
6. Stop on `[GAME OVER]`, `[YOU WIN]`, move budget, or strategic stop.

**Reading the report**: take action sequences as ground truth. Prose narration is a mix of observation and confabulation — agents will describe map markers as "cottages and gardens" when the output is single-letter glyphs. Confidence outpaces sample size: a few lucky combat rolls can become a confidently-stated wrong "rule". The final action can also contradict the chain-of-thought directly above it — log what was *done*, not what was *thought*.

**What to look for**:

- *What does the agent figure out, and at what step?* If the locksmith → blood → lair chain takes 100+ LLM turns, that's data on how deep the inference is.
- *What hypotheses do they try and reject?* Wrong hypotheses tell you what the design's flavor text *almost* points at.
- *What never gets tried?* Agents that never visit a tile type are a signal that nothing in the world is pulling them toward it.
- *Does the rumor pool carry teaching?* Plenty of mechanics in this game are taught by `BARKEEP_TIPS` lines bought at towns; a blind run reveals which ones land and which sit unread.

**Limits**:

- Prompt-trust isolation only — within Cursor, a subagent technically *can* read source. Honest agents flag their own slips at the end of the run.
- Wall time depends heavily on model. Slow careful models (Opus-tier) run ~30–60 s per turn → 60–90 min for an 80-move run, but produce richer observation. Fast models (Composer-tier) run a 200-move arc in single-digit minutes, but tend to batch commands and skim — useful as a "skim test" canary, weaker as a careful explorer.
- The open-files panel in Cursor is visible to the subagent. For stricter isolation, run from a window with no relevant files open, or move the runner to the Cursor SDK with allow-listed tools.
- `--moves-file` rewinding is honor-based today — an agent could truncate the file to retry from a prior turn. Append-only enforcement is a future change vector (see the design doc).

**More**: full architectural details and decision rationale are in [`docs/plans/2026-05-30-terminal-platform-design.md`](./plans/2026-05-30-terminal-platform-design.md).

## Refactor philosophy (boy scout rule)

- **Code churn isn’t the enemy**: refactor freely when it improves clarity and reduces parallel bookkeeping.
- **“From scratch” test**: ask “Would I design this this way from scratch, knowing what I know now?” If not, refactor toward that shape.

