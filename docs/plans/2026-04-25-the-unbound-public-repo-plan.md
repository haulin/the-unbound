# The Unbound Public Repo Implementation Plan

> **For agentic workers:** Use `/use-subagents` (preferred on capable harnesses) or `/execute` for batch checkpoints.

## Context

**Prompt:** Turn this project into a real GitHub repository. Guide through making a new repo and pushing code there. Update docs (mostly `README.md`) for public web. No PII should be present anywhere now or going forward. Use **The Unbound** as the project name everywhere (previous working titles should not appear as the project name). Keep the repo root clean. Allow a local-only `LOCAL.md` for Cursor/dev guidance that must never be committed. Repo is public and will be created manually in the GitHub web UI (no `gh`).

**Reasoning:** Publishing is a one-way door. We’ll rename and scrub content first, then initialize git with repo-local identity (no global config changes), create a minimal first commit with explicitly-scoped staging, and finally push to a manually-created public GitHub repo.

---

**Goal:** A public GitHub repo `haulin/the-unbound` containing `the-unbound.js`, a polished `README.md`, cleaned/renamed docs under `docs/`, and **no committed** machine-local paths, real names, or other personal identifiers.

**Architecture:** Single-file TIC-80 JS cart in root; supporting docs under `docs/`; optional `.cursor/rules/` may be committed if it contains only safe, project-relevant guidance; `LOCAL.md` is local-only and excluded via `.git/info/exclude`.

**Tech Stack:** TIC-80 (JS cart), git, GitHub (manual web UI).

**TDD during implementation:** waive — rename/doc hygiene work; verification via searches + `git status` + (optional) opening the cart in TIC-80.

**Plan audit waived:** we've nailed down all the steps already, it is not that difficult — 2026-04-25

---

## Planned file map (before → after)

- Ensure the cart file is named `the-unbound.js`
- Rewrite `README.md` (public-facing, stable, prototype-first)
- Ensure backlog lives at `docs/backlog.md`
- Ensure learnings live at `docs/the-unbound-v1-learnings.md`
- Ensure the prototype docs are named:
  - `docs/plans/2026-04-24-the-unbound-prototype-design.md`
  - `docs/plans/2026-04-24-the-unbound-prototype-v1.md`
- Add `LICENSE` (MIT)
- Add `.gitignore` (minimal; do **not** include `LOCAL.md`)
- Create optional local-only `LOCAL.md` (excluded via `.git/info/exclude`, not committed)

## Chunk 1: Public-facing README (stable)

### Task 1: Rewrite `README.md` for public web

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with the following content**

```md
# The Unbound

The Unbound is an in-progress project. This repository currently contains a small TIC-80 prototype built as a stepping stone toward the North Star.

## North Star

The Unbound is a minimalist retro fantasy resource management game. You are lost on a toroidal world — walk far enough in any direction and you return to where you started — and the only way out is through a gate guarded by forces you must overcome by strength, gold, or cunning. Gather your army, learn the land, find the three gates, and leave.

## Run

1. Open TIC-80.
2. Paste `the-unbound.js` into the code editor.
3. Run (e.g. `Ctrl+R`).

## Local dev notes (optional)

If you’re working on this repo in an IDE/agentic workflow, you may want a local-only `LOCAL.md` file for machine-specific notes (e.g. offline TIC-80 reference docs). This file is intentionally not part of the public repository.

## Inspiration

This project is inspired by Mannzerhacker’s TIC-80 cart “THE DARK TOWER” ([play page](https://tic80.com/play?cart=271)). This project is not affiliated with that work (or the 1981 board game) and intentionally diverges further.
```

- [ ] **Step 2: Verify the README is “stable”**
  - It should not mention prototype version numbers (v1/v2).
  - It should not include machine-local paths.

Verification:
- Search `README.md` for obvious machine-local path patterns (home directories, drive letters) → none.

## Chunk 2: Rename + scrub docs and cart

### Task 2: Move backlog into `docs/`

**Files:**
- Create: `docs/backlog.md` (migrated from the previous root backlog file)
- Delete: the previous root backlog file

- [ ] **Step 1: Create `docs/backlog.md`**
  - Copy all backlog content.
  - Update heading to `# Deferred backlog (The Unbound)`.
  - Remove any machine-local “offline docs” paths; if needed, replace with: “Optional: see `LOCAL.md` (local-only) for offline reference docs.”

- [ ] **Step 2: Delete the previous root backlog file**

Verification:
- Search `docs/backlog.md` for machine-local paths → none.

### Task 3: Rename/scrub learnings + plans (keep them public-safe)

**Files:**
- Ensure: `docs/the-unbound-v1-learnings.md`
- Ensure: `docs/plans/2026-04-24-the-unbound-prototype-design.md`
- Ensure: `docs/plans/2026-04-24-the-unbound-prototype-v1.md`

