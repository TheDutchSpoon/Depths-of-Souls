# Report r2 — 4.5-B, round 1 hand-out (cleanup)

Comments, a golden header, a golden helper's argument and evidence wording only. Nothing committed,
nothing deleted, no living doc edited. `record.md` needs no change: its numbers (1875 passed,
1 skipped; 143 corpus rows) and file list are unchanged.

## Hand-out items

1. **`golden-death-observed.fixture.ts`.** `fires()` takes `effectiveAfter` as a fourth argument
   and the eight call sites pass literals; the header states each beside its factor. **Deviation:**
   the hand-out gives ×1.1 → `22.000000000000004`, but `20 * 1.1` is exactly `22` in JS
   (`node -e "console.log(20*1.1, 20*1.1===22)"` → `22 true`). The first run with the hand-out's
   value failed both golden tests (expected `22.000000000000004`, received `22`), and the
   hand-out also requires the expected arrays to stay deep-equal to `74171ef`'s, so the literal is
   `22` and the header says "exact in JS". ×1.2 → 24, ×1.3 → 26, ×1.4 → 28 as the hand-out says.
   Checked by a throwaway vitest run (scratch copy of the tree) importing `74171ef`'s fixture
   (`git show 74171ef:…`) next to the current one: the same export keys, and every export
   (`enemyDies`, `playerDies`, the four traits, `enemyDiesExpected`, `playerDiesExpected`)
   `toEqual`: passed.
2. **Rot Sovereign block comment.** Re-wrapped; the last sentence ("Plus the spreading-Spore
   blanket, unconditional each of her own turns.") is one line.
3. **`golden-damage-observed-lethal.fixture.ts`, step 4.** Names the whole pass: FLARE (no death
   observer), GLEAM (fires its Last Light: Attack ×1.2 to every living ally, FLARE 14, GLEAM 24,
   A 20), then A and E (no death observer). The line-4 over-long wrap (item 4) is fixed here too.
4. **Over-long comment lines**, re-wrapped to the surrounding wrap: `rotcap-hollow.test.ts:3`,
   `rotcap-hollow.ts:82`, `golden-damage-observed-lethal.fixture.ts:4` and `:23`,
   `effect-types.ts:359`, `:689` and `:1007`, `resolution.ts:593`. `resolution.ts:296` is 96
   characters (104 bytes: it holds `—` and `→`), so it is not over 100 columns and is untouched.
   Checked by scanning every line the slice added against `main` for more than 100 characters in
   the six files: the only hits left are the `effect-types.ts` error-message template string
   (kept, per the hand-out) and one `effect-types.ts` comment line the scan found at :689 after
   the first re-wrap (`excludeActor … IS the actor.`), also re-wrapped.
5. **`evidence/corpus-attribution.md`, "Order change".** The 13 name + order cells now read
   `N blocks; first block events a-b, on-death-observed firings: main …; branch …`. A throwaway
   test dumped every corpus fight's event log on `main` and on the branch (scratch copies of both
   trees), `on-ally-death`/`on-enemy-death` mapped to `on-death-observed`; a block is the shortest
   run from the first difference over which the two logs hold the same multiset, then scanning
   resumes after it. Blocks per fight: 24 → 2, 42 → 1, 85 → 3, 89 → 1, 110 → 1, 114 → 3, 115 → 2,
   140 → 4, 144 → 1, 145 → 1, 149 → 1, 200 → 5, 204 → 5: **30 in total across the 13 fights**.
   The firings listed are `TriggerFired` events with the death-observer hook, by `sourceId`, so
   `hollowkin-wretch` no longer appears. Event ranges are 0-based log indices, inclusive, the
   basis the old "first diverging span" used (fight 42's first block is 13–20, as before). I added
   one sentence to the method paragraph defining a block and the column (the hand-out says the
   method paragraph stays; say if you want that sentence out). Counts and other columns untouched.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1875 passed, 1 skipped, 0 failed (215 files, 1876 tests): unchanged |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 636 citations in 439 files |
| `npm run docs:check -- comments` | PASS, 7040 comments and 1651 titles in 406 files |
| `npm run docs:check -- comment-proof 74171ef` | OK for `rotcap-hollow.test.ts`, `rotcap-hollow.ts`, `golden-damage-observed-lethal.fixture.ts`, `effect-types.ts`, `resolution.ts`. FAIL only for `golden-death-observed.fixture.ts`, as the hand-out expects (the `fires()` signature changed); its exports are proved deep-equal above |

## Golden policy and corpus digest

- No expected value changed: `enemyDiesExpected` and `playerDiesExpected` deep-equal `74171ef`'s,
  compared by importing both versions, not by reading the diff. No other golden's data changed.
- The corpus digest fixture is unchanged from `74171ef` (`git diff 74171ef -- src/engine/__corpus__`
  is empty); `corpus:update` was not run.
- No mechanism changed, so no removal tests apply.

## Spec questions

None new. The Spec questions in `report-r1.md` stand.

## Content changes

None.

## To delete

None. (The throwaway scratch copies of both trees and their dumps are in the session scratchpad,
outside the repo.)
