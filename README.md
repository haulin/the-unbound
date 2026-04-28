# The Unbound

The Unbound is an in-progress project. This repository currently contains a small TIC-80 prototype built as a stepping stone toward the North Star.

## North Star

The Unbound is a minimalist retro fantasy resource management game. You are lost on a toroidal world — walk far enough in any direction and you return to where you started — and the only way out is through a gate guarded by forces you must overcome by strength, gold, or cunning. Gather your army, learn the land, find the three gates, and leave.

## Run

1. Open TIC-80.
2. Paste `the-unbound.js` into the code editor.
3. Run (e.g. `Ctrl+R`).

## Development (optional)

This repository commits the runnable cart (`the-unbound.js`). If you want to edit the TypeScript source and regenerate the cart:

```bash
npm install
npm run build
```

Before making gameplay/architecture changes, read `docs/the-unbound-learnings.md`.

Watch mode (keeps running through temporary errors and rebuilds on fix):

```bash
npm run dev
```

Unit tests (core logic only; no in-cart test harness):

```bash
npm test
npm run verify
```

### Workflow summary

- `npm run build`: typecheck + bundle into root `the-unbound.js` (also validates the cart header/footer metadata contract)
- `npm run dev`: watch mode (TypeScript watch + bundle watch); keeps running through transient errors
- `npm test`: run unit tests for `src/core/**`
- `npm run verify`: build + test (the “everything should be green” command)

## Local dev notes (optional)

If you’re working on this repo in an IDE/agentic workflow, you may want a local-only `LOCAL.md` file for machine-specific notes (e.g. offline TIC-80 reference docs). This file is intentionally not part of the public repository.

## Inspiration

This project is inspired by Mannzerhacker’s TIC-80 cart “THE DARK TOWER” ([play page](https://tic80.com/play?cart=271)). This project is not affiliated with that work (or the 1981 board game) and intentionally diverges further.

