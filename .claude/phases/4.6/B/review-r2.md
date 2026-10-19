# PR review, round 2: 4.6-B (game layer and the comment sweep)

PR #121, `4.6-b` → `main`. I reviewed `9ace7ec` (`fix r1`) against `main` `7cf8db7` and against
round 1's commit `f947623`. The fix diff is `git diff f947623 9ace7ec`. Between those two commits,
`a15eb5c` holds round 1's review and doc sync, and touches docs only.

## Verdict: approved

- **Every `handout-r1.md` item is done.** I checked each one in the code and the tests.
- **The new pin catches the gate's removal**, and two other mutations of the gate besides.
- **The fix commit is mechanically a no-op outside its one new test.** Goldens, the corpus digest
  and every other test are unchanged.
- No hand-out, and no cleanup is left.
- One decide-point, about a test that is not this slice's (decide-point 1).

## Real fixes

None.

## The hand-out, item by item

1. **The probe gate is pinned.**
   - The new test is `balance-sim.test.ts`, "a non-boss floor run makes one descent even when the
     party holds Pacify; a boss floor makes two".
   - It wraps the store's `descend` through `setState`. `runProbe` and `playFloorRun` both call
     `store.getState().descend`, and the snapshot that `runProbe` restores holds the wrapper. So
     the counter sees the probe and the policy run alike.
   - It asserts `pickProbeCreature` is non-null, so the party really holds Pacify.
   - It previews floor 4 as `boss: false` and floor 10 as `boss: true` before descending.
   - The boss half is the contrast: `[10, 10]`, and a non-null `bossVisit.probe`.
   - Mutations below.
2. **History wording.**
   - All four sites are reworded and say what the code does now. The titles are true of their
     bodies:
     - the seed text interpolates `MAX_RUN_SEED` (`refusals.ts:76`);
     - the ten-biome test compares against `expectedDraw` over the whole list.
   - "Checkpoint-verified" stays.
3. **The deleted frontier's names.**
   - All seven sites are reworded. The rename is a plain `mv`: git shows `R094`, and the only diff
     is the header comment.
   - The four tests in `store-deep-floors.test.ts` are unchanged.
   - The header comments now cite `spec/run.md#biomeforfloor`, and that rule states the walk-back
     and the authored-only draw the comments describe.
   - The one remaining hit is `store.test.ts:665`'s "has-content floor", and it is right to stay.
     It names the pin rule's content check (`#authored-biomes-and-pins`), not the frontier.
4. **The record.** Each of the three corrections matches the code:
   - `hashIntroUnicornDraw(runSeed)` feeds the enemy roll (`store.ts:1093`), and
     `rollPlayerGems` uses `hashGemDraw` (`:460`);
   - `perkPointsPerBoss` is a `BalanceConfig` field (`balance-types.ts:75`), and
     `STAT_GROWTH_PER_LEVEL` is a constant (`engine/config.ts:30`);
   - the Hub's button discards `recordBoss`'s result (`Hub.tsx:35`).

   The `comments.test.ts` count, 82 → 104, matches my per-file run. The totals, 2551 + 1 skipped
   and +140 against `main`, match too.

## Scope and labeling

- **"The comment sweep is the last commit, proven comment-only" (`B/brief.md`) still holds in
  spirit.** It needs one label, which this review adds to the record (Docs edited).
  - **The sweep `5aaba10`** is untouched by the fix, and round 1 proved it against `f51a849`.
  - **The fix `9ace7ec`** touches `src/` after it. It is proven too:
    - `comment-proof a15eb5c` passes with a four-title mask and the one-file rename map once the
      new test is cut out (9 files OK);
    - with the test left in, the only failure is that test's insertion point.

    So the fix's `src` changes are exactly the hand-out's items.
  - The sweep's point was that no code change rides along with the comment fixes. That still
    holds: the one code change after the sweep is a test.
  - The brief's "Done when" ("the comment sweep passes `comment-proof` against the commit before
    it") is true as written.
- **Line width, not a fix.** The reflowed header of `store-reach.test.ts:2` is 107 characters.
  - No rule sets a comment width. Prettier doesn't wrap comments, and `format:check` passes.
  - 342 comment lines in `src/` are already over 100 characters.
