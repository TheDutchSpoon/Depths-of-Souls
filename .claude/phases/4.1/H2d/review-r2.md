# PR review r2 — Phase 4.1 — Slice H2d: the balancing pass

Reviewed `report-r2.md` and branch `phase-4.1-h2d` at `67735de` against `handout-r1.md`.

## Verdict: approved

Fix 1 is done as asked and nothing else moved. The slice is ready to merge.

## What was verified, and how

- **Only the comment changed.** `git diff 381e67c 67735de -- src` touches `src/state/integration.test.ts` alone;
  with comments stripped (TypeScript printer, `removeComments: true`) the file is byte-identical to `381e67c`'s.
  The assertion is still `toHaveLength(0)`.
- **The new comment matches the fight.** Its numbers agree with the events I printed for r1 at 60% and at 30%:
  counters 10.5 → 10 on the Unicorn (× 0.75) and 15 on the Brute at 60%, 3.75 → 3 and 6 at 30%; Unicorn
  39 → 29 → 11 and Brute 33 → 18 → 3 with no `Revived` at 60%; Unicorn 39 → 36, Brute 33 → 12 → 6 → 0 and a
  revive at 30%. The cause is named: the larger opening counter takes the Unicorn below 80%, so the striker's
  rule 1 aims its one attack at the lowest-HP enemy. The report derives Attack 30 / Defence 15 from the printed
  raws, as the hand-out asked when the stats aren't events.
- **Gates** on `67735de`: the integration file's 6 tests pass; ESLint, Prettier `--check` and `tsc -b` clean.
  The rest of the suite is unaffected by a comment-only change (r1's full run stands: 1357 tests, 1356 passed,
  1 skipped).

## Decide-points

None.

## To delete

None.

## Docs edited

None this round. The r1 decisions (ASSUMPTIONS 150, 152, 154; GAME_DESIGN §13) are already on the branch in
`d69c20a`.
