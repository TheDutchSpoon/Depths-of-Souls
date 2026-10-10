# PR review r1 — Phase 4.1 — Slice H2c: the first tuning pass

Reviewed `report-r1.md` against the amended `kickoff.md`, `plan-review.md` rounds 1 and 2,
`brief.md`, ASSUMPTIONS 118, 119, 123–127, 147 and 149, and CONVENTIONS, on
`phase-4.1-slice-h2c` at `0051f14` ("build") against `main` at `c9da798`. Everything below was run
in my own sandbox: a fresh clone, Linux, `npm ci` on both trees.

## Verdict: approved

No code fix. The slice does exactly what the amended kickoff asked and chose no balance number.
Every claim in the report that I could check mechanically held, to the digit: the test count, the
golden import comparison, the digest's stage attribution, the integration re-pins and their first
stages, the mutation table, and the DoT minimum-of-1 counts. What's left is labeling, two marker
files to delete, and stale comments that belong to H2d.

## Real fixes

None.

## Scope and labeling

1. **The Health remap is pinned only by its range, and the report's mutation row hides that.** The
   row "one creature's Health left at 14 → the `overgrowth.test.ts` range test" picks the one kind
   of miss the range test can see (an old value below 20). **25 of the 58 remapped creatures had an
   old Health of 20–30**, already inside 20–45: leave any of them un-remapped and only the corpus
   digest fails. I measured two: the Sorcerer starter at 20 and the Rot Sovereign at 30, each
   failing the digest and nothing else. Not a code fix: the kickoff asked for the range test and the
   script's table, and the remap itself is correct (checked independently below). But CONVENTIONS
   said base stats are left out of content goldens because "the data tests cover" them, which was
   not true. I corrected that line (decide-point 2).
2. **"`integration.test.ts` moves in three tests"** (report and the phase record): it is three
   assertions in **two** tests ("Slice I … descends floor 1": `perTurn` and the revive count; and
   the G2 Pacified Unicorn). Harmless; the record can stay as written or take a one-word fix before
   merge.
3. **To delete (Duncan):** `.claude/phases/4.1/H2c/.sim-before.done` and `.sim-after.done`. They are
   committed in "build", so delete them on the branch before merging.
