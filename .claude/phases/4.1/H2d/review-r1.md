# PR review r1 — Phase 4.1 — Slice H2d: the balancing pass

Reviewed `report-r1.md` and branch `phase-4.1-h2d` at `381e67c` against `kickoff.md` (with "Amended at the plan
review"), `plan.md`, `plan-review.md`, ASSUMPTIONS 22, 147–155 and CONVENTIONS on `main`. Everything below was
run in my own clone (`main` at `origin/main`, the PR at `381e67c`), `npm ci` fresh on both.

## Verdict: fixes (one comment, one file)

The build is right. The three content changes are exactly the grill's numbers, no mechanism moved, every
mechanism golden's expected values are equal to `main`'s, every changed number sits in a hand-derived content
golden that fails at the old value, the CI threshold test is green on H2d's data and red on H2c's for the reason
the grill named, and every reproducible claim in the report reproduced (digest stages, before/after reports,
mutation table). One real fix: the integration re-pin explains its cause with the wrong arithmetic and the wrong
attribution (fix 1). Two things the report under-reported, both for your call (decide-points 1 and 2). The T3
question is answered: the coding agent's read is right and my plan review was wrong.

## Real fixes

1. **`state/integration.test.ts`, "Slice I … descends floor 1", the 4.1-H2d re-pin comment is wrong on two
   counts** (the assertion `toHaveLength(0)` is right). The kickoff asked for the cause "from the fight's
   events"; I printed fight 2 at 60% and at 30%:
   - **Arithmetic:** it says "Attack 40 x 0.6 = 24, minus a fifth of the Brute's Defence" (that is the
     `golden-h2c-snapback` fixture's Attack). The real Snapjaw's effective Attack here is **30** and the Brute's
     Defence **15**: 30 × 0.6 = 18 − 3 = **15** (at 30%: 9 − 3 = 6, the two 6s). Against the Unicorn (affinity
     × 0.75): 13.5 − 3 = 10.5 → 10 (at 30%: 3.75 → 3).
   - **Attribution:** "The Snapjaw's own two attacks land on the Unicorn (10 and 18)": the Snapjaw attacks
     once. The 10 is the **Snapback counter** on the Unicorn's opening hit (39 → 29); the 18 is its one attack.
     And the comment doesn't say why the attack moved off the Brute, which is the actual cause: at 60% the
     counter takes the Unicorn below 80% (29 / 39), so the striker's rule 1 ("any enemy below 80% → attack the
     lowest-HP enemy") sends its attack into the Unicorn (29 < the Brute's 33). At 30% the counter leaves the
     Unicorn at 36 (above 80%), rule 2 attacks a random enemy, and it drew the Brute (21, then two 6-counters:
     33 → 12 → 6 → 0, revived).
   Comment-only; `handout-r1.md` has the text.

## Scope and labeling (no change asked of the coding agent)

- **The stage 2 → 3 deltas in the report miss the largest one and mislabel another.**
  - Omitted: the **Brute's floor-30 first-try clear (the Rot Sovereign) fell 38 / 38 → 28 / 36** with the DoT
    change (H2c's data: 35 / 36); floor-30 failed pushes 0 → 12; the Rot Sovereign's policy clear 100% → 77.8%.
    "Floors 21–30 differ in 287 report lines (small counts)" hid it. This is the very number ASSUMPTION 152
    reasoned about. Decide-point 1.
  - Mislabeled: "the Sorcerer's frontier stops 38 → 36 (cap 2 → 4)" is the **Brute's** T4 line (the Sorcerer and
    the Shieldbarer stop on the cap in all 40 seeds, before and after).
  - Floors 21–29 for the Brute (stage 2 → 3, first-try): 31→31, 22→25, 26→20, 16→14, 20→20, 15→19, 12→13, 7→5,
    10→8, all within a few seeds.
- **The golden-equality evidence compared only `expected*` exports.** Two fixtures export sub-fixtures with
  `*Expected` names (`golden-h2b1-wick-gates`, `golden-h2b1-last-gleam`); `golden-seed-sensitivity` exports seeds.
  I compared every export of every fixture: the only expected-value change is `golden-h2c-snapback`'s (plus the
  two new fixtures); everything else that differs is a shared registry (`traits` in 47 fixtures carries
  Snapback 0.6, `statuses` in 43 carries the new potencies), which no event reads. Claim holds; the runbook now
  says "every export" (`workflow/pr-review.md`).
- **The CI test's wall time** on my 2-core sandbox: full suite `main` 60 s → branch 137 s (**+77 s**; the three
  CI files 24–28 s each). Inside ASSUMPTION 148's ~2 minutes even on 2 cores; the report's +13 s is Duncan's
  machine. I couldn't read the PR's GitHub Actions run (no GitHub API access from this session); if you want
  the runner's figure, it's the test step's duration on the PR run against `main`'s last.
- **`src/app/demoFight.ts`** (report Q3) still has pre-H2c Health (up to 50). A throwaway demo the Phase 4.5
  brief replaces; not this slice.

