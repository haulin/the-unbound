# The Unbound — coding guide

This is a short guide for writing maintainable code in this repo. It prioritizes **durable principles** over “what we changed in v0.x”. Deep dives belong in design/plan docs; keep this file lean enough to be safe default context.

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
- **Top-level hooks** (all optional): `onEnterTile`, `poiSignpost`, `placeWorld`, plus declarative fields `kinds`, `mapLabel`, `enterFoodCostByKind`, `moveEventPolicyByKind`. Hook signatures live in `src/core/mechanics/types.ts`.
- **Encounter hooks** (all optional, nested under `encounter: { kind, ... }`): `reduceAction`, `rightGrid`, `previewPlate`, `previewPlateDeltaAnchors`, `previewEncounter`. The nested shape means the type system enforces "any encounter hook can only exist alongside `kind`" — no runtime cross-field validation needed.
- **Action constants live next to their reducer**: per-mechanic action constants and union types (e.g. `ACTION_CAMP_SEARCH`, `CampAction`) are exported from the def file, not from `src/core/constants.ts`. The central `Action` type in `types.ts` aggregates them via one import per mechanic.
- **MECHANICS array order = worldgen order**: `world.ts` iterates the `MECHANICS` array and calls each `placeWorld` in order, threading `rngState`. Reorder with intent — the determinism golden in `tests/core/world.determinism.test.ts` will catch unintended RNG-shape changes.
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

## Refactor philosophy (boy scout rule)

- **Code churn isn’t the enemy**: refactor freely when it improves clarity and reduces parallel bookkeeping.
- **“From scratch” test**: ask “Would I design this this way from scratch, knowing what I know now?” If not, refactor toward that shape.

