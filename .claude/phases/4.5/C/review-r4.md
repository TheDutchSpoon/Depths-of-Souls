# PR review r4 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Branch `4.5-c` at `51285df`, the merge of PR #109, whose tree is the same as its fix commit
`80b6ccc`. Reviewed against `main` at `dd703a4` and against the previous round's commit `11ec978`.
The fix diff is `11ec978..51285df`: besides the mailbox files (`review-r3.md`, `handout-r3.md`,
`report-r4.md`), it changes only `golden-spider-broodwarden.fixture.ts`, 4 lines out and 3 in. This
round reviews `report-r4.md`, the reply to `handout-r3.md`.

## Verdict

**Approved.** The one item in `handout-r3.md` is done as worded, the comment-only claim holds, and
the engine, tests, goldens and corpus are the same as the approved `11ec978`. Nothing is open.

## Real fixes

None.

## Scope and labeling

None. Noted, no action: `golden-spider-broodwarden.fixture.ts:10` is 101 columns, but the line is
the same on `main` and this slice never touched it; `docs:check -- comments` passes.

## Decide-points

None. No design decision was made this round.

## Verified, and how

All in my own clone: worktrees of `origin/4.5-c` (`51285df`), `11ec978` and `origin/main`
(`dd703a4`); `npm ci` on the branch and on `main`, Vitest 5.0.3 as the lockfile pins.
`package.json` and `package-lock.json` are the same on all three, so the `11ec978` worktree, used
only for the golden dump and a comment count, borrows the branch's `node_modules`.

- **`handout-r3.md` item 1, in the file:** `golden-spider-broodwarden.fixture.ts:18–20` are the
  hand-out's three lines character for character. A column count of lines 15–21 gives 93, 93, 95,
  99, 100, 95, 2: none over 100, none ending early. The draws it quotes are right: mulberry32 from
  seed 2, written apart from `rng.ts`, gives 0.7343 then 0.3250.
- **Gates on `51285df`:** `test` 1908 tests, 1907 passed, 1 skipped, 0 failed (226 files); `lint`,
  `format:check`, `build` and `npx tsc -b` clean; `docs:check` citations PASS (651 in 459 files),
  comments PASS (7316 comments, 1700 titles; 7317 on `11ec978`, the one line the rewrap saves),
  budgets 0 over (12 files). This matches the report.
- **Test count, file by file** (`vitest --reporter=json` on both trees): `main` 1898 tests in 223
  files, the branch 1908 in 226. The differences are r3's exactly: `dead-slot-skip.test.ts` +7, the
  two new golden tests +1 each, `balance-sim.test.ts` +1, and titles renamed in place in
  `combat.test.ts` (2), `status-timing.test.ts` (1) and `balance-sim-report.test.ts` (1).
- **Goldens, every export** (each `__golden__/*.fixture.ts` imported with `import.meta.glob`,
  Maps, Sets and functions serialized, deep-compared): against `11ec978`, 144 of 144 identical in
  every export. Against `main`, 135 identical; the 7 that differ are r1's 7 in r1's exports
  (`expectedEvents`, `TURN_STEPS`, `revived`/`revivedExpected`, `expectedEventTypeCounts`), plus
  the 2 new fixtures.
- **Comment-only claim:** `docs:check -- comment-proof 11ec978` gives OK for
  `golden-spider-broodwarden`, the only `src/` file that differs; `comment-proof 459ff06` still
  gives OK for all 3 files changed since r1.
- **Corpus digest:** the corpus fixture is unchanged from `11ec978`, and `corpus-digest.test.ts`
  passes in the full run.
- **Mutation:** no mechanism changed in the fix diff and no pin was asked for, so nothing to remove.
- **Leftover sweep** (`src/`, `.claude/` minus `phases/` and `archive/`), rerun on the final
  commit: `firstRoundEnemyIds`, "dequeued turn", "now-empty", "every creature's turn", "empty
  dead-before-turn", "empty TurnStarted", "bracket for a creature that died", "still bumps",
  `e8d0ffd`, "319 / 74": no hits. "Empty bracket" is only `resolution.test.ts:84`, a living
  creature's skipped turn. "Dead actor" is only a creature killed in its own turn (`actions.ts`,
  `combat.ts:482`, `status-timing.test.ts:740`, `spec/combat.md:423`). Both are still true.
- **Doc sync:** r1's spec, content and brief edits are on the branch (`.claude/` against `main`:
  `CONVENTIONS.md`, `content/overgrowth.md`, `phases/4.5/brief.md`, `spec/combat.md`,
  `spec/statuses.md`), and the fix rounds since touched no living doc.
- **Mailbox:** step files plus the six `evidence/` files, each cited. Nothing to delete.

## Docs edited

None. No decision was made and no content changed.
