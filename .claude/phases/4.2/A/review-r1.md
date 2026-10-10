# PR review r1 — Phase 4.2 — Slice A: The mechanical restructure

Reviews `report-r1.md`, branch `phase-4.2-slice-A` at `fe30f81` (merge-base with `main`: `ba18fa0`).

## Verdict

**Approved.** No code fixes, so no hand-out. The 13 files are exactly what the briefs specify: I
rebuilt all of them from the pinned blobs with my own code, sharing nothing with the script, and
got the committed bytes. The gates are green on Node 24, `src/` is untouched, and the test count
matches `main`'s in every file. Two findings below are about labeling, not code, and three
decide-points need your call; none of them blocks the merge.

## Real fixes

None.

## Scope and labeling

1. **`line-proof` is less independent of `move` than the report says.** The report (A3) says the two
   "share no map, assembly or read-when code". They share `HALF_ORDER` and `capitalise`. Planted in
   a scratch clone: with `HALF_ORDER` reordered, `move` writes four files with To fold before Engine
   rules and `line-proof` passes; with `capitalise` changed, all ten spec titles change and
   `line-proof` passes. Nothing shipped is affected: my independent rebuild (below) proves the
   committed layout, titles included. `line-proof` has no further job after this merge (it fails by
   design once B condenses a file), so I'm not asking for a round to separate them. The record's
   "`line-proof` checks the move independently" carries the same overstatement; this review is the
   correction of record.
2. **4.2-only helpers without their own marker** (the report flags these itself). Not dead-code risk:
   `tsconfig.node.json` has `noUnusedLocals`, so `tsc -b` fails on any of them left behind once
   4.2-G removes the modes. Written into the G brief.
3. **`resolveAnchors` differs from GitHub in three places,** which matter once 4.2-G makes it
   blocking: a suffixed slug can collide with a real heading (`a`, `a`, `a-1` gives `a-1` twice;
   GitHub gives `a`, `a-1`, `a-1-1`); a heading indented one to three spaces isn't seen; `_emphasis_`
   and HTML entities (already in its doc comment). Probed directly. None affects B to F's
   inventories, which only need a New home to name some heading. Written into the G brief.
4. **Mailbox:** step files and `evidence/` (plain text) only. Nothing to move.

## Decide-points

