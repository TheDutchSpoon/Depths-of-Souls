# PR review r2 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Commit `459ff06` (`459ff0606f7f`), on the branch `claude/slice-fix-4-5-c-1-p1792v`. Reviewed against
`main` at `dd703a4` and against the previous round's commit `d5b52d8`, which is `459ff06`'s parent.
This round reviews `report-r2.md`, the reply to `handout-r1.md`.

## Where the fix landed

The fix commit is not on `4.5-c`. The remote `4.5-c` and Duncan's working tree are both still at
`d5b52d8`. `report-r2.md` and the fix exist only on `claude/slice-fix-4-5-c-1-p1792v`. I reviewed
that branch. `d5b52d8` is its direct parent, so `4.5-c` can fast-forward to it. This review and
`handout-r2.md` are new files and touch nothing the fix commit changes, so the fast-forward doesn't
conflict with them. See decide-point 1.

## Verdict

**Fixes: cleanup only** (`handout-r2.md`). Real fix 1 from r1 is done and pinned: a clock bump at
the dead slot now fails `golden-dead-slot-skip` and nothing else, as it should. Items 2 to 6 are
done. Item 7, the rewraps, is half done. The report says `statuses.ts` was rewrapped with the words
unchanged, but the `WEB` doc's long line only moved down: it was 136 columns and is now 138. Item
5's word change pushed a line in `golden-spider-broodwarden` to 105 columns. The corpus-table edit
left two lead-ins that contradict each other. None of this is code. It is all left for one more
short round, because a review doesn't approve with cleanup left in.

## Real fixes

None. Every code item from r1 checks out in the code and the tests (Verified, below).

## Scope and labeling (all in `handout-r2.md`)

1. **`statuses.ts:127` is 138 columns.** Item 7 named this exact doc (line 126, 136 columns). The
   rewrap moved the long tail to the next line without wrapping it. `comment-proof` passes because
   only the comment changed. The report's line 7 ("Rewraps, words unchanged: `statuses.ts` …")
   claims more than was done. The report is history, so I'm only noting it here.
2. **`golden-spider-broodwarden.fixture.ts:16–17`.** Item 5 changed "LIVING / EVERY creature's" to
   "living / every living creature's" without rewrapping. Line 17 is now 105 columns, and line 16
   still ends early.
3. **`golden-provoke-stun-cleanup.fixture.ts:30` and `:33`, 101 columns each.** Both are lines this
   slice wrote. `:33` is in the range r1's item 7 named. It's one column over, but r1 set the bar at
   100 and the fix costs nothing.
4. **`record.md:35`.** The corpus bullet was rewritten as one 173-column line. The bullets around it
   wrap at about 100.