4. **Stale code comments** (the report's spec questions 2 and 4): `data/statuses.ts`'s header ("H2c
   tunes them") and its `potency` "placeholder" comments, and the scripted-intro comment in
   `state/integration.test.ts` (stale since H2a). Comment-only, and H2d rewrites `statuses.ts`'s
   numbers anyway, so I put them in H2d's brief section instead of a fix round (decide-point 1).
5. **Round 2's predicted set missed `perTurn`.** Both moving assertions sit in one test, and the
   revive assertion comes first, so my scratch run saw only the first failure. That was my miss, not
   the coding agent's; the report caught it.
6. The `run.floor <= MATCHUP_MAX_FLOOR` gate in `runSeed` is redundant with the same filter in
   `buildMatchupRows`: removing it changes no test and no output. It only bounds memory, which is
   fine. Noted, nothing to do.

## Spec questions (from the report)

1. **The rule's wording.** "Or creature" was already folded at the plan review. I added the other
   half: only a number the golden reads is pinned, and a borrowed number no event reads gets a
   header note, not a pin (CONVENTIONS "Tuning never changes a mechanism golden").
2. **Stale text pointing at H2c.** The living and content docs already say H2d for the DoT and Regen
   numbers (repointed at the plan review; checked by search). ASSUMPTION 107's "H2's CI test" now
   says 4.1-H2d's. The code comments go to H2d (labeling 4).
3. Noted. It is why stage 2 moves the integration tests.
4. To H2d (labeling 4).
5. See labeling 5.

## Decide-points

1. **Approve now, and carry the stale code comments into H2d instead of a fix round?**
   - **Recommendation: yes.** The open items are two comments and a record wording, none of which
     changes behaviour. H2d edits `data/statuses.ts` anyway, so its kickoff picks them up; I've put
     them in H2d's section of the 4.1 brief ("Inputs from the H2c PR review"). Delete the two
     `.done` markers before merging.
   - **The alternative:** a hand-out for the comment fixes and the record's "three tests". It's
     cleaner on paper, but it costs a round for no behaviour.
2. **Should exact base stats get a test, now that we know only the digest pins them?**
   - **Recommendation: no test; correct the convention (done).** An exact-value test would restate
     the data file, and any legitimate per-creature tuning would rewrite it in the same PR: a rubber
     stamp, not a check. The right protection is the one this slice used: a script-generated old →
     new list in the report, checked against the data at the PR review (I did, all 61 creatures).
     I wrote that into CONVENTIONS as the rule for any PR that changes base stats.
   - **The alternative:** freeze each species file's Health values in its test. It would catch an
     accidental edit, but it adds one more file to change with every tuning, and the digest already
     trips on any base-stat change.

## Decisions

Duncan, 2026-10-10:

1. **Approved, with a comment-only fix round that is not re-reviewed.** `handout-r1.md` carries the
   two stale code comments (labeling 4) and the record's "three tests" (labeling 2); the coding
   agent proves in `report-r2.md` that nothing that runs changed, and Duncan merges on that. The
   stale comments leave H2d's brief section again (only the matchup-table note stays there).
2. Decide-point 2 (base stats): open.
3. **The mailbox's generated files** move to `evidence/` (the sim reports, the DoT scans, the Health
   table); `health-remap.mjs` (a one-off script that rewrites `src/` and can't safely run twice) and
   `sim-dot-today.txt` (the same report as `sim-after.txt` with the Pacify probe off) are deleted.
   Done by Duncan. The standing rule is in WORKFLOWS "What a mailbox keeps", in its own commit.

## What was verified, and how

- **Gates:** `npm ci` (Vitest 5.0.3, matching the lockfile), then `npm run test` 195 files, 1333
  tests (1332 passed, 1 skipped); `lint`, `format:check`, `build` and `npx tsc -b` clean. CI status
  not checked: the GitHub API isn't reachable from my sandbox.
- **Test count, file by file** (`vitest --reporter=json` on both trees): 1297 → 1333, and exactly
  four files differ: `curves.test.ts` 20 → 37, `starters.test.ts` 14 → 16, `golden-h2c-snapback` 0 → 1,
  `balance-sim-report.test.ts` 0 → 16. As reported.
- **Mechanism goldens:** a scratch test imported all 131 `golden-*.fixture.ts` on `main` and the 132
  on the branch and deep-compared every `expected*` export plus `TURN_STEPS`, `EXPECTED_DRAWS` and
  `SEED`: 128 equal, 3 differ (`golden-sorcerer-starter`, `-resonant-overtone`, `-resonant-harmonize`,
  the Arcane Bolt content goldens), 1 new (`golden-h2c-snapback`).
- **Comment-only edits:** the six golden headers (`g1-leech-sovereign-pacified`, `rot-sovereign`,
  `spore-spread`, `sporch-cinderlord-burn-refresh`, `hollowkin-wretch-self-dot`,
  `h2b2-tick-no-retaliation`) and `scripts.test.ts`, `store.test.ts`, `status-timing.test.ts` print
  identical to `main`'s with comments removed (TypeScript AST printer). Each header's stated
  numbers checked against the data: Rot Sovereign Attack 22 / Intelligence 20 / Defence 26, real
  Speed 16, Health 45; Sporecloud Seeder 16 / 20 / 10, real Speed 18; Hollowkin Wretch 14 / 12 / 20,
  real Speed 14 and Health 33; Sporch Cinderlord Health 30; Leech Sovereign Health 45.
- **Hand derivations recomputed:** Snapback `40 × 0.3 = 12`, `− 0.2 × 10 = 10`, P 100 → 90 (22 at
  0.6); P's hit `20 + 0.2 = 20.2 → 20` at level 11 (no Additional). Arcane Bolt: Sorcerer starter
  `20 × 1.0 + 0.2 = 20.2 → 20` (FOE 20 → 0), Overtone two hits of 20 (100 → 80 → 60), Harmonize
  `24.24 → 24` (100 → 76). The Sorcerer starter golden's FOE Health 10 → 20 is a setup change that
  keeps the kill exact, stated in its header: fine for a content golden.
- **The curve:** every row of `curves.test.ts` recomputed from the config (×1.25 → ×2.00, +0.01
  after 100): floors 1–9 at 1, 2, 3, 5, 6, 7, 9, 10, 11; floor 10 at 13–14, 20 at 27–29, 30 at 44–47,
  100 at 200–210, 101 at 203–213, 108 at 224–234; bosses 19 / 34 / 52. The placeholder config stays
  exact (its new 1–250 test).
- **The Health remap:** every creature on `main` against the branch (61): 58 equal
  `floor(20 + (old − 10) × 1.25 + 0.5)`, the three Flickerlings unchanged, and no other stat, role
  or trait changed except the Stonehorn Warden's Attack 10 → 15 and `taunter` → `warden`. Every
  Health in 20–45.
- **The digest, stage by stage:** I rebuilt the four stages as cumulative patches on `main` in a
  scratch worktree (stage 2 with the Warden's Attack and role held back) and ran
  `npm run corpus:update` at each. Stage 4 is byte-identical to the branch's digest. First changed:
  498 (300 / 198 / 0), 29 (0 / 2 / 27), 0, 0; differing from the previous stage: 498, 489, 132, 288.
  Exactly the report's table. 56 of 527 results flip against `main`.
- **The integration re-pins, by stage:** `main`'s `integration.test.ts` against each stage: stage 1
  green; stage 2 fails `perTurn` and the G2 slot; stage 3 the same; stage 3 plus Arcane Bolt the
  same (the revive count stays 0); stage 4 fails the revive count. So `perTurn` and the G2 draw
  first move at the Health remap and the revive at Snapback, as reported. I printed the revive's
  fight: the Brute at 12 HP takes two 6-damage Snapbacks across its double strike (6, then 0), and
  the Unicorn's next attack revives it at 7, as the new comment says.
- **Mutations** (full suite each, restored after):

  | Mutation | Fails |
  |---|---|
  | `Math.round` in the ≤ 100 branch | `curves.test.ts` (floors 2, 3, 6, 9, 20, the 1–9 list, boss 20), digest |
  | `Math.round` in the > 100 branch | `curves.test.ts` floor 108 only |
  | width base 2 | `curves.test.ts` (every default row), digest |
  | boss offset 3 | `curves.test.ts` boss rows, digest |
  | Warden Attack 10 | `starters.test.ts` exact stats, digest |
  | Warden role `taunter` | `starters.test.ts`, `roles.test.ts`, digest |
  | Snapback 0.6 | `golden-h2c-snapback`, the Slice I integration test, digest |
  | Arcane Bolt 0.5 | the three Arcane Bolt goldens, digest |
  | floor-5 window 10 | `balance-sim-report.test.ts` (4 tests) |
  | Sorcerer starter Health back to 20 | **digest only** (labeling 1) |
  | Rot Sovereign Health back to 30 | **digest only** (labeling 1) |
  | the seed fold keeping the smaller trait stack | `balance-sim-report.test.ts` (seed fold test) |
  | the spec fold keeping the smaller | `balance-sim-report.test.ts` (spec report test) |
  | the per-fight trait maxima keeping the smaller | `balance-sim-report.test.ts` (bucket test) |
  | `templateIdOf` returning the combat id | `balance-sim-report.test.ts` (2 tests) |
  | `runSeed`'s matchup floor gate removed | nothing (labeling 6: redundant) |

- **The DoT measurements:** a corpus scan on the branch: 6,615 of 7,251 ticks on the minimum in
  Parts A+B (Spore 3,537 / 3,887, Burn 2,876 / 3,112, Poison 202 / 252), Part C 304 of 304; on
  `main` 4,667 of 5,014. With 50 / 40 / 45 patched in: 2,213 of 5,324 (Spore 759 / 2,936, Burn
  1,387 / 2,108, Poison 67 / 280). Both match the report exactly.
- **Live behaviour:** the same scan finds no negative HP and no creature revived more than 10 times.
  A dead creature's empty `TurnStarted`/`TurnEnded` bracket shows up in many fights, on `main` too:
  that is the documented "dead actor's empty bracket" (CONVENTIONS), not a finding.
- **The "after" report reproduced:** `npm run sim` on the branch (40 seeds, cap 400; 2,111 s
  on my sandbox) prints a report identical to the committed `evidence/sim-after.txt` line for line, apart
  from the runtime line. Linux against Duncan's Windows run, so the simulator is deterministic across
  platforms too.

## Docs edited

- `.claude/content/overgrowth.md`: the Jaws row at 30% of Attack and the Arcane Bolt row at 100% of
  Intelligence; a "Base stats" line in "Reading this biome" (Health 20–45); the 4.1-H2 grill list
  folded into a note (every item has landed).
- `.claude/content/glimmerdark.md`, `.claude/content/rotcap-hollow.md`: the same "Base stats" line;
  the 4.1-H2 grill list folded (the Health item landed).
- `.claude/content/enemy-behaviour.md`: the Taunter row and the Stonehorn Warden row in the present
  tense (a warden; a taunter until 4.1-H2c).
- `.claude/species/species-locked.md`: Jaws' "big retaliate" is now "retaliate, 30% of Attack"; the
  Stonehorn Warden line adds its Health 39.
- `.claude/CONVENTIONS.md`, "Tuning never changes a mechanism golden": only a number the golden reads
  is pinned (spec question 1); base stats are pinned by their ranges only, and a PR that changes them
  lists every one, old → new, checked at the PR review (labeling 1, decide-point 2).
- `.claude/briefs/phase-4.1-implementation-plan.md`: ASSUMPTION 107's CI test is 4.1-H2d's (spec
  question 2); the H2d section gets "Input from the H2c PR review" (how to read the matchup table in
  the grill; the stale code comments were first listed there too, then moved to `handout-r1.md` by
  decision 1).