- [ ] **Step 1: Update project naming inside each renamed file**
  - Use “The Unbound” as the project name.
  - Remove references to previous working titles as *our* project name.
  - External inspiration mentions are allowed only when clearly labeled as third-party.

- [ ] **Step 2: Remove machine-local offline-doc references**
  - Delete any line that points to a local filesystem path for TIC-80 docs.
  - If needed, replace with: “Optional: see `LOCAL.md` (local-only) for offline reference docs.”

- [ ] **Step 3: Scrub author identity in doc snippets**
  - Ensure any `// author:` example line uses `haulin` (or omit the author line in the snippet).

- [ ] **Step 4: Fix cross-references after rename**
  - Update any links that still point to outdated filenames.

Verification:
- Search the repo for references to previous working titles and fix any that remain.
- Allowed exception: the *third-party* title “THE DARK TOWER” may appear in an Inspiration context.
- Search the repo for machine-local paths → none.

### Task 4: Rename the TIC-80 cart and update visible strings

**Files:**
- Ensure: `the-unbound.js` exists at repo root

- [ ] **Step 1: Update TIC-80 header strings**
  - `// title:` → `The Unbound (prototype)`
  - `// desc:` → `Prototype toward the North Star`
  - `// author:` stays `haulin`

- [ ] **Step 2: Update narrative strings that mention the old project name**
  - Replace any leftover story text that references previous working titles with “the Unbound” (or neutral wording).

Verification:
- Search `the-unbound.js` for leftover previous-title phrases → none.

## Chunk 3: Repo setup + safe first push

### Task 5: Add MIT License

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create `LICENSE` with the standard MIT License text**
  - Use: `Copyright (c) 2026 haulin`

Verification:
- File exists and contains the full MIT text.

### Task 6: Add minimal `.gitignore` (no LOCAL.md here)

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore` with only**

```
.DS_Store
```

### Task 7: Initialize git + local-only excludes + optional LOCAL.md

**Files:**
- Create: `.git/` (via `git init`)
- Modify: `.git/info/exclude`
- Create (optional, local-only): `LOCAL.md` (must never be committed)

- [ ] **Step 1: Initialize repository**

Run:
```bash
git init
```

- [ ] **Step 2: Set repo-local identity only (do not change global git config)**

Run:
```bash
git config user.name "haulin"
git config user.email "<your public alter-ego email>"
```

- [ ] **Step 3: Exclude `LOCAL.md` locally**

Add to `.git/info/exclude`:
```
LOCAL.md
```

- [ ] **Step 4: Create `LOCAL.md` (optional, local-only)**

Example content (do not commit):
```md
# LOCAL (do not commit)

This file is local-only and must never be committed.

## Offline TIC-80 reference docs

- <your offline docs location>
```

Verification:
- `git status` does **not** show `LOCAL.md` as untracked.

### Task 8: Ensure only intended files are committed

- [ ] **Step 1: Decide whether to commit Cursor rules**
  - If `.cursor/rules/` exists and contains only safe, project-relevant guidance, it may be committed.
  - Do **not** commit other `.cursor/` subtrees unless explicitly reviewed for safety.

- [ ] **Step 2: Stage explicitly (no blanket `git add -A`)**

Run:
```bash
git add README.md the-unbound.js LICENSE .gitignore docs/
```

If (and only if) you want to publish Cursor rules and the directory exists:
```bash
git add .cursor/rules/
```

- [ ] **Step 3: Inspect staged changes**

Run:
```bash
git status
git diff --staged
```

Expected:
- Only the intended files are staged.
- No machine-local paths or personal identifiers appear in staged diffs.

### Task 9: Create the GitHub repo manually (web UI)

- [ ] Create `haulin/the-unbound` (public) in GitHub web UI.
- [ ] Do **not** initialize with README/LICENSE/.gitignore.
- [ ] Copy the SSH remote URL shown by GitHub.

### Task 10: First commit + push

- [ ] **Step 1: Create first commit**

Run:
```bash
git commit -m "Initial public release of The Unbound prototype"
git branch -M main
```

- [ ] **Step 2: Add origin + push**

Run:
```bash
git remote add origin <PASTE_SSH_URL_FROM_GITHUB>
git push -u origin main
```

Troubleshooting:
- If you accidentally initialized the GitHub repo with commits already on `main`, either recreate the repo empty or fetch+merge before pushing.

### Task 11 (optional): “Going forward” leakage guardrail

Pick one:
- **A)** Add a short “pre-push checklist” section to `README.md` (manual but simple).
- **B)** Add a secret/PII scanning workflow under `.github/workflows/` (more automation, more maintenance).