- **Stale `#content-frontier` citations in phase files** (the orchestrator's note).
  - I ran `citations` on every Markdown file under `phases/4.6/`.
  - The phase brief's B entry (`brief.md:223`) cited run.md's old `content-frontier` and
    `content-frontier-and-pins` anchors, which round 1 renamed. **Fixed** (Docs edited). The brief
    passes now, with 62 citations.
  - The same old anchor is in three of this slice's step files:
    - `B/kickoff.md:255`;
    - `B/plan.md:398`;
    - `B/report-r1.md:154`.

    It is also in `phases/4.6/review.md:276`.
  - I left those four alone (decide-point 2).
  - The other failures (`A/plan.md` ×10, `review.md` ×28) are bare-file citations (`combat.md#…`)
    that never resolved. They come from no rename, and the full run skips `phases/`.

## Decide-points

1. **The `balance-sim` "built twice" determinism test runs near Vitest's 5 s default, and it flaked
   here.**
   - My full JSON run on `f947623` timed it out at 6.26 s: one failure in 2551 tests, with only the
     suite's own workers on two CPUs.
   - The same file on its own on `f947623` is 79 passed, 1 skipped.
   - Its run times:

     | Run | `9ace7ec` | `main` |
     | --- | --- | --- |
     | full run | 3.52 s | 2.77 s |
     | alone, 3 runs | 2.9–3.4 s | 3.0–3.1 s |
     | alone, two CPU burners beside it | 4.85 s | not run |

   - It is **not this slice's**:
     - the slice doesn't touch the test, and `main` has the same timings;
     - CI passed it on `9ace7ec`;
     - it has timed out before, on `main` and on other branches: 4.5-E r3, 4.5-G2, and 4.6-A's
       report.
   - 4.6-A's review recommended an explicit timeout "as its own small commit after this merge". It
     never landed: the test on `main` still has none.
   - *Recommendation:* right after merging B, commit a one-line change on `main`, the way
     `corpus-digest.test.ts` already does: `}, 60_000)` on that `it`, with a comment saying why.
     Suggested comment: "builds the smoke report twice by design, ~3 s alone; headroom over
     Vitest's 5 s default, not a tuned budget".
   - The alternative is adding it on this branch. That is outside `#bs-listed-test-changes`, so it
     would need a brief change and a third round for one line.
   - If you'd rather not commit it yourself, name a home for it, so it isn't parked a second time.
     The next slice to branch is 4.6-C. Its brief would have to list the change.
2. **The old anchor in this slice's step files** (`kickoff`, `plan`, `report-r1`) and in the phase
   review.
   - *Recommendation:* leave them. Each step file records what it cited in its own round, when the
     anchor existed. The design rules check a step file's citations when it goes out, not
     afterwards.
   - Nothing reads them as live rules, and the full `citations` run skips `phases/`.
   - The phase brief is different. Later slices cite it as their plan, so it is fixed.

## What was verified, and how

My own `npm ci` in sandbox worktrees of `9ace7ec`, `f947623` and `main`, with Vitest 5.0.4 (the
lockfile's) and Node 22.22.0.

**Gates on `9ace7ec`:**

| Gate | Result |
| --- | --- |
| `npm run test` (JSON reporter) | 2551 passed, 1 skipped, 269 files |
| `lint`, `format:check`, `build`, `npx tsc -b` | clean |
| `docs:check -- citations` | PASS, 805 in 539 files |
| `docs:check -- comments` | PASS, 7826 comments and 2182 titles |
| `docs:check -- budgets` | 0 over |

- **CI agrees.** The "CI & Deploy" run 39221352321 on `9ace7ec` passed `test`, `build` and `e2e`.
  Deploy was skipped, as on a PR.
- **Test counts, file by file** (JSON reports on all three trees):
  - against `f947623`, with the rename mapped: one file differs, `balance-sim.test.ts` 80 → 81;
  - against `main`: 2412 → 2552 tests and 261 → 269 files, with the same 18 per-file deltas
    round 1 reconciled, plus that one test.
- **Goldens.** I imported every `__golden__/*.fixture.ts` and the corpus digest fixture on all
  three trees, 146 files and 1344 exports, and deep-compared each export (with `undefined`, Maps
  and Sets encoded):
  - against `f947623`: no export differs;
  - against `main`: round 1's 44 exactly, every leaf a `description` field, none an `expected*`
    value.

  `git diff --name-only f947623 9ace7ec` shows nothing under `__golden__` or `__corpus__`.
- **Comment-proof on the fix:**
  - against `a15eb5c`, with a mask of the four retitled tests and the rename map
    `store-frontier → store-deep-floors` (0 imports): 8 OK and 1 FAIL, the new test;
  - with the new test cut out of a scratch copy: PASS, 9 files;
  - against `5aaba10` (the sweep): the same result, because `a15eb5c` touches no code (an empty
    `--stat` over `src`, `scripts` and `e2e`).
- **Mutations on what the fix touched.** I ran `balance-sim.test.ts` and `corpus-digest.test.ts`
  for each and restored the tree after each; `git status` was clean.

  | Mutation | Result |
  | --- | --- |
  | `preview.boss &&` removed | fails the new test: `[4, 4]` vs `[4]` |
  | the probe never runs (`false && …`) | fails the new test (`[10]` vs `[10, 10]`) and "the ids the analysis keys on …" |
  | the gate inverted (`!preview.boss`) | fails both tests |

  Nothing else in the fix is a mechanism.
- **Leftover sweep on the final commit.** Over `src/`, `e2e/`, `scripts/` and `.claude/` (except
  `phases/` and `archive/`), I searched for:
  - the deleted names: `contentFrontier`, `beyond-content-frontier`, `frontier`, `deepestPlusOne`,
    `templateIdOf`, `unicornCombatId`, `store-frontier`, `(3r)`, `'rot-sovereign'`,
    `cast-role loadout`;
  - the hand-out's phrases: `content bound`, `content floor`, `used to`, `has always`, `main's`,
    `what main`, `stays as it was`;
  - "× 100", "1000" and "0.25";
  - the record's corrected claims: `hashIntroUnicornDraw`, `STAT_GROWTH_PER_LEVEL`, `recordBoss`.

  Results:
  - no stale hit;
  - `'rot-sovereign'` remains only as data ids and in a golden;
  - `main's` remains only in `workflow/pr-review.md`;
  - the numbers remain only where the spec states them with their config names;
  - the living docs state the corrected claims (`spec/run.md:201`, `spec/creatures.md:70`,
    `CONVENTIONS.md:73`).
- **The mailbox** holds only step files and `evidence/` Markdown. Nothing to delete.

## Docs edited

- `phases/4.6/brief.md#the-cave-has-no-content-frontier`: the PR-review line cites
  `spec/run.md#floors-past-the-authored-biomes` and `#authored-biomes-and-pins`, the anchors round 1
  renamed, so `citations` passes on the brief.
- `phases/4.6/B/record.md`, the status paragraph: it now says the round-1 fix commit follows the
  sweep, its only code change is one test, and `comment-proof` proves the rest.
- Budgets: neither file is budgeted, and `docs:check -- budgets` still reports 0 over.
