# The Unbound — Public Repository Design

## Context

**Prompt:** Turn this project into a real GitHub repository, update docs (especially `README.md`) so it can be presented publicly, ensure no PII is present now or going forward, and rename the project to **The Unbound**. Keep the repo root clean. Allow a local-only `LOCAL.md` for Cursor/dev guidance that must never be committed. The repo will be public, created manually in the GitHub web UI (no `gh`).

**Reasoning:** Publishing is a one-way door: we need a small, clear repo shape, a stable public-facing README, and explicit redaction/rename rules so we don’t accidentally leak local paths, real identities, or misleading naming. The repo should remain easy to browse: cart in the root, design notes under `docs/`.

---

## Overview

This change turns the current prototype folder into a public GitHub repository for **The Unbound** and makes the published contents safe and non-misleading.

The repository will contain:
- A single TIC-80 JavaScript cart file in the root (renamed to match the project).
- A polished public README that describes the project as an in-progress prototype for a larger “North Star”.
- Project notes under `docs/` (plans, learnings, backlog), renamed and scrubbed of local/private references.
- An optional local-only `LOCAL.md` for Cursor/dev convenience, explicitly excluded from git tracking.

## Goals / Success criteria

- **Public-ready README:** clear, stable (won’t need edits every commit), and explicitly states the repo is a prototype toward the North Star.
- **Rename completed:** the repo does not refer to any previous working titles as the project name in filenames or docs.
- **No PII / private leaks in committed files:** remove local filesystem paths, personal identifiers, and similar.
- **Root is clean:** only the cart + `README.md` + standard repo files live at root; backlog and supporting docs live under `docs/`.
- **GitHub publishable:** repo can be initialized locally and pushed to a manually-created public GitHub repo.

## Non-goals

- Implementing the North Star gameplay systems (economy/combat/quests).
- Changing gameplay behavior inside the cart beyond textual/project naming updates required for publication.

## Repository structure (target)

Repo root:
- `README.md`
- `the-unbound.js` (TIC-80 cart)
- `LICENSE` (MIT)
- `.gitignore` (kept minimal; does **not** include local-doc-path guidance)

Docs:
- `docs/backlog.md`
- `docs/the-unbound-v1-learnings.md`
- `docs/plans/2026-04-24-the-unbound-prototype-design.md`
- `docs/plans/2026-04-24-the-unbound-prototype-v1.md`

## Local-only developer guidance (`LOCAL.md`)

`LOCAL.md` is an **optional, local-only** file for developer/Cursor guidance (e.g. where offline TIC-80 reference docs live).

Rules:
- `LOCAL.md` **must never be committed**.
- Keep it excluded via local git excludes (e.g. `.git/info/exclude`) so no committed ignore rules are required.
- `README.md` may reference `LOCAL.md` as an optional convenience file.

## Redaction + rename rules (committed content)

### “The Unbound” rename

- Use “The Unbound” consistently as the project name.
- Remove references to previous working titles as the project name.
- References to external works are allowed only when clearly labeled as external inspiration (not as the project’s name).

### PII / private info removal

Committed files must not include:
- Machine-local filesystem paths (home directories, personal work folders, etc.).
- Real names or personal identifiers.
- Any private workspace references.

## Public-facing README content requirements

The README should:
- Lead with: “prototype / stepping stone toward the North Star” (stable phrasing).
- Include a **North Star** section describing the larger intended game.
- Include clear **run instructions** for TIC-80 using `the-unbound.js`.
- Optionally include an **inspiration** note with a link to Mannzerhacker’s TIC-80 cart “THE DARK TOWER” and a short “not affiliated / diverges further” disclaimer.

