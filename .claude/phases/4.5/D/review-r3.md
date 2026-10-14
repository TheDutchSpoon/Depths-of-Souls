# PR review, round 3 — 4.5-D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

Reviewed: branch `4.5-d` at `7cd6c53` ("review 3", the round-2 fix as Duncan committed it), against
`ce7a201` (round 2's commit) and `main` at `6141269`. Inputs: `review-r2.md`, `handout-r2.md`,
`report-r3.md`, and the living docs on the branch.

## Verdict: approved

Both items in `handout-r2.md` are done in the code: the status sweep has its own title and every
full test name in the file is unique; the two `src/` paragraphs are re-wrapped with their words
unchanged. The one miss is in `record.md`: the hand-out asked for its **Files changed** paragraph to
be re-wrapped, the fix only moved the break, and the next line was 144 characters. That is a wrap
of a mailbox file with no words changed, so this review re-wrapped the two lines in place rather
than run a fourth round for it (see **Docs edited**). Nothing else is open: no engine code, golden
export, test assertion or digest row changed since `ce7a201`. Ready to merge once Duncan has looked at
the `record.md` diff.

## Real fixes

None.

## Scope and labeling

- **The arguments.** `/pr-review 4.5-d 3`: the newest report is `report-r3.md`, so this is round 3
  (`workflow/pr-review.md#later-rounds`); the `3` is the round, not a branch. The branch is the one
  the working tree is on (`4.5-d`, equal to `origin/4.5-d`).
- **The report says "nothing committed"; the tree says `7cd6c53`.** Duncan committed the fix as
  "review 3" before this round ran. The commit holds exactly the fix diff plus `report-r3.md`
  (5 files: the three `src/` files, `record.md`, the report), so the review is of that commit.
- **Not reopened:** everything rounds 1 and 2 approved. The fix diff touches no engine code; the
  only code change is one `describe.each` title (proved below).
- **Other long lines in the three `src/` files** (`damage-channel.test.ts:397` at 134,
  `effective-stats.test.ts:126` at 168, four at 101–109) predate the round-1 fix and were in front
  of rounds 1 and 2, which accepted them: the repo has no comment-width rule (`review-r2.md`,
  cleanup 2). Not reopened.

## Decide-points

1. **The `record.md` re-wrap this review made.** `record.md` is the coding agent's file, and the
   rule is that a review never approves with cleanup left in. **Recommendation: keep the edit and
   merge.** It changes no words (checked: the file's word sequence equals `7cd6c53`'s), the design
   rules let a review edit anything in the tree but `src/`, a merged record and the archive, and a
   round for one wrapped line costs more than it protects. If you would rather the coding agent own
   every character of its record, revert the two lines and run `/slice-fix 4.5-d 3` with just that
   item; nothing else would be in the hand-out.

## Each round-2 item, checked in the code

| Item | Checked |
| --- | --- |
| 1. one title per group | `damage-channel.test.ts:509`: the status block is `describe.each(hooks.filter(…))('on %s, as a status', …)`; the trait/perk block keeps `'on %s'`. The nine `describe` titles in the file are distinct. From the JSON reporter: 66 tests, 66 unique full names, 14 of them `damageChannel validator on <hook>, as a status a status rejects the field`, none for `on-round-end`. The comment above the block, the inner `it`, and the trait and perk cases are unchanged. |
| 2. re-wrap, `effective-stats.test.ts` | Lines 133–137 now run 93–100 characters; comment-proof OK (comment-only). Word sequence identical to `ce7a201`'s. |
| 2. re-wrap, golden header | Lines 1–5 re-wrapped at ≤ 100; comment-proof OK. Word sequence identical. Exports unchanged (below). |
| 2. re-wrap, `record.md` | Not done by the fix (line 43 at 144 characters). Done by this review, words unchanged. |

## Verified, and how

- **Gates** (own clone at `7cd6c53`, `npm ci`, Node 22.22.0, Vitest 5.0.3 as the lockfile pins):
  `vitest run` 228 files, 1983 tests, 1982 passed, 1 skipped, 0 failed; `lint`, `format:check`,
  `build`, `tsc -b` clean; `docs:check` citations PASS (671 in 462 files), comments PASS (7423
  comments, 1736 titles in 429 files), budgets 0 of 12 files over. The report's numbers.
- **Test count, file by file** (JSON reporter on `ce7a201` and `7cd6c53`): 228 files each side,
  no file's count differs. Titles differ in one file, `damage-channel.test.ts`: 14 removed, 14
  added, the status cases' renames and nothing else. Every other file's title list is identical.
  Against `main`: still +75 (1908 → 1983), as `record.md` says.
- **Goldens:** imported every `__golden__/*.fixture.ts` on `ce7a201` and `7cd6c53` and
  deep-compared every export (functions by source text, Maps and Sets by entries): 144 fixtures,
  1336 exports, byte-identical serializations. The only fixture file touched is
  `golden-retaliation-direct-only.fixture.ts`, header only.
- **Comment-only edits:** `docs:check -- comment-proof ce7a201` on `7cd6c53`: OK for
  `effective-stats.test.ts` and the golden fixture; the one FAIL is `damage-channel.test.ts` at the
  `describe.each` title, which is item 1's intended code change. No duplicate-title report any more
  (round 2's finding).
- **Corpus digest:** the fixture has no diff from `ce7a201`; the digest test is green.
- **Mutation check:** nothing to run; the fix adds or changes no mechanism (the diff is one test
  title and three comment wraps). Round 2's table stands.
- **Leftover sweep** (rerun on the final commit, `src/` and the living docs): the deleted goldens'
  names in every form (no hits); `effects.ts's effectiveMaxHp` (no hits); `#hooks` (only the
  hook-vocabulary comment in `effect-types.ts`); "or Poison" (none); "whenever it takes damage"
  (`glimmerdark.ts`, continues "from an attack or spell"); "would kill the creature"
  (`specializations.ts`, `specializations/shieldbarer.md#last-stand`, both with the 1-HP
  exception); "never answers a tick" (`spec/statuses.md`, true). `pickExtremum(` is still called from
  `target-selectors.ts`, which is the design (the wrapper stays). Nothing stale.
- **Mailbox:** step files and `evidence/` only (`WORKFLOWS.md#what-a-mailbox-keeps`). The report's
  scratch clone lives outside the repo.

## To delete

Nothing.

## Docs edited

- `phases/4.5/D/record.md`: re-wrapped the last two lines of **Files changed** to ≤ 100 characters,
  words unchanged (hand-out item 2, the part the fix missed). No living doc edited: this round made
  no decision, and the fix moved no rule.
