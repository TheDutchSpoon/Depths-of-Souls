# PR review, round 2 — 4.5-D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

Reviewed: branch `4.5-d` at `ce7a201` ("fix"), against `4adb1ff` (round 1's commit) and `main` at
`6141269`. Inputs: `review-r1.md`, `handout-r1.md`, `report-r2.md`, `evidence/mechanism-removal.md`,
`record.md`, and the living docs on the branch.

## Verdict: fixes (cleanup only)

All six items in `handout-r1.md` are done, in the code and the tests: fix 1's two new cases each fail
with their mutant, and nothing else regresses. The fix itself left three small cleanups, all
cosmetic and all in lines it wrote: a duplicated `describe` title and three over-long lines. No
engine behaviour, golden or digest is involved. Hand-out: `phases/4.5/D/handout-r2.md`.

## Real fixes

None.

## Cleanup (all in the hand-out)

1. **Two sibling `describe.each` blocks share the title `'on %s'`.** Item 2 split the validator sweep
   into `describe.each(hooks)('on %s', …)` (trait, perk) and a second
   `describe.each(hooks.filter(…))('on %s', …)` (status) under the same `damageChannel validator`
   describe. Fourteen hooks now appear as two separate groups with the same name (`damageChannel
   validator > on on-turn-start`, twice), and `docs:check -- comment-proof` reports it as
   `duplicate test name: "damageChannel validator > on %s"`. Every `it` is still uniquely named, so
   nothing is hidden. This is labeling, not a defect: give the status group its own title.
2. **Three lines the fix ran long.** `effective-stats.test.ts:133` is 140 characters in a comment
   paragraph wrapped at 100 (item 4's insertion was not re-wrapped);
   `golden-retaliation-direct-only.fixture.ts`'s header now breaks after "moves nothing): the four",
   leaving a short line inside the paragraph (item 5); `record.md`'s **Files changed** line is
   about 150 characters. The repo has no comment-width rule (285 of 8035 comment lines on `main` run
   past 100), so this is not a convention breach. The fix broke the wrapping of paragraphs that were
   wrapped, and a round is happening anyway for cleanup 1.

## Scope and labeling

- **The arguments.** `/pr-review 4.5-d 1`: the newest report in the mailbox is `report-r2.md`, so this
  is round 2 (`workflow/pr-review.md#later-rounds`). The `1` is not a branch; the branch is the one
  the working tree is on (`4.5-d`, `ce7a201`, equal to `origin/4.5-d`).
- **Not reopened:** everything `review-r1.md` approved. The fix diff touches no engine code
  (`resolution.ts` and `effect-types.ts` changed only in comments, as proved below).

## Decide-points

1. **Run a round for cosmetics only, or waive it?** The workflow says a review never approves with
   cleanup left in (`workflow/pr-review.md#output-in-the-mailbox`), and both items are cleanup the
   slice can make. **Recommendation: run it.** The hand-out is two small items, needs no design
   input, and round 3 should be a quick check (steps 1, 2 and 4, plus the title check). The cost of
   waiving is small too, so if you'd rather merge now, nothing in the game changes. The rule is
   what decides it here, not the stakes.

## Each round-1 item, checked in the code

| Item | Checked |
| --- | --- |
| 1. pin `compareHpPercent`'s denominator | Two cases in `conditions.test.ts`'s `hp-percent lowest / highest` block. Arithmetic recomputed: effective 30·100 − 40·50 = 1000 (B lowest, 40 < 50 true), base 30·100 − 40·100 = −1000 (A lowest, 60 < 50 false); floored 34·100 − 99·34 = 34 (A highest, 3400 ≥ 3400 true), unfloored 34·100 − 99·34.5 = −15.5 (B highest, 99 ≥ 100 false). `30 × 1.15` is exactly 34.5 in JS, so the floor is 34 as the comment says. The Health modifier goes through `activeEffects`, which `getEffectiveStat` folds multiplicatively. |
| 2. vacuous status case | The status cases are their own `describe.each` over the 14 hooks other than `on-round-end`, with no early return; trait and perk keep 15. 66 tests in the file. See cleanup 1 for the title. |
| 3. five citations | All five now read `spec/effects.md#damagechannel`, whose heading states the rule each comment cites; the hook-vocabulary comment keeps `#hooks`. |
| 4. `effectiveMaxHp`'s home | Correct (`effective-stats.ts`, re-exported by `effects.ts`). See cleanup 2 for the wrap. |
| 5. golden header | Correct: only a retaliator retune moves it; Poison is held by `holdPotency(STATUS_REGISTRY, { poison: 20 })`. See cleanup 2. |
| 6. no-RNG assertion | `expect(state.rng.position).toBe(initial.rng.position)`. It is not vacuous: `runGolden`'s `initial` is deep-frozen before the first step, and `resolveTurn` clones `rng` at entry. A throwaway run through the same runner of `golden-pass-order-web-rolls` (which draws) shows the positions differ, and `initial.rng` is frozen. |

## Verified, and how

- **Gates** (own clone, `npm ci`, Node 22.22.0, Vitest 5.0.3 as the lockfile pins): `npm run test`
  1982 passed, 1 skipped, 0 failed, 228 files, 1983 tests (the report's numbers); lint,
  `format:check`, `build`, `tsc -b` clean; `docs:check` citations PASS (671 in 461 files), comments
  PASS (7422 comments, 1735 titles in 428 files), budgets 0 over (`spec/effects.md` 37.3 of 39 KB,
  96%, unchanged).
- **Test count, file by file** (JSON reporter on `4adb1ff` and `ce7a201`): only
  `conditions.test.ts` 29 → 31 and `damage-channel.test.ts` 67 → 66 differ. By title: the two added
  cases are the two denominator cases, and the one removed is
  `damageChannel validator on on-round-end a status rejects the field`. Every other title is
  unchanged. Against `main` (1908): +75, as `record.md` says.
- **Goldens:** imported every `__golden__/*.fixture.ts` on `4adb1ff` and `ce7a201` and deep-compared
  every export (functions by source text, Maps and Sets by entries): 144 fixtures each side, all
  equal. The only fixture file changed is `golden-retaliation-direct-only.fixture.ts`, header only.
- **Comment-only edits:** `docs:check -- comment-proof 4adb1ff` on `ce7a201`: OK for
  `resolution.ts`, `effect-types.ts`, `retaliation.data.test.ts`, `effective-stats.test.ts` and the
  golden fixture. It fails, as expected, on the three files with code changes from items 1, 2 and 6
  (`conditions.test.ts`, `damage-channel.test.ts`, the HP% golden test), and it flags the duplicate
  title (cleanup 1).
- **Corpus digest:** the fixture is unchanged from `4adb1ff` (no diff), and the digest test is green.
- **Mutation check** (each alone in a scratch copy; the named tests plus the corpus digest):

  | Mutant | Fails |
  | --- | --- |
  | `compareHpPercent` on `baseStats.health` | `conditions.test.ts` "orders by effective max HP, not base Health"; digest |
  | `compareHpPercent` on unfloored `getEffectiveStat(_, 'health')` | `conditions.test.ts` "orders by floored effective max HP, not fractional Health" only |
  | `validateDamageChannels` not run in `validateStatusDef` | all 14 status cases, and nothing passes vacuously |

  Matches `evidence/mechanism-removal.md`'s round-2 table and the corrected status row.
- **Leftover sweep** (approving-round discipline, run now as well) over `src/` and the living docs:
  the deleted goldens' names (no hits); `effects.ts's effectiveMaxHp` (no hits); `#hooks` (only the
  hook-vocabulary comment); "or Poison" retune claims (none); the corrected claims "whenever it
  takes damage" (`glimmerdark.ts`, now "from an attack or spell"), "never answers a tick"
  (`spec/statuses.md`, still true) and "would kill the creature" (`specializations.ts` and
  `specializations/shieldbarer.md#last-stand`, both carry the 1-HP exception). Nothing stale.
- **Mailbox:** step files and `evidence/` only (`WORKFLOWS.md#what-a-mailbox-keeps`).

## To delete

Nothing.

## Docs edited

None. This round made no decision, and the fix moved no rule.