## Spec questions from the report, answered

1. **T3 at cap 30: the read is right; my plan review was wrong.** I reproduced the coding agent's cap-30 figures
   on H2c's data exactly (T3 40 / 40, 37 / 37 with 3 didn't reach, 15 / 15 with 25 didn't reach) and then
   looked for the grill's "28 of 28": it is the **Shieldbarer's floor-6 reach at a run cap of 60** (first
   floor-6 runs at 18…53 for 28 seeds; Brute and Sorcerer all reach by 40). My fix 3 asserted it was the cap-30
   count without checking. ASSUMPTION 153 now gives the cap-400 and cap-30 figures and says so. Also worth
   knowing: in every data set I ran (H2c, stage 1, 2, 3), **every seed that reaches floor 6 has six**, and by
   run 31 every seed of every spec has six: T3 is a ceiling nothing is near today.
2. **Stale doc text:** folded (below). 3. **demoFight:** above.

## Decide-points

1. **Accept the floor-30 cost of the DoT numbers?** Brute first-try floor 30: 38 / 38 at stage 2 → **28 / 36**
   at 40 / 35 / 35 (H2c measured 35 / 36 at the placeholders, 31 / 35 at 35 / 30 / 30, 25 / 36 at 50 / 40 / 45, all
   without Pollen Cloud or Snapback). Biome 3's DoTs are mostly the enemy's, which is why the grill kept the
   numbers modest.
   - **Recommendation: accept, and record it.** 28 / 36 lands between the two sets H2c measured on either side
     of 40 / 35 / 35, which is what the grill expected when it chose an unmeasured point between them; no
     threshold reads floor 30; it is the deepest content floor and a boss, and the player's real lever against
     it (scripting) arrives in Phase 6. I'd add the measured figure to ASSUMPTION 152 and floor 30 to
     ASSUMPTION 154's watch points for the Phase 4.5 demo.
   - **The alternative:** lower Burn and Spore (the biome-3 enemies' DoTs) before merging. That's a new grill
     on new runs (about 18 minutes per set on your machine), and a new stage in the digest.
2. **The no-damage Pollen Cloud can stall a fight.** A corpus scan (527 fights, before → after): casts of
   Pollen Cloud on a side that is **already all asleep** 59 → 94; the longest sleep (consecutive skipped turns
   of one creature) 15 → **35**; fight 275 (three player Pollen casters vs a Treant Elder) goes from a 36-round
   win to a **round-cap draw**, the Elder asleep 35 turns running. Before, the cast's own damage ended these
   fights; now a recast just refreshes the Sleep. Casters re-cast because no role script checks whether the
   targets already carry the status.
   - **Recommendation: accept it as part of ASSUMPTION 150's named draw cost, and add a watch point** (ASSUMPTION
     154): "a status-only AoE recast on a side that already carries it". Its home is the role scripts / Phase 6's
     conditions (a "target lacks status" check), not an engine castability rule, which would be a mechanism
     change this slice may not make. Overall corpus draws actually fell 53 → 50, and the simulator's draws moved
     5.9 / 2.7 / 12.6% at stage 2 (the grill's accepted figures).
   - **The alternative:** fix it now with a script condition on the caster roles: a G1 behaviour change, its
     own slice and its own goldens.
3. **Round 2 for a comment-only fix?**
   - **Recommendation: yes, the normal way** (`/slice-fix 4.1-H2d 1`), because the comment is the
     generated-then-checkpoint-verified cause and should be right before merge; the round-2 review is a
     comments-stripped check plus the numbers, minutes.
   - **The alternative:** merge as is and fix the comment in the next slice. Cheaper, but leaves a wrong cause on
     `main`.

## Decisions

Duncan, 2026-10-10, all three as recommended:
1. **The floor-30 cost is accepted.** The measurement goes into ASSUMPTION 152, and floor 30 against the DoTs
   becomes an ASSUMPTION 154 watch point (and GAME_DESIGN §13's).
2. **The Pollen Cloud stall is accepted** as part of ASSUMPTION 150's draw cost, with a watch point in
   ASSUMPTION 154 and GAME_DESIGN §13: a status-only AoE recast on a side that already carries it; its fix
   belongs in the role scripts and Phase 6's conditions, not the engine.
3. **Round 2 the normal way:** `/slice-fix 4.1-H2d 1` with `handout-r1.md`; I review `report-r2.md` here.

## What was verified, and how

- **Gates** (fresh `npm ci`, Vitest 5.0.3 per the lockfile): `npm run test` 201 files, 1357 tests (1356 passed,
  1 skipped), green; lint, `format:check`, `build` and `tsc -b` clean. **File-by-file against `main`**
  (`--reporter=json`): +24 exactly as reported (`balance-sim-report` 16 → 30, `spells/index` 12 → 13, three CI
  files, `held-statuses` 4, two goldens); every other file equal in count.
- **Mechanism goldens equal by import:** every export of all 132 / 134 fixtures, serialised with Maps and
  functions, compared across the trees (above).
- **Pins setup-only:** all 25 changed golden / rule-test files compared with comments stripped (TypeScript
  printer): the 16 pins differ in exactly the `holdPotency` import and the `statuses` line (Poison 20 ×12,
  Spore 15 ×4); `status-snapshot.test.ts` in the import, `STATUSES` and its two uses; the five header-note
  goldens and `golden-h2b2-tick-no-retaliation`'s Snapback note are comment-only; `golden-h2c-snapback` differs
  in its three numbers and its titles; `integration.test.ts` in the one count.
- **The pin set is complete:** with the pins on, each of Poison, Burn and Spore set to **200%** fails only
  `statuses.test.ts`, `golden-h2d-dot-ticks` and the digest: no other golden or test reads a DoT percentage.
- **Mutations** (scratch copy of the final tree, each alone, full suite): Pollen Cloud's damage restored →
  `golden-h2d-pollen-cloud`, the spells data test, the digest **and the Shieldbarer CI test**; Snapback 0.3 →
  `golden-h2c-snapback`, the integration test, the digest; Poison 20 / Burn 25 / Spore 15 each → the dot-ticks
  golden, `statuses.test.ts`, the digest; pins disabled → 24 tests in 18 files (the 16 goldens,
  `status-snapshot` ×6, `held-statuses` ×2). Simulator: `<` → `<=` in the T2 read, `>= 5` in the T3 read,
  `findLast` for "first run", "missed" for "didn't reach", and `CI_RUN_CAP = FLOOR5_WINDOW_RUNS` each fail the
  report or spec-guard test named for them.
- **Hand-derived goldens:** recomputed `golden-h2d-dot-ticks` (40 → 30, 28 → 18, 21 → 11; old 10 / 10 / 1),
  `golden-h2d-pollen-cloud` (no RNG; E1 20 → 10 and wakes, E2 keeps Sleep 2) and `golden-h2c-snapback`
  (24 − 2 = 22). Neither new fixture has a random target or a chance roll (their seeds are declared inert),
  so there were no draws to recompute.
- **CI test on H2c's data:** in a scratch copy with the three content changes reverted, the Shieldbarer fails
  `floor1` (26 / 40), the other two pass.
- **Digest:** regenerated with `npm run corpus:update` at four cumulative stages; stage 0 is byte-identical to
  `main`'s fixture, stage 3 to the PR's. First changed 167 / 17 / 91, differing from the previous stage
  167 / 24 / 154, 275 differ from `main`, result flips as reported (16).
- **Before / after reports:** my `npm run sim` on the PR (40 min on 2 cores) equals `evidence/sim-after.txt` line
  for line apart from the runtime; `sim-before.txt` equals H2c's `sim-after.txt` apart from the T2 / T3 lines,
  the runtime and Vitest's footer; `sim-stage2.txt` carries the grill's figures (40 / 40 / 40; 40 / 40 / 37;
  106 / 71 / 166, 14 never; 5.9 / 2.7 / 12.6%). Cap-30 folds on H2c / stage 1 / 2 / 3 data reproduce the
  first-try floor-1 and floor-5 figures each stage claims.
- **Integration fight:** printed fight 2's events at 60% and 30% (fix 1).
- **Corpus scan** for live behaviour: Pollen Cloud deals no damage in any of 1,219 casts (3,861 hits before);
  the stall in decide-point 2.

## To delete

None. The mailbox holds the brief, kickoff, plan, plan review, report, this review and its hand-out, and
`evidence/` (every file cited by the report).

## Docs edited

- `content/overgrowth.md`: Pollen Cloud's row (Sleep 2 turns, no damage), the Jaws' row (60%), Venom Bolt's
  Poison (40%, no placeholder); the "Decided at the 4.1-H2d grill" item marked landed and folded.
- `content/rotcap-hollow.md`: Spore 35% of Speed, the Rotcore's Poison 40%, the Igniter's Burn 35% (no
  placeholders); the 4.1-H2d item marked landed and folded.
- `content/glimmerdark.md`: Afterglow's Regen loses "a placeholder until 4.1-H2d"; the item marked folded.
- `GAME_DESIGN.md`: the DoT numbers "landed in 4.1-H2d" (§6 and §13), no longer "landing".
- `briefs/phase-4.1-implementation-plan.md`: ASSUMPTION 153's T3 figures corrected (cap 400 and cap 30; the
  "28 of 28" was a cap-60 read; my plan review's reading was wrong).
- `phases/phase-4.1-fix-and-consolidation.md` (this slice's record, unmerged): the T3 spec note resolved; the
  floor-30 cost added to "Before / after".
- `workflow/pr-review.md`: step 4 compares every export, not only `expected*`.
- After the decisions: `briefs/phase-4.1-implementation-plan.md` ASSUMPTION 152 (the floor-30 measurement, accepted),
  ASSUMPTION 154 (two new watch points: floor 30 against the DoTs; status-only AoE recasts) and ASSUMPTION 150
  (the stall, found at this review); `GAME_DESIGN.md` §13 (the same two watch points).
