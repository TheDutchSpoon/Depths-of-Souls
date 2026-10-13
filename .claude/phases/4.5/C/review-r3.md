# PR review r3 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Branch `4.5-c` at `11ec978`, the merge of PR #108, whose tree is the same as its fix commit
`ec8e71f`. Reviewed against `main` at `dd703a4` and against the previous round's commit `459ff06`.
The fix diff is `fa704e5..ec8e71f` (`fa704e5` adds only `review-r2.md` and `handout-r2.md` on top of
`459ff06`). This round reviews `report-r3.md`, the reply to `handout-r2.md`.

## Verdict

**Fixes: cleanup only** (`handout-r3.md`, one item). The fix landed on `4.5-c` this time. Items 1,
3, 4 and 5 of `handout-r2.md` are done as worded. Item 2 is half done: the two lines it named are
fixed, but the rewrap left line 18 of the same paragraph ending 20 columns early, and line 18 is in
the range the item named (15–18). Nothing else is open. The engine, tests, goldens and corpus are
the same as the approved `459ff06`, checked below.

## Real fixes

None.

## Scope and labeling (in `handout-r3.md`)

1. **`golden-spider-broodwarden.fixture.ts:18` ends early.** It is 79 columns and stops at "but
   TARGET dies to", with "the attack, so only" still fitting under 100. `handout-r2.md` item 2 asked
   for lines 15–18 rewrapped with no line ending early mid-sentence. The report says "no
   early-ending line", which isn't so for line 18; the report is history, so I'm only noting it
   here. Reflowing lines 18–21 fills it and saves a line.

Accepted as built, no action:

- **`evidence/corpus-table.md:39` is 102 columns.** It's the first-differing-event lead-in with the
  parenthesis `handout-r2.md` dictated. The report flags it. The 100-column bar was set for items
  1 to 4, and the file already has a longer line (`:17`, 113) that earlier rounds accepted.
- **`golden-provoke-stun-cleanup.fixture.ts:31` is one word ("bracket).").** That's what a greedy
  wrap gives: line 30 is 99 columns. Not an early ending.

## Decide-points

None. This round makes no design decision. By `workflow/pr-review.md#output-in-the-mailbox` the one item
gets its own round, even though it is one comment: a review doesn't approve with cleanup left in.
`handout-r3.md` gives the exact replacement lines, so round 4 is mechanical.

## Verified, and how

All in my own clone: worktrees of `origin/4.5-c` (`11ec978`), `459ff06` and `origin/main`
(`dd703a4`); `npm ci` on the branch and on `main`, Vitest 5.0.3 as the lockfile pins.
`package.json` and `package-lock.json` are the same on all three, so the `459ff06` worktree, used
only for the golden dump, borrows the branch's `node_modules`.

- **Gates on `11ec978`:** `test` 1908 tests, 1907 passed, 1 skipped, 0 failed (226 files); `lint`,
  `format:check`, `build` and `npx tsc -b` clean; `docs:check` citations PASS (651 in 459 files),
  comments PASS (7317 comments, 1700 titles), budgets 0 over (12 files). This matches the report.
- **Test count, file by file** (`vitest --reporter=json` on both trees): `main` 1898 tests in 223
  files (1897 passed, 1 skipped), the branch 1908 in 226. The differences are r2's exactly:
  `dead-slot-skip.test.ts` +7, the two new golden tests +1 each, `balance-sim.test.ts` 78 → 79, and
  titles renamed in place in `combat.test.ts` (2), `status-timing.test.ts` (1) and
  `balance-sim-report.test.ts` (1). The fix diff touches no test file.
- **Goldens, every export** (each `__golden__/*.fixture.ts` imported with `import.meta.glob`,
  Maps, Sets and functions serialized, deep-compared): against `459ff06`, 144 of 144 identical in
  every export. Against `main`, 135 identical; the 7 that differ are r1's 7 in r1's exports
  (`expectedEvents`, `TURN_STEPS`, `revived`/`revivedExpected`, `expectedEventTypeCounts`), plus the
  2 new fixtures.
- **Comment-only claim:** `docs:check -- comment-proof 459ff06` gives OK for `statuses.ts`,
  `golden-provoke-stun-cleanup` and `golden-spider-broodwarden`, the only `src/` files that differ.
- **Corpus digest:** the corpus fixture and test are unchanged from `459ff06`, and
  `corpus-digest.test.ts` passes.
- **Mutation:** no mechanism changed in the fix diff and no pin was asked for, so nothing to remove.
- **Each `handout-r2.md` item, in the files:**
  1. `statuses.ts:122–128`: the longest line is 98 columns, none ends early, words unchanged.
  2. `golden-spider-broodwarden.fixture.ts:15–17` are 93, 93 and 95 columns; `:18` is 79 (scope
     item 1).
  3. `golden-provoke-stun-cleanup.fixture.ts:20–35`: longest 99, both paragraphs rewrapped.
  4. `record.md:35–37`: 92, 95 and 60 columns, two-space indent, words unchanged.
  5. `corpus-table.md`: one lead-in, word for word the hand-out's; the `:39` parenthesis as given;
     the tables unchanged.
- **Leftover sweep** (`src/`, `.claude/` minus `phases/` and `archive/`), on the final commit:
  `firstRoundEnemyIds`, "dequeued turn", "now-empty", "every creature's turn", "empty
  dead-before-turn", "empty TurnStarted", "bracket for a creature that died", "still bumps",
  `e8d0ffd`, "319 / 74": no hits. "Empty bracket" is only `resolution.test.ts:84`, a living
  creature's skipped turn, still true. "Dead actor" is only a creature killed in its own turn
  (`actions.ts`, `combat.ts:482`, `status-timing.test.ts:740`, `spec/combat.md:423`), still true.
  The Web roll's "about 72%" in `statuses.ts`, `spec/statuses.md` and `content/overgrowth.md` all
  count living creatures.
- **Mailbox:** step files plus the six `evidence/` files, each cited. Nothing to delete.

## Docs edited

None. No decision was made and no content changed.
