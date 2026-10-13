# Hand-out r3 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Branch `4.5-c`, reviewed at `11ec978` (tree of `ec8e71f`). The engine, the tests, the goldens, the
corpus fixture and the evidence are approved as built. This round is one comment rewrap. No code
changes, no test changes, no expected value changes and no evidence edits. Every gate stays as it
is (1908 tests, 1907 passed, 1 skipped). The corpus fixture is not regenerated. Push to `4.5-c`.

## Item

1. **`src/engine/__golden__/golden-spider-broodwarden.fixture.ts:18–21`.** Line 18 ends early at
   79 columns ("… so Broodwarden's cleanup rolls them -- but TARGET dies to"), with room for "the
   attack, so only". Replace lines 18–21 with these three lines, words unchanged (lines 15–17 stay
   as they are):

   ```
   // born in any turn), so Broodwarden's cleanup rolls them -- but TARGET dies to the attack, so only
   // OTHERFOE rolls: draw #1 = 0.7343 (SEED 2's mulberry32 sequence: 0.7343, 0.3250, ...), >= 0.10, so
   // it doesn't break, verified via an independent `node -e` trace of the exact rng.ts algorithm.
   ```

   They are 99, 100 and 95 columns.

After the edit: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations` and `-- comments`. The item changes only a comment, so
`npm run docs:check -- comment-proof 459ff06` must pass for every file. Check the widths with a
column count of lines 15–21, not by eye. Report as `report-r4.md`.
