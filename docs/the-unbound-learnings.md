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

This means action constants, action union types, encounter shapes, signpost ranks, preview-plate behavior, placement logic, lore-pool wiring, etc. all live on the mechanic def. Core only owns generic dispatch.

- **Where**: `src/core/mechanics/defs/*` + registry in `src/core/mechanics/index.ts`
- **Top-level hooks** (all optional): `onEnterTile`, `poiSignpost`, `placeWorld`, `combatVariant`, `onCombatResolved`, plus declarative fields `kinds`, `mapLabel`, `enterFoodCostByKind`, `moveEventPolicyByKind`. Hook signatures live in `src/core/mechanics/types.ts`.
- **Encounter hooks** (all optional, nested under `encounter: { kind, ... }`): `reduceAction`, `rightGrid`, `previewPlate`, `previewPlateDeltaAnchors`, `previewEncounter`. The nested shape means the type system enforces "any encounter hook can only exist alongside `kind`" — no runtime cross-field validation needed.
- **Combat is shape-shared, behavior-injected**: every source mechanic that opens combat (henge, terrain ambushes, wyrm, future brigand recruit) declares a `CombatVariantConfig` on its def — center sprite, line pools, optional `payment` block, `victoryReward`. Combat's own reducer never branches on source kind; it walks `encounter.sourceCellId → cell.kind → mechanic.combatVariant`. New combat flavors land as new variant configs, not new encounter kinds. See `src/core/mechanics/defs/combat.ts`.
- **Action constants live next to their reducer**: per-mechanic action constants and union types (e.g. `ACTION_CAMP_SEARCH`, `CampAction`) are exported from the def file, not from `src/core/constants.ts`. The central `Action` type in `types.ts` aggregates them via one import per mechanic.
- **MECHANICS array order = worldgen order**: `world.ts` iterates the `MECHANICS` array and calls each `placeWorld` in order, threading `rngState`. Reorder with intent — the determinism golden in `tests/core/world.determinism.test.ts` will catch unintended RNG-shape changes.
- **Peer-aware placement**: when one mechanic's placer needs another's position (e.g. distance constraints), it reads the predecessor via `findCellByKind` and **asserts** (throws naming both mechanics) if the predecessor is missing — not falls back to "no constraint". The assertion is the only line of defense against a silent `MECHANICS` reorder that breaks the chain; the determinism snapshot would only catch it after someone re-snapshotted on autopilot.
- **Acceptable taxes** (unavoidable today): one line per new modal encounter in `types.ts`'s `Encounter` and `Action` unions, one line in the `MECHANICS` array, and (if the mechanic places features) one entry in the determinism golden. Anything beyond that is a candidate for refactoring.
- **Anti-pattern**: per-mechanic explanatory comments that repeat the same rationale in every def. Document the principle once here; let the def files be self-evident.
- **More**: `docs/plans/2026-05-04-mechanic-modules-registry-design.md`

### RNG discipline: don’t perturb simulation for flavor

Be explicit about which kind of “randomness” you need.

- **Flavor / copy**: use deterministic keyed picks that do **not** consume `world.rngState`.
- **Simulation**: consume stream RNG and thread the returned `rngState` forward.
- **No-repeat feedback**: store cursors in run state (data-only) and advance them explicitly.
- **More**: `src/core/rng.ts` and `docs/plans/2026-05-02-rng-copy-policy-plan.md`

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

1. Pick a seed (`--seed=N`). Same seed = same world, useful for A/B comparing render changes against each other.
2. Use `--blind` to suppress dev-only affordances (currently the minimap toggle).
3. Launch a subagent with these absolute rules in its prompt:
   - Only tool: Shell, only command: `npm run play -- --seed=N --blind --moves=<KEYS>`.
   - No file reads, no web, no other shell commands, no `cat`/`ls`/`pwd`.
   - Never press `3` (restart) while alive — it advances the seed and discards map memory.
4. Each turn: agent narrates observation + hypothesis + intended next move + appends one key to the accumulating `<KEYS>` string.
5. Stop on `[GAME OVER]`, `[YOU WIN]`, move budget, or strategic stop.

**Reading the report**: take action sequences as ground truth. Prose narration is a mix of observation and confabulation — agents will describe map markers as "cottages and gardens" when the output is single-letter glyphs. Confidence outpaces sample size: a few lucky combat rolls can become a confidently-stated wrong "rule". The final action can also contradict the chain-of-thought directly above it — log what was *done*, not what was *thought*.

**What to look for**:

- *What does the agent figure out, and at what step?* If the locksmith → blood → lair chain takes 100+ LLM turns, that's data on how deep the inference is.
- *What hypotheses do they try and reject?* Wrong hypotheses tell you what the design's flavor text *almost* points at.
- *What never gets tried?* Agents that never visit a tile type are a signal that nothing in the world is pulling them toward it.
- *Does the rumor pool carry teaching?* Plenty of mechanics in this game are taught by `BARKEEP_TIPS` lines bought at towns; a blind run reveals which ones land and which sit unread.

**Limits**:

- Prompt-trust isolation only — within Cursor, a subagent technically *can* read source. Honest agents flag their own slips at the end of the run.
- ~30–60 s per LLM turn. An 80-move blind run is ~60–90 minutes of wall time.
- The open-files panel in Cursor is visible to the subagent. For stricter isolation, run from a window with no relevant files open, or move the runner to the Cursor SDK with allow-listed tools.

**More**: full architectural details and decision rationale are in [`docs/plans/2026-05-30-terminal-platform-design.md`](./plans/2026-05-30-terminal-platform-design.md).

## Refactor philosophy (boy scout rule)

- **Code churn isn’t the enemy**: refactor freely when it improves clarity and reduces parallel bookkeeping.
- **“From scratch” test**: ask “Would I design this this way from scratch, knowing what I know now?” If not, refactor toward that shape.

