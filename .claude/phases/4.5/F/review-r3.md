# PR review r3 — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

Reviewed: branch `4.5-f` at `1f35f41` ("fix 2"), against `main` at `e4ea5f6` and round 2's commit
`009f1c4` ("fix"). Inputs: `review-r2.md`, `handout-r2.md`, `report-r3.md`, and the living docs on
the branch. The fix diff (`009f1c4..1f35f41`, mailbox files aside) is one comment in
`src/state/store.ts`, one comment in `src/state/store.test.ts` and one test string in
`scripts/docs-check/citations.test.ts`.

## Verdict

**Approved**, with one comment edit this review made in `src/state/rewards.ts` (decision 1).
All three items of `handout-r2.md` are fixed and verified in the code; the approving sweep found
one stale comment, fixed here rather than in a fourth round.

## Real fixes

None.

## Scope and labeling

None left. The one sweep finding is fixed in this review (decision 1).

## Decide-points

None open.

## Decisions

1. **The stale `applyXpGain` comment is fixed in this review (Duncan's call, this once).**
   `applyXpGain`'s doc comment (`src/state/rewards.ts`) said the gain is "banked once per
   descend() call". Since this slice it is called once per fight (`descend`'s loop, through
   `applyXpToParty`) and once by the intro's grant. Round 1's sweep searched "once per descent"
   and missed this wording. A design review never edits `src/` (`workflow/design-rules.md#role`);
   Duncan allowed it here instead of a fourth round for one comment. The comment now reads "a flat
   XP gain (one fight's kill XP, or the scripted intro's grant)"; the rest of it is unchanged.
   `docs:check -- comment-proof 1f35f41` in the sandbox over that edit alone: PASS (1 file,
   comment-only); `prettier --check`, `eslint`, `docs:check -- comments` and `-- citations` pass
   on it. Duncan commits it with this review.

## What was verified, and how

All in a sandbox clone (`git worktree` of `1f35f41` and of `origin/main`), `npm ci` on both, Node
22, Vitest 5.0.3 matching the lockfile.

- **Gates on the branch:** `npm run test` (JSON reporter: 229 files, 1992 passed, 1 skipped),
  `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations` (687 citations in 464
  files), `-- comments` (7487 comments, 1747 titles): all green. `-- budgets`: 13 files, none
  over (`spec/store.md` 97%, `spec/effects.md` 96%, both unchanged by this slice's fix rounds).
  Matches the report.
- **Test count, file by file** against `main` (1984 → 1993 incl. the skip): `store.test.ts`
  28 → 35, `integration.test.ts` 6 → 7, `balance-sim.test.ts` 79 → 78 ("splits fights at
  FightStarted" gone), `citations.test.ts` 67 → 69 (one new case in both describe blocks: the
  bare-form `CI_CD` case, label `Deploy`). Every other file's test names identical. Same count
  as round 2; only the `CI_CD` case's name changed.
- **Hand-out item 1 (intro comment):** reads "An overwhelming enemy Unicorn wins the intro fight
  (a loss for the player)". True: `runScriptedIntro` materializes the Unicorn with
  `side: 'enemy'`, and the case asserts the player's `'loss'`. Assertions untouched.
- **Hand-out item 2 (`CI_CD` case):** the case is now the bare form (no backticks around
  `CI_CD.md`, label `Deploy`), replacing the backticked one. Mutation: with `CI_CD` removed from
  `TOP_LEVEL_DOCS` (`citations.ts`), exactly 2 tests fail: that case under
  `citations in src/ > (c) label forms` and the same under `citations in .claude/` (2 failed, 67
  passed); restored, 69 pass. Matches the report.
- **Hand-out item 3 (`FightRecord` comment):** names `resolveFight` after `createCombat`; the
  cited `spec/store.md#a-descents-outcome` states the same replay ("`createCombat` over its seed,
  parties and perk effects, with the registries the store was given, then `resolveFight`").
- **Comment-only:** `docs:check -- comment-proof 009f1c4` with `citations.test.ts` set back to
  `009f1c4`: PASS, `store.ts` and `store.test.ts` differ only in comments. The third file's only
  change is the one test string above.
- **Engine and goldens:** `git diff main -- src/engine` is still only
  `BalanceConfig.introXpGrant` and the fixture's value and header bullet; no `__golden__` or
  corpus fixture in the branch's diff. Every export of all `__golden__/*.fixture.ts` imported on
  both trees (`import.meta.glob` dump, Maps and Sets serialised) and deep-compared: 1341 exports
  on each side, 0 differ, none missing. The corpus digest test passes.
- **Step 5 for the fix diff:** the only mechanism touched is item 2's pin (above). Items 1 and 3
  are comments.
- **Code re-read:** `descend`'s per-fight materialize → fight → `fightXp` → `applyXpToParty` →
  record → win/break order and `runScriptedIntro`'s grant after `grantCreatureIfUnowned` are as
  round 1 verified; the fix diff doesn't touch them.
- **Leftover sweep** (approving round) on `1f35f41`, over `src/` and the living docs (all of
  `.claude/` but `phases/` and `archive/`): `fightEnemyIds`, `splitFights`, "once per descent",
  "per descend", "post-fight", "kill XP", "between fights", "mid-floor", "gives back",
  `introXpGrant`, `TOP_LEVEL_DOCS`. One stale claim: `applyXpGain`'s comment (decision 1). Every
  other hit states current behaviour (`playerCreatures` is now the per-fight local in `descend`
  and `runScriptedIntro`; "POST-fight" in `rewards.ts` still holds).
- **Mailbox:** step files, `record.md` and the three cited `evidence/` files. Nothing to delete.
  `record.md`'s 1990 is the build's count, as round 2 accepted.

## Docs edited

- `src/state/rewards.ts`: `applyXpGain`'s doc comment, comment-only (decision 1; an exception to
  the no-`src/` rule, Duncan's call).
- No living doc edited: the fix changes no behaviour and no rule.
