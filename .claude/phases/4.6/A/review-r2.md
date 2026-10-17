# Review r2 — 4.6-A: Engine hardening

Reviews `report-r2.md`. Branch `4.6-a`, commit `7794a3a` ("fix"), against `main` at `2d6a08f`
(unchanged since round 1) and round 1's build commit `7e9d2e2`. The fix diff is
`b6a425b..7794a3a` (`b6a425b` holds only round 1's review and doc edits).

## Verdict: approved

All four hand-out items are fixed in the code and the tests, the fix changes no behaviour beyond
the freshness message, and every mechanism the fix touches is caught by the test the report names
for it. Nothing to hand out.

## The hand-out items, checked in the code

1. **One home for the random-selector check.** Both exported validators are gone;
   `validateResponseTargetNoRandomSelector` is private and its only caller is `validateEffectList`'s
   loop. The seven assertions call `validateTrait` / `validateStatusDef` with the same effects and
   the same regex or `not.toThrow`; titles unchanged. `NoRandomSelectorInResponseTargets` has no
   match in `src/` or the living docs.
   The report's deviation is right and the hand-out was wrong: I wrote "the seven repointed
   assertions fail", but a `not.toThrow` can't fail when a throwing check is removed. The four
   `toThrow` assertions (three tests) fail; the three `not.toThrow` ones pin that a legal input
   is still accepted.
2. **`nonStacking` comment.** True as rewritten: `claimKeyFor` stamps a key on every
   `stacks: false` trigger of a trait or side effect, `flatEffects` stamps `status:<id>#<i>` on a
   status's, and `nonStacking` is derived from the same `stacks === false`. Comment-only.
3. **Nine fixtures.** Each differs by exactly the one `setup` comment line; `comment-proof 7e9d2e2`
   prints `OK` for all nine.
4. **Freshness error.** `createCombat` collects the failing fields and appends the innate-spell
   reason only when `baselineEffects` or `activeEffects` is among them. `spec/combat.md#fight-setup`
   already gives that reason for the two effect lists only, so the docs need no edit.

## Real fixes

None.

## Scope and labeling

- **A message naming several fields is unpinned** (decide-point 1). Every test sets one field, so
  a mutation that names only the first failing field survives. It still names a real failing field.
- **The `balance-sim` timeout the report saw** isn't this slice's, but the slice moves it a
  little: the test "same seeds give a deep-equal report, built twice" took 2.36 s alone on `main`
  and 2.51 s on the branch (one run each, so +6% is about the noise level; the slice's extra
  setup checks are the likely share), and 3.05 s in my full run, against Vitest's 5 s default.
  The agent's 6.6 s was under parallel load on his machine (decide-point 2).
- **Record:** accurate against the code and the evidence (47 mutation rows, 44 + 3). Its
  "round 2 also touched …" sentence is history, but a record isn't a living doc, so it stays.
- **Mailbox:** clean. Step files and five evidence files, each cited by a step file. Nothing to
  delete. The folder is `phases/4.6/A/` (capital), which the slice id `4.6-a` reaches only on a
  case-insensitive disk; harmless on Windows and in git, worth knowing for a Linux clone.

## Decide-points

1. **Pin the several-fields message, or accept it?** *Recommendation: accept.* What a reader
   depends on is pinned at every site: each of the seven fields throws on its own, for a creature
   and an enemy, with its own name in the message, and the innate-spell reason shows for exactly the
   two effect lists. The multi-field case is only how the list is formatted, and getting it wrong
   still points at a real failing field. The gap is the hand-out's, not the agent's: I asked for
   "the field (or fields)" and prescribed one-field tests only. A third round for one test costs a
   `/slice-fix` and a `/pr-review`; if you want it anyway, it's one test with two fields set
   (`alive: false` plus `baselineEffects`) matching `(baselineEffects, alive: false)` and the
   innate-spell reason.
2. **The `balance-sim` determinism test runs at about half its timeout.** *Recommendation:* give
   that one test an explicit timeout (it runs `buildReport` twice by design, so its time grows with
   the corpus and every per-fight check), as its own small commit after this merge, not on this
   branch. It's outside the slice, so I didn't put it in a hand-out.

## Verified, and how

All in my own clone, `npm ci` on the branch (Vitest 5.0.4, matching the lockfile; Node 22.22.0).
I couldn't see the PR's CI run: the GitHub UI and API are closed to this session.

- **Gates on `7794a3a`:** `test` (2412: 2411 passed, 1 skipped, 261 files), `lint`,
  `format:check`, `build`, `tsc -b`, `docs:check` citations (748 in 530 files), comments (7691
  comments, 2094 titles), budgets (0 over; `spec/effects.md` still at 100%): all green.
- **Test count, file by file** (JSON reports of `7794a3a` and `7e9d2e2`): identical in all 261
  files. Round 1 reconciled `7e9d2e2` against `main` file by file, and `main` hasn't moved.
- **Golden policy, by import:** every export of all 145 `__golden__/*.fixture.ts` deep-compared
  (`undefined`, Maps and Sets encoded) on `7794a3a`, `7e9d2e2` and `main`. Against `7e9d2e2`:
  no export differs. Against `main`: exactly round 1's accepted set (the `traits` export in the six
  goldens holding `CATASTROPHIC_COLLAPSE`, the three `setup` goldens' parties and `setup`,
  `golden-round-end-interaction`'s `expectedEvents`). Corpus fixture untouched against `main`.
- **Comment-only edits:** `comment-proof 7e9d2e2` is `OK` for the nine fixtures; its six `FAIL`s
  are the six files with code changes, each read in full: `combat.ts` (the message), `effect-types.ts`
  (the deletion; the `nonStacking` change is comment-only), and the four test files.
- **Mutations on the fix diff, 12, none survived but the one in decide-point 1** (named test files
  plus `corpus-digest`; tree restored after each, `git status` clean):
  - random-selector call removed from `validateEffectList`: 5 red, the report's five exactly
    (`load-time-checks`, `status-containers`, `resolution` ×2, `spell-effects` ×1);
  - message names no field: 14; innate reason for every field: 5; innate reason for none: 2;
  - each of the seven field checks removed in turn: 2 each (its creature and enemy cases);
  - only the first failing field named: 0 (decide-point 1).
- **Leftover sweep, final commit**, over `src/` and the living docs: the deleted validators' names,
  "resets HP/statuses", "Always undefined for a status" / "no v1 status declares", and round 1's
  list (`triggering-ally`, "resets revivesUsed", "never trusts", "DoT convention", "unclamped"):
  no stale hit. The one "unclamped" left (`effects.ts`) states the corrected claim.

## Docs edited

None. The fix changes nothing the spec states: `spec/combat.md#fight-setup` already gives the
innate-spell reason for the effect lists only, and `spec/effects.md#validators` already names
`validateEffectList` as the one validator.