1. **`move` overwrites without a check.** Shown in a clone: a hand edit to `spec/store.md`, then
   `move`, and the edit is gone with no warning. After this merge `move` has no job, but it stays in
   the script until 4.2-G, five slices during which condensed text sits uncommitted in your tree.
   - **Recommendation: accept, with the step-file line I've added** to `workflow/condense.md` ("never
     run `move` or `line-proof` after 4.2-A"). The only uncommitted window is my condense step; the
     coding agent's verify step runs only `inventory`; anything committed is recoverable from git.
     A guard (refuse unless each target is absent, pinned or already `move`'s output) is ten lines
     plus a planted-fault run, but it costs a fix round for a mode that 4.2-G deletes.
   - Alternative: one fix round for the guard.
2. **When to delete `GAME_DESIGN.md`.** **Recommendation: on this branch, before you merge.** My doc
   edits move every pointer to the new files, and the old text stays readable at `892f1b8`, which
   the transition note in `CLAUDE.md` and `/slice-verify` already use. Left on `main`, 105 KB of
   superseded spec sits beside its replacement for five slices, and a chat that searches finds
   both. That duplication is the problem 4.2 exists to remove.
3. **One sentence I added beyond the phase brief's reading model** (rule 6), in
   `workflow/coding-rules.md`: "If the change reaches a subsystem whose spec file the kickoff
   doesn't name, read that file too and say so in the plan." **Recommendation: keep.** Rule 6 has
   reviewers read any spec file the diff touches. Without this sentence the coding agent could edit
   code whose rules it was never told to read, and only the PR review would catch it. Strike it if
   you want the kickoff to be the only reading list.

## What was verified, and how

All in my own sandbox (a fresh clone, worktrees for the PR and `main`), never in your tree, except
the read-only `line-proof` run noted below.

- **Toolchain:** Node 24.21.0 (lockfile engines `^22.22.2 || ^24.15.0`, CI 24); `npm ci` on both
  trees; Vitest 5.0.3, as the lockfile pins.
- **Gates:** `npm run test` 201 files, 1357 tests (1356 passed, 1 skipped) on both the PR and
  `main`; per-file counts compared from Vitest's JSON reporter: **0 of 201 files differ**. `lint`,
  `format:check`, `build` and `npx tsc -b` green on the PR (`tsc -b` covers `scripts/` through
  `tsconfig.node.json`).
- **Golden policy, byte-identical:** `git diff origin/main..HEAD -- src` is empty, so every golden
  fixture and the corpus digest fixture are the same files as on `main`. No fixture import
  comparison needed: there's nothing to compare.
- **Diff scope:** the build commit touches only the 13 files, `scripts/docs-check.ts`,
  `package.json` (one line, `docs:check`), `tsconfig.node.json` (`include` gains `scripts`) and the
  mailbox (`report-r1.md`, `record.md`, `evidence/`). The PR's other changes are the kickoff and
  plan-review doc edits (phase brief, A and G briefs, `workflow/condense.md`). The lockfile is
  unchanged.
- **Independent rebuild of the 13 files** (a Python probe sharing no code with the script): read
  both files with `git show 892f1b8:…` (sha256 prefixes `91455dd2026ba18d` and `0970f347753833df`
  match); parse the 66 map rows from the phase brief (they tile both files, every line exactly once)
  and the 13 read-when lines from the A brief; assemble per the A brief (title, read-when, halves in
  Design, Engine rules, To fold order, nothing between rows; `CONVENTIONS`/`VISION` with old line 2
  as the blank after the read-when line). **All 13 committed blobs are byte-identical to the
  rebuild**, LF only, no BOM.
- **`line-proof`:** `map PASS, multiset PASS, placement PASS`, 13 × `MATCH` on rows-only bytes, in my
  clone and in your working tree (read-only run, Node 22.23.2 in the device shell, so the condense
  steps can run the script there too).
- **`move` determinism:** two runs in a clone, the tree identical to the committed files.
- **Units, independently counted:** CONVENTIONS 261, GAME_DESIGN 262; C 154, D 172, E 87, F's pinned
  110 (sum 523, each in one slice); B 228 (`content/` 22 + 37 + 45 + 36, `specializations/` 17 + 15
  + 10, `species-locked.md` 46); F's other files 24, 100 and 34. The script's skeletons for B to F,
  written in a clone, list **exactly my ids in the same order** (compared as id lists). Each
  unedited skeleton fails `inventory` on rules 3, 4 and 5 only, once per row each (B 684 = 3 × 228,
  C 462, D 516, E 261, F 804), so the skeleton's own labels pass rule 6, including C:119 and C:555.
- **My own mutation probes** (scratch clone, restored after each): a read-when line changed in the A
  brief only makes `line-proof` fail multiset and placement, so the read-when copies are
  independent; `HALF_ORDER` and `capitalise` (labeling 1); `move` over an edited file
  (decide-point 1).
- **Plan fixes 1–8 against code and evidence:** 1–3 read in `planted-faults-inventory.txt` and
  `planted-faults-line-proof.txt` (every fault shows its non-empty diff before the verdict); 4 in the
  code (the skeleton writes its own file and refuses to overwrite) and in my runs; 5 reproduced
  above; 6 checked (labeling 2); 7 run with `b`; 8 in the code (heading text trimmed before
  slugging).
- **Not verified:** the PR's CI result. GitHub isn't reachable from this session. Please confirm the
  PR's checks are green before merging.

## Content docs

Nothing to fold: the slice changes no content.

## To delete

- `.claude/GAME_DESIGN.md`, on this branch (decide-point 2).

## Docs edited

- `CLAUDE.md`: line 93's pointer to `GAME_DESIGN.md` replaced by the doc map (the 12 files outside
  `CONVENTIONS` with their read-when) and the reading model; the `(Phase 4.2 only)` note on
  resolving old citations through the map or `892f1b8`, and on the unfolded `## To fold` halves;
  `CONVENTIONS.md` named as the file every chat reads.
- `WORKFLOWS.md`: the layout block (`VISION`, `OPEN_QUESTIONS`, `spec/` in, `GAME_DESIGN` out) and
  the living-docs list under "Docs and records".
- `workflow/coding-rules.md`: the reading list (`CONVENTIONS` plus the kickoff's spec files, and the
  sentence of decide-point 3); the living-docs list.
- `workflow/design-rules.md`: the session reading list (`CONVENTIONS` added; which spec files a
  kickoff and a review read).
- `workflow/kickoff.md`: a "Spec files" line in the template, and one sentence saying the kickoff
  names them.
- `workflow/pr-review.md`: step 3 checks against the spec files and `CONVENTIONS`, not
  `GAME_DESIGN`.
- `workflow/condense.md` (Phase 4.2 only file): the skeleton now writes `inventory.md` itself (plan
  fix 4); never run `move` or `line-proof` after 4.2-A (decide-point 1).
- `ROADMAP.md`, Phase 4.2: status (4.2-A done, B next); budgets are "reported", not "enforced",
  matching the phase brief (A8).
- `phases/4.2/G/brief.md`: a "Known from 4.2-A's review" section (resolver gaps, unmarked helpers,
  `merge-base` needing a local `main`).
