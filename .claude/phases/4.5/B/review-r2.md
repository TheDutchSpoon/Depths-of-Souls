# PR review — 4.5-B: on-death-observed, and `createCombat` validates its trait registry

## Round 2

**Branch** `4.5-b`, commit `7ca4b09` ("fix"), against `main` at `d9d3e86` and round 1's
`9f0e3b0` (whose `src` is identical to the reviewed `74171ef`). Reviewed in my own clone (three
worktrees, fresh `npm ci` each), not in the working tree.

**Verdict: fixes (cleanup only), one more round.** Every round-1 hand-out item is done as asked,
and the one deviation in `report-r2.md` is right: my round-1 value was wrong. The final leftover
sweep found two stale comments that count the observation hooks as two, and one over-long comment
line. Plan hand-out item 4 had already asked for one of those comments, and my round-1 review
missed it. Behaviour, expected events, goldens and the corpus are approved as they stand. All three
items go to `handout-r2.md`.

### Real fixes

None.

### Round-1 hand-out, checked in the code

1. **`golden-death-observed`'s after values.** `fires()` takes `effectiveAfter` as a literal
   fourth argument at all eight call sites, and the header states each beside its factor.
   **The report's deviation is correct, and my round-1 value was wrong.** `20 * 1.1` is `22` in
   JS: `1.1` is stored as `1.1 + 8.9e-17`, so the exact product is `22 + 2^-49`, which is exactly
   half an ulp at 22. Round-half-to-even gives `22`. I re-ran it (`22 24 26 28`,
   `20*1.1 === 22` true). The literals pin what they claim. Changing `26` to
   `26.000000000000004` fails `golden-death-observed`'s `enemyDies` test.
2. **The Rot Sovereign's block comment** now ends on one line run.
3. **`golden-damage-observed-lethal`, step 4** names the whole pass: FLARE, GLEAM with its Last
   Light, then A and E.
4. **Over-long lines.** Every line I listed is re-wrapped except `resolution.ts:296`. That line is
   96 characters, and my round-1 list counted bytes: the report is right to leave it. My round-1
   scan also missed one line, below.
5. **The evidence table's Order change column.** I re-derived it on my own: I dumped the 13 fights
   on both trees, mapped the old names, and split each fight into minimal reordered blocks. Every
   cell matches: block counts 2, 1, 3, 1, 1, 3, 2, 4, 1, 1, 1, 5, 5 (30 in all), every first-block
   range, and both firing lists. Every block holds only `TriggerFired(on-death-observed)`,
   `StatModifierApplied` and `HealApplied`. Each fight keeps the same event multiset and result.
   The sentence the report added to the method paragraph defines the column. **Keep it.** The
   report asked whether to remove it, and this is the answer.

### Leftover sweep (final commit, `src/` and the living docs)

- No hook name is left: `on-ally-death` and `on-enemy-death` appear nowhere in `src/` or the
  living docs. The only hits are the plain words round 1 accepted (`golden-rot-sovereign`'s "the
  ally-death growth", the test-local id `'ally-death'`).
- No private `livingIds` copy is left. `validateTrait` is imported only from
  `engine/effect-types.ts`.
- **Still counting two observation hooks** (hand-out items 1 and 2):
  - `FireHookOptions.observedDamage`'s doc (`resolution.ts:446`) still reads "Both observation
    hooks FAIL CLOSED" and names two. Plan hand-out item 4 named this comment. My round-1 review
    marked that item done without it.
  - In `damage-observation.test.ts:332`, `describe('both observation hooks fail closed')` covers
    the action and damage hooks. The death hook's fail-closed test is in
    `death-observed.test.ts`.
- **One comment line over 100 columns** (hand-out item 3): `death-observed.test.ts:139`, a
  trailing comment at 101. The round-1 list missed it.

### Gates (my run, `7ca4b09`)

| Gate | Result |
| --- | --- |
| `npm run test` | 1875 passed, 1 skipped (1876 tests, 215 files) |
| `npm run lint`, `format:check`, `build`, `npx tsc -b` | clean |
| `docs:check -- citations` / `comments` | PASS (636 citations; 7040 comments, 1651 titles) |
| `docs:check -- budgets` | 0 over |
| `docs:check -- comment-proof 74171ef` | OK for every changed file but `golden-death-observed.fixture.ts` (the `fires()` signature, as expected) |
| Vitest | 5.0.3, matching the lockfile |

**Test count, file by file** (Vitest JSON, `main`, `9f0e3b0` and `7ca4b09`): `7ca4b09` has the
same count as `9f0e3b0` in every file. Against `main`, the only differences are round 1's: +13
`death-observed.test.ts`, +5 `rotcap-hollow.test.ts`, +2 `golden-death-observed.test.ts`, and
`damage-observation.test.ts` 64 → 68. My first, parallel run had two timeouts
(`balance-sim`'s twice-built report and the docs-check CLI test) on all three trees. They came from
load, and the branch's own `npm run test` run alone is green.

### Invariants, verified mechanically

- **Every golden fixture export on three trees** (a throwaway `import.meta.glob` dump: 134
  fixtures and 1,234 exports on `main`, 135 and 1,242 on the branch). `7ca4b09` deep-equals
  `9f0e3b0` in **every** export, so `enemyDiesExpected`, `playerDiesExpected`, the scenarios and
  the four traits did not move. Against `main`, the three listed expected arrays are equal after
  the name map. Every other difference is a trait registry entry, and the only entries that
  differ are the 7 migrated trait ids (8 triggers).
- `git diff --stat main -- src/engine/__golden__` lists only the three listed fixtures,
  `golden-spore-spread` (comment-proof against `main` OK) and the two new files.
- **Corpus digest:** `git diff 74171ef 7ca4b09 -- src/engine/__corpus__` is empty. 143 rows
  differ from `main`, as in round 1.

### Mutation check (what the fix touched)

The fix diff (`9f0e3b0..7ca4b09`) changes comments and one golden helper's argument. It adds or
changes no mechanism. The one pin the hand-out asked for, the literal after values, fails when a
literal is changed (above).

### Decide-points

None. A third round for three comment-level items follows Duncan's round-1 call (cleanup is
always handed out). Round 3 only needs the gates, comment-proof against `7ca4b09`, and a rerun of
the sweep.

### Mailbox

Holds `brief`, `kickoff`, `plan`, `plan-review`, `plan-handout-r1`, `report-r1`, `record`,
`review-r1`, `handout-r1`, `report-r2`, this review, `handout-r2.md` and
`evidence/corpus-attribution.md`. **To delete:** nothing.

### Docs edited

None this round. Round 1's spec edits stand, and nothing in the fix changes a rule.