5. **`evidence/corpus-table.md:25–30` and `:42`.** The old lead-in ("comparing final with main minus
   the dead brackets and everything inside them") stayed, and the new one ("Under stage 1's reading
   … kept in place") went right under it. The 318 / 75 split uses stage 1's reading, so the old one
   is now wrong there. The first-differing-event table at `:42` needs the opposite label. r1 checked
   that table under the reading where the dead brackets' contents are dropped, and its parenthesis
   "(main minus dead brackets, then final)" doesn't say which.

## Decide-points

1. **Bring the fix onto `4.5-c` before `/slice-fix 4.5-c 2`.** The coding agent's session pushed to
   a `claude/…` branch instead of the slice branch. As things stand, a round-3 coding session started
   from `4.5-c` would work from `d5b52d8` and miss `report-r2.md` and the r2 fixes. **Recommend:**
   fast-forward `4.5-c` to `459ff06`
   (`git fetch origin && git merge --ff-only origin/claude/slice-fix-4-5-c-1-p1792v`, then push),
   delete the `claude/…` branch, and tell the next fix session to push to `4.5-c`. If the PR is
   meant to come from the `claude/…` branch instead, say so and I'll name that branch in the next
   round.

No other decide-points. This round makes no design decision.

### Decisions

- **D1:** as recommended. At Duncan's request, the design agent fast-forwarded the remote `4.5-c`
  from `d5b52d8` to `459ff06`. Duncan deletes `claude/slice-fix-4-5-c-1-p1792v` and pulls `4.5-c`
  into his working tree.
- The verdict stands: **fixes**, with `handout-r2.md`.

## Verified, and how

All in my own clone: worktrees of `459ff06`, `d5b52d8` and `origin/main` (`dd703a4`), `npm ci` on
the branch and on `main`, Vitest 5.0.3 as the lockfile pins. The lockfile and `package.json` are
the same at `d5b52d8` and `459ff06`.

- **Gates on `459ff06`:** `test` 1908 tests, 1907 passed, 1 skipped, 0 failed (226 files); `lint`,
  `format:check`, `build` and `npx tsc -b` clean; `docs:check` citations PASS (651 in 459 files),
  comments PASS (7317 comments, 1700 titles), budgets 0 over. This matches the report.
- **Test count, file by file** (`vitest --reporter=json` on both trees): `main` has 1898 tests in 223
  files (1897 passed, 1 skipped), the branch 1908 in 226. The differences are the same as r1's:
  `dead-slot-skip.test.ts` +7, the two new golden tests +1 each, `balance-sim.test.ts` 78 → 79, and
  titles renamed in place in `combat.test.ts` (2: the death-mid-round test from r1, and this
  round's "per dequeued turn" → "per turn"), `status-timing.test.ts` (1) and
  `balance-sim-report.test.ts` (1). Every other file has the same count and titles. Against
  `d5b52d8`, the fix diff adds no test and removes none. It adds one assertion and renames one title.
- **Goldens, every export** (all `__golden__/*.fixture.ts` imported on each tree with
  `import.meta.glob`, Maps and functions serialized, deep-compared):
  - against `d5b52d8`, 143 of 144 fixtures are identical in every export. The one difference is the
    new `expectedTurnClock` in `golden-dead-slot-skip`;
  - against `main`, 135 of 142 are identical, and the 7 that differ are r1's 7 in r1's exports
    (`expectedEvents`, `TURN_STEPS`, `revived`/`revivedExpected`, `expectedEventTypeCounts`), plus
    the 2 new fixtures. Nothing new moved.
- **`expectedTurnClock = 2`, by hand:** `createCombat` starts the clock at 0, and `resolveTurn` bumps
  it once at a living turn's action slot. The window is HERO's turn (1), D's dead slot (no turn) and
  E's turn (2). The fixture doc says this.
- **Comment-only claim:** `docs:check -- comment-proof d5b52d8` gives OK for `statuses.ts`,
  `combat.ts`, `golden-broodmother`, `golden-provoke-stun-cleanup`, `golden-rot-sovereign` and
  `golden-spider-broodwarden`. It fails only `golden-dead-slot-skip.fixture.ts`,
  `golden-dead-slot-skip.test.ts` (item 1) and `combat.test.ts` (item 4's title), which is what the
  hand-out predicted. `src/` is the same at `2f11823` and `d5b52d8`, so the report's base
  `2f11823` gives the same result.
- **Corpus digest:** the fixture is unchanged from `d5b52d8`, and `corpus-digest.test.ts` passes.
- **Mutation, the new pin** (scratch copy, an env-gated clock bump after the dead-slot branch of the
  dequeue loop; ran `golden-dead-slot-skip`, `golden-dead-slot-round-boundary`, `dead-slot-skip`,
  `combat.test.ts`, `status-timing.test.ts` and `corpus-digest`, 85 tests): unmutated, 85 pass.
  Mutated, exactly 1 fails: `golden-dead-slot-skip`, `expected 3 to be 2` on `turnClock`. This
  matches the M13 row in `evidence/mechanism-removal.md`. I restored the scratch copy afterwards. No
  other mechanism changed this round.
- **Each r1 hand-out item, in the files:** 1 is above. 2: `record.md` and `corpus-table.md` give
  318 / 75 with fight 126 in the Web-draw class and the 319 / 74 note once, but see scope item 5.
  3: `dd703a4` in all three evidence files, and no `e8d0ffd` is left in the mailbox outside the
  step files that quote it. 4 and 6: done as worded. 5: words done, but see scope item 2. 7: done in
  `golden-broodmother`, `combat.ts` (both comments) and the broken line in
  `golden-provoke-stun-cleanup`, but not in `statuses.ts` (scope item 1).
- **Leftover sweep** (`src/`, `.claude/` minus `phases/` and `archive/`), on the terms this round
  corrected: "dequeued turn", "now-empty", "every creature's turn" / "EVERY creature", "dead
  actor's bracket", "empty dead-before-turn", `firstRoundEnemyIds`, `e8d0ffd`, "319 / 74". No hits.
- **Long lines:** among the lines this slice adds or changes in `src/` compared with `main`, the
  comments over 100 columns are exactly hand-out items 1 to 3. The others the scan finds are a
  `describe`/`it` title or object literals that Prettier formats, or lines `main` already had
  (`combat.ts:415` is `main`'s comment, two columns shorter after the dedent).
- **Mailbox:** step files plus the six `evidence/` files, each cited. Nothing to delete.

## Docs edited

None this round. No decision was made and no content changed. r1's spec edits are in `d5b52d8`.
