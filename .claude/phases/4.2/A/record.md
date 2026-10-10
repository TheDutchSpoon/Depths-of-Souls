# Record — Phase 4.2 — Slice A: The mechanical restructure

**Status: built.** Golden policy byte-identical; `src/` untouched; test count 1357 (1356 passed, 1
skipped), equal to `main`'s file by file.

## What was built

- **`scripts/docs-check.ts`**, run as `npm run docs:check -- <mode>` by Node's type stripping, no
  dependency. Four modes, all marked `(Phase 4.2 only)`:
  - `move` writes the 13 files of the target layout from the pinned commit `892f1b8` (sha256
    prefixes `91455dd2026ba18d` for CONVENTIONS and `0970f347753833df` for GAME_DESIGN, checked on
    every read). Rows are copied byte for byte, in old order, with nothing inserted between them; the
    title, the read-when line and the half headings (`## Design`, `## Engine rules`, `## To fold`)
    are the only additions. Deterministic: two runs give the same sha256 per file.
  - `line-proof` checks the move independently: it parses the map, the size column and the
    read-when table out of the briefs. Checks: map (tiling, labels, targets, halves), multiset of
    non-blank lines minus the allowed additions, and exact placement (whole lines, blank lines and
    trailing whitespace included, no stray file in `spec/`). It reports rows-only and whole-file
    bytes against the brief's table.
  - `inventory-skeleton <slice>` writes `phases/4.2/<slice>/inventory.md` (B to F, case-insensitive,
    refuses to overwrite); `inventory <slice>` checks it (seven rules: coverage, ownership, fate,
    New home, Reason, Old label, cell count). Units: 261 in CONVENTIONS, 262 in GAME_DESIGN, 523
    across C to F, asserted on every run. The base is `git merge-base HEAD main`, and other files
    are read and glob-expanded at the base, never from the working tree.
- **`resolveAnchors`**, GitHub's heading-anchor rules without a dependency (lasting; 4.2-G reuses it
  for citations).
- **`package.json`**: the `docs:check` script. **`tsconfig.node.json`**: `include` gains `scripts`,
  so `tsc -b` type-checks the script (and `npm run lint` lints it).
- **The 13 files**, written by `move`: `CONVENTIONS.md` (overwritten in place), `VISION.md`,
  `OPEN_QUESTIONS.md` and `spec/{effects,combat,statuses,creatures,run,scripting,responses,
  progression,store,saves}.md`. Rows-only bytes match the phase brief's size table for all 13.
  `GAME_DESIGN.md` is left in place for Duncan to delete.

## Numbers

Unit counts per slice: B 228 (content 140, specializations 42, `species-locked.md` 46), C 154, D 172,
E 87, F 110 pinned (+ `CLAUDE.md` 24, `ROADMAP.md` 100, `WORKFLOWS.md` 34).

## Decisions made while building

The assumptions A1 to A15 of the plan stand, with the review's eight fixes. Notably: the skeleton
writes its own file (npm's banner and PowerShell's UTF-16 redirect make `> inventory.md` unsafe); the
stale-base guarantee is "the base moves when the slice branch takes in `main`", proven by a merge in
a scratch clone; a `dropped` row's New home, when present, must still resolve.

## Evidence

`phases/4.2/A/evidence/` (see `report-r1.md`).
