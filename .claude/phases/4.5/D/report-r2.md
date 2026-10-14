# Report r2 — 4.5-D, fix round 1

Built to `handout-r1.md`. Nothing committed, no living doc edited. Branch `4.5-d` on `4adb1ff`.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1982 passed, 1 skipped, 0 failed (228 files, 1983 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 671 citations in 461 files |
| `npm run docs:check -- comments` | PASS, 7422 comments and 1735 titles in 428 files |

Test count against `4adb1ff` (1982 → 1983 tests; passed 1981 → 1982): `conditions.test.ts` 29 → 31
(+2), `damage-channel.test.ts` 67 → 66 (−1), every other file unchanged. Net +1.

## Hand-out items

1. **`compareHpPercent`'s denominator.** Two cases added to `conditions.test.ts`'s
   `hp-percent lowest / highest` block, each with both orders hand-derived in a comment (Health
   modifiers built as a local `stat-modifier` `ActiveEffect`, as `effective-stats.test.ts` does):
   - *effective, not base*: A 30/50 (60%), B 40/100. Effective: 30·100 − 40·50 = 1000 > 0, B lowest,
     40 < 50 true. Base: 30·100 − 40·100 = −1000, A lowest, 60 < 50 false.
   - *floored, not fractional*: A 34/34 (max 34 of 34.5), B 99/100. Floored: 34·100 − 99·34 = 34 > 0,
     A highest, `>= 100` true. Unfloored: 34·100 − 99·34.5 = −15.5, B highest, 99 ≥ 100 false.

   Mutants in a scratch clone of the finished tree (`evidence/mechanism-removal.md`, round 2):
   `baseStats.health` fails the effective-not-base case (and the corpus digest); unfloored
   `getEffectiveStat(_, 'health')` fails the floored case only. Nothing else fails under either.
2. **Vacuous `on-round-end` status case.** The status cases are now their own `describe.each` over
   the hooks without `on-round-end` (14 cases), with a comment giving the reason; trait and perk
   keep all 15. File count 67 → 66. The evidence row for "validator not run on statuses" now says
   14 status cases.
3. **Five citations** point at `spec/effects.md#damagechannel`: `resolution.ts` (`fireHook` skip),
   `effect-types.ts` (`TriggeredDef.damageChannel`), `damage-channel.test.ts` line 1,
   `retaliation.data.test.ts` line 1, the fixture header of `golden-retaliation-direct-only`. The
   hook-vocabulary comment keeps `#hooks`. `citations` and `comments` pass.
4. **`effective-stats.test.ts`** comment now says `effectiveMaxHp` is defined in
   `effective-stats.ts` and re-exported by `effects.ts`.
5. **`golden-retaliation-direct-only` header** now says it is re-derived when one of the four
   retaliators is retuned, and that Poison is held at 20%, so retuning it moves nothing.
6. **`golden-hp-percent-lowest-picks-by-percent`** asserts
   `state.rng.position === initial.rng.position` (`initial` from `runGolden`).

## Unchanged

- Every golden fixture's exports and the corpus digest: the full suite is green with no digest or
  expectation edit; the fixture change is a header comment only.
- Items 3–5 are comment-only: `npm run docs:check -- comment-proof 4adb1ff` PASS (6 changed files)
  over a scratch `git clone` at `4adb1ff` holding only those edits.

## Phase record

`record.md` updated: 1982 passed (net +75 against the branch base), `conditions.test.ts` four cases,
`effective-stats.test.ts` listed as a comment edit.

## Spec questions

None new.

## Content changes

None.

## To delete

Nothing in the repo. The scratch clones (`clone`, `proof`) are in the session scratchpad.
