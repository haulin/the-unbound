# Terminal platform — design

## Status

Active. Ships v0 alongside the existing TIC-80 platform; intended for two purposes: blind agent playtesting and headless dev iteration. Lives at [`src/platform/terminal/`](../../src/platform/terminal/) parallel to [`src/platform/tic80/`](../../src/platform/tic80/). Zero changes to `src/core/**`.

## Documentation reviewed

- [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md) — "Mechanics live in mechanic modules", renderer-consumes-models, OCP mindset.
- [`docs/playtests.md`](../playtests.md) — historical human-playtest log; format the agent runs are intended to feed back into.
- [`src/platform/tic80/`](../../src/platform/tic80/) — entry/input/render shape the terminal mirrors.
- [`src/core/rightGrid.ts`](../../src/core/rightGrid.ts), [`src/core/mechanics/registry.ts`](../../src/core/mechanics/registry.ts) — the seams the terminal reads from.

## Why this exists

We want an agent (or a developer in a headless shell) to be able to drive the game without launching TIC-80. Three options were considered:

1. **Web port.** A real DOM/canvas build of the cart. Production-quality, but a serious endeavour: asset pipeline, hosting, sprite atlas. Out of scope for a playtesting tool.
2. **GUI automation of TIC-80.** `cliclick` plus `screencapture` plus vision-based perception. Mechanically possible, but reading 240×136 pixel art reliably is fragile, and the OS-permission/window-focus dance is brittle for an agent loop.
3. **A text platform that reads the same core.** Cheapest by an order of magnitude, gives the agent text in/out (its native channel), and is naturally deterministic. Picked.

The prerequisite was already paid by the existing core/platform split: `processAction` is a pure reducer, `getRightGridCellDef` enumerates available actions for any state, and the `MECHANIC_INDEX.previewPlateByEncounterKind` registry already provides the encounter stats the TIC build paints onto its preview plate. The terminal is essentially: replace mouse with keys, replace renderer with text.

## Architecture

```
src/platform/terminal/
  entry.ts        # main loop + arg parsing (--seed, --blind, --moves)
  render.ts       # State -> string
  input.ts        # key -> grid cell -> Action via getRightGridCellDef
  labels.ts       # Action.type -> snake_case display label
  node.d.ts       # ~20-line ambient shim (avoids adding @types/node)

scripts/run-terminal.mjs   # esbuild -> dist/terminal.cjs -> spawn node
package.json: "play": "node scripts/run-terminal.mjs"
```

The platform reads three core seams:

- `processAction(state, action)` — pure reducer, identical to the TIC entry's call.
- `getRightGridCellDef(state, row, col)` — enumerates buttons; the terminal walks the 3×3 grid and labels every cell with an action.
- `MECHANIC_INDEX.previewPlateByEncounterKind[kind]` — produces `{spriteId, text}[]` lines per encounter (combat enemy size, town prices, farm prices, locksmith key cost, etc.).

`check-portability.mjs` only scans `src/core/**`, so terminal-platform Node usage stays out of the cart bundle automatically.

## Key decisions

### 1. Single-shot replay (`--moves=<keys>`) is the agent ergonomic, not raw-mode REPL

Interactive raw-mode keypress works well for humans (`npm run play`), but is awkward for agents that drive via tool calls. `--moves=ABCD` replays the full key sequence from the seed in one shot and prints the resulting state. The agent's loop becomes: read state → pick key → append to moves → run again. Stateless, deterministic, accumulating.

`--moves=` also tolerates whitespace and commas inside the value, *and* word-splits across argv (we collect any non-flag positionals after `--moves=` and concatenate). This last bit is a real correctness fix — without it, an unquoted `--moves=8826 7777` silently drops the second batch and the agent's mental moves-string desyncs from reality.

### 2. `--blind` hides developer-only affordances

For first-blind playtests we want the agent to discover the game, not to use a debug shortcut. Currently the only such affordance is the minimap toggle (cell `(2, 0)` → `ACTION_TOGGLE_MINIMAP`), which reveals the entire world for free. `--blind` filters the action both at render time (label shows `-`) and at input time (the key is a no-op). The TIC build keeps the minimap available for development.

`show_goal` and the in-game `Map` view (visited landmarks only) are *not* hidden under `--blind` — they're player-facing.

### 3. Encounter plate stats are paint-from-model, not bespoke

The terminal does not re-implement price/cost/army-size logic. It calls `previewPlateByEncounterKind[encounter.kind](state)` and gets back the same `{spriteId, text}` lines the TIC build paints. A small `PLATE_LABEL_BY_SPRITE` lookup in [`render.ts`](../../src/platform/terminal/render.ts) maps each plate-icon sprite to a one-word semantic label (`food`, `enemy`, `gold`, `army`, `hp`, `rumor`, `beast`, `scout`). New mechanics that ship a `previewPlate` provider get terminal display for free.

### 4. Map view is a 9×9 rolling viewport, matching the TIC build

