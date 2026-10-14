# PR review r2 — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

Reviewed: branch `4.5-f` at `009f1c4` ("fix"), against `main` at `e4ea5f6` and round 1's commit
`18f8342` ("review"). Inputs: `review-r1.md`, `handout-r1.md`, `report-r2.md`, and the living docs
on the branch. The fix diff (`18f8342..009f1c4`) is `src/state/store.ts`, `src/state/store.test.ts`,
`scripts/docs-check/citations.ts`, `scripts/docs-check/citations.test.ts` and `report-r2.md`.

## Verdict

**Fixes: cleanup only, round 3.** Item 1 is mostly done, item 2 is done but its edit introduced a
false comment, and item 3's new test doesn't pin the change it was asked to pin. No behaviour is
wrong; three small edits in `handout-r2.md`.

## Real fixes

None. The build is unchanged from round 1 apart from one comment, two assertions and one word in
the docs check.

## Scope and labeling (in the hand-out)

1. **The intro test's comment now says the opposite of what happens.** In `runScriptedIntro` the
   Unicorn is the enemy (`side: 'enemy'`; `spec/run.md#scripted-intro`, "a fixed fight against a
   level-1 Unicorn"). An overwhelming Unicorn therefore *wins* the fight, and `result`, which is
   the player's, is `'loss'`. Round 1's comment, "An overwhelming Unicorn wins the intro fight", was
   right. The fix changed it to "loses", reading the result as the Unicorn's (report-r2, item 2).
   Restore it, and name whose result it is so the next reader doesn't trip on it.
2. **The new `CI_CD` citations case doesn't pin `TOP_LEVEL_DOCS`.** The case added (label
   `Deploy`) is the backticked form, `CI_CD.md` wrapped in backticks. The backticked-path label
   regex catches it whatever `TOP_LEVEL_DOCS` holds, and a bare match inside a backticked one is
   skipped anyway. Mutation: with `CI_CD` removed from `TOP_LEVEL_DOCS`, `citations.test.ts` stays
   69/69 green. The report says that mutation makes the test fail; it doesn't. The same case
   without the backticks (the bare form) does pin it (probed: green as built; with `CI_CD` removed,
   it fails in both describe blocks). Replace the backticked case with it; the backticked
   `CONVENTIONS.md` case already covers the backticked form. Part of this is on round 1's
   hand-out: "beside the existing `CONVENTIONS` one" didn't say which form, and the (c) list's
   `CONVENTIONS` case is the backticked one.
3. **`FightRecord`'s comment still says `createCombat` "gives back `events`".** `createCombat`
   returns a `CombatState`; the events come from `resolveFight` over it, as the comment's own
   citation (`spec/store.md#a-descents-outcome`) says. Round 1 should have caught this in the same
   sentence; the fix rewrote that sentence, so it goes in now. Comment only.

## Decide-points

None.

## What was verified, and how

All in a sandbox clone (`git worktree` of `009f1c4` and of `origin/main`), `npm ci` on both, Node 22,
Vitest 5.0.3 matching the lockfile.

- **Gates on the branch:** `npm run test` (JSON reporter; 229 files, 1992 passed, 1 skipped),
  `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations` (687 citations in 464
  files), `-- comments` (7487 comments, 1747 titles): all green. `-- budgets`: 13 files, none over
  (`spec/store.md` 97%, unchanged). Matches the report.
- **Test count, file by file** against `main` (1984 → 1993): `store.test.ts` 28 → 35,
  `integration.test.ts` 6 → 7, `balance-sim.test.ts` 79 → 78 (all as round 1 verified), and
  `citations.test.ts` 67 → 69: the new `it.each` case once per describe block (`src/`,
  `.claude/`). Every other file's test names are identical. Round 1's branch had 1991, so this
  round adds exactly those two.
- **Hand-out item 1:** the comment names the registries and cites
  `spec/store.md#a-descents-outcome`; the target states that a record replays with the store's
  registries. `docs:check -- comment-proof 18f8342` over `store.ts` alone (the rest of the tree set
  to `18f8342`): PASS, comment-only. The `resolveFight` gap is item 3 above.
- **Hand-out item 2:** both `crossing` and `below` assert `'win'`; the comment saying the two cases
  cover a won and a lost intro is right. The changed Unicorn comment is item 1 above.
- **Hand-out item 3:** `CI_CD` is in `TOP_LEVEL_DOCS`. Mutation results are under item 2 above.
- **Engine and goldens:** `git diff main -- src/engine` is still only `BalanceConfig.introXpGrant`
  and the fixture's value and header bullet. No `__golden__` or corpus fixture is in the branch's
  diff against `main`, and the fix diff touches nothing under `src/engine`, so every golden export
  is byte-identical to round 1's deep-compare (1341 exports, 0 differ).
- **Step 5 for the fix diff:** the only new mechanism is item 3's (above). Items 1 and 2 add a
  comment and assertions, no mechanism.
- **Leftover sweep:** not rerun; this round doesn't approve. The fix adds no name.
- **Mailbox:** the step files, `record.md` and the three cited `evidence/` files. Nothing to
  delete. `record.md`'s test count (1990) is the build's count, as the report says; it describes
  the built mechanism, which this round doesn't change.

## Docs edited

None. The fix changes no behaviour and no rule.