`UI_MAP_VIEWPORT_CELLS = 9` over there; same here, using `torusDelta`/`wrapIndex` from `src/core/math.ts`. The player is always rendered at center as `@` (consistent with TIC's "marker is always visible; coordinate readout is the part gated by `knowsPosition`"). Markers come straight from `computeGameMapView`, so scout-reveal and committed-path semantics are inherited.

The (debug-only) minimap renders the full 10×10 world unconditionally, since its purpose is to dump everything.

### 5. Action labels = snake_case action.type, with a single special case

Labels are computed in [`labels.ts`](../../src/platform/terminal/labels.ts):

```ts
if (a.type === ACTION_MOVE) return `move_${compass(a.dx, a.dy)}`
return a.type.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
```

That's the whole module. Town offers happen to be camelCase (`buyFood`); everything else is `SCREAMING_SNAKE`. Both normalise to `buy_food`, `town_leave`, `combat_pay`, `fight`, `return`, etc. New action constants need no per-action vocabulary — they show up correctly by virtue of being named clearly.

We considered an explicit `label` field on `RightGridCellDef` but rejected it: the icon-on-button is already the canonical source of truth on the TIC side, and asking every mechanic to ship a parallel string would be a wider tax than this 13-line transform.

### 6. No `@types/node`; small ambient shim instead

Three Node touchpoints (`process`, `console`, `Buffer-ish chunk`). [`node.d.ts`](../../src/platform/terminal/node.d.ts) is ~20 lines of `declare const ...`. Cheap, no maintenance, no transitive deps. If the terminal ever grows a real Node-API surface (file IO, child_process, etc.), promoting to `@types/node` is a one-line change.

### 7. Animations drained, not played

`hasBlockingAnim` gates input on the TIC side and exists for delta popups, grid transitions, and slide animations. The terminal calls `processAction(state, { type: ACTION_TICK })` until `!hasBlockingAnim(state.ui)` between every input dispatch, then prints. The agent (or scripted user) sees the *final* state of each move; intermediate animation frames are not represented. This is correct for any decision-making purpose: animations carry no game-state information, only feel.

### 8. Bundle rebuilds on every `npm run play` call

`scripts/run-terminal.mjs` always invokes esbuild before spawning Node. ~700 ms per call. For an agent loop running 80–200 turns this is dominated by LLM thinking time (10–60 s per turn), so it's not a bottleneck. If we ever want a fast batch playtester (hundreds of runs/sec for tuning sweeps), we'd cache the built bundle and only rebuild on source change. Out of scope for v0.

## Trade-offs and limits

- **Sprite labels lose visual distinctiveness in text.** A blind agent will see `move_n (signpost)` instead of looking at a sprite. This is fine for playtesting (agents read labels naturally) but loses the "discover the world by glyph" feeling that's part of the TIC experience. The terminal is not a replacement for the TIC build; it's a sibling.
- **Hallucinations vs observations.** Agents narrating play will sometimes describe map markers as "towers", "cottages", "gardens", etc. The actual output uses single-letter glyphs. Anyone reading agent transcripts must separate *narration* (the model's confabulation) from *observation* (what was on stdout). The action sequence is ground truth; the prose is suggestive.
- **Prompt-trust isolation.** Within Cursor, a subagent *can* read source files; we ask it not to. Verifiable strict isolation requires the Cursor SDK with restricted tools, or an external LLM driver. The honor system has worked well so far; agents have flagged their own slips (e.g. noticing filenames in the open-files panel).
- **State-of-the-game pace.** Run #1 (free minimap, no plate prices) ended in starvation at step 54. Run #2 (blind, plate prices) stopped mid-game at ~76 steps. Run #3 (200-move budget on a generous seed) half-solved the locksmith chain but never opened the gate. Conclusion: the game is currently too tight for a no-meta agent to win in one run, even with full mechanic visibility. This is data, not a bug — see [`docs/playtests.md`](../playtests.md) for the comparable human curve. Re-run when balance shifts.

## Future change vectors

- **Multi-seed batch playtester.** Wrap `npm run play -- --moves=` in a script that runs N seeds with a fixed key strategy (or an LLM-driven strategy) and tabulates outcomes. Useful for tuning combat / food / camp parameters once balance becomes the focus.
- **Absolute-coord map labels.** Currently the rolling map shows landmarks at viewport-relative positions; agents have to mentally convert to absolute coordinates and sometimes get it wrong (one run hypothesised "two gates" when it was one gate seen at two relative positions). A header line (`map: viewport B2..J10 around F6`) would close that gap. Small render change.
- **State JSON dump.** Add `--dump=json` printing the full `State` as JSON. Useful for offline analysis, reproducible bug reports, training data.
- **Tighter agent isolation.** Move the runner to the Cursor SDK with explicit tool restrictions (Shell-only, command-allowlisted) for adversarial-style playtests where prompt-trust is too weak.
- **Replay-from-checkpoint.** `--moves=` always replays from scratch. For very long runs we may want `--snapshot=path.json` to skip ahead. Not needed at current run lengths.

## What this design explicitly does not do

- Animate. The terminal is a turn-by-turn snapshot view.
- Replicate sprite art. The map is glyphs; encounter views are text.
- Drive the cart bundle. The TIC build remains the player-facing artifact and is not affected by anything in this directory.
- Persist state across calls. Each `npm run play` call is a fresh process; the agent's accumulating moves string *is* the persistence.

## References

- Source: [`src/platform/terminal/`](../../src/platform/terminal/), [`scripts/run-terminal.mjs`](../../scripts/run-terminal.mjs).
- Workflow: see the *Agent playtesting* section of [`docs/the-unbound-learnings.md`](../the-unbound-learnings.md).
