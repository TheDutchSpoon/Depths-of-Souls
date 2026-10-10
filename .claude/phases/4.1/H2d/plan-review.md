# Plan review — Phase 4.1 — Slice H2d: the balancing pass

## Round 1

Reviewed `plan.md` (commit `5fc3452`) against `kickoff.md`, `brief.md`, ASSUMPTIONS 22, 107, 113,
121, 124, 126, 127, 147–155, CONVENTIONS ("DoT and Regen from the applier's snapshot", "Balance
simulator", "Mechanism goldens vs content goldens", "Tuning never changes a mechanism golden") and
the code on `phase-4.1-h2d` (= `main` plus the kickoff and plan commits). I did not re-run the
mutation scan; I checked its result by reading every golden fixture that names Poison, Burn or Spore
(24 files) and every one whose expected events hold a `damageSource: 'dot'` tick (27 files).

**Verdict: approved with amendments** (decide-point 3). The plan builds exactly the grill's rulings
and chooses no number. The T2 / T3 reads are right against `runSeed` (checked below), the DoT golden
arithmetic is exact (40 → 30, 28 → 18, 21 → 11; old 10 / 10 / 1), the mutation table agrees with the
fixtures, and findings 1–3 correct real errors in my kickoff. What's left is one CONVENTIONS rule the
plan contradicts (fix 1), two checks that make the "before" and "after" verifiable instead of
eyeballed (fixes 2, 3), one structural constant (fix 4) and four small corrections. None changes
scope; no brief assumption is changed, only confirmed.

### Plan fixes

**Real fixes**

1. **Header notes on the mechanism goldens that borrow a moved status but read none of it (P4 is
   wrong against CONVENTIONS).** "Tuning never changes a mechanism golden" says: *only a number the
   golden reads is pinned: a borrowed number no event of the fight reads gets a header note, not a
   pin.* P4 gives comment edits only to headers that quote a percentage. The goldens that apply the
   real Poison, Burn or Spore with no tick in their events:
   - `golden-f2-win-over-own-tick` (real Poison, self-applied; the fight ends before the tick). Its
     header still says "Poison ticks 3% of max HP", the pre-H2b2 model: correct that line too;
   - `golden-spore-spread`, `golden-spore-spread-filter`, `golden-spore-spread-fizzle` (real Spore;
     the spread is the subject, no bearer reaches a turn end);
   - `golden-sporch-cinderlord-burn-refresh` (already a comment fix in the plan: make it this note,
     with its 25% arithmetic either removed or marked as the pre-H2d number).
   Each gets one line: it applies the real <status>, no tick lands, so its potency isn't read and
   isn't pinned (4.1-H2d). `golden-rot-sovereign` is a content golden (subject: the named boss), so
   the rule doesn't bind it; no edit. All comment-only, inside the comments-stripped setup-only check.
2. **Make the "after" checkable: reproduce the grill at stage 2.** The simulator is deterministic, so
   the grill's "Pollen Cloud + Snapback 60%" measurement must reproduce exactly, not "not
   materially differently". Run `npm run sim` once in the digest's **stage-2** scratch clone (Pollen
   Cloud + Snapback, DoTs at H2c's numbers) and check it against the kickoff's figures to the
   precision shown: first-try floor 1 40 / 40 / 40; floor 5 within 20 runs 40 / 40 / 37; floor-10
   first clear 106 / 71 / 166 with 14 Shieldbarer seeds never clearing; round-cap draws 5.9 / 2.7 /
   12.6%. A mismatch is a stop (the build doesn't implement what the grill measured). The final
   tree's report is then stage 3, and every difference from stage 2 is the DoT change. **The stop
   rule for the "after" becomes:** stop and report if any of the three verdicts fails; every other
   stage 2 → 3 difference is reported as a delta (the bands, the Sorcerer's floor-10 median, the
   draws, floors 21–30), not a stop. This replaces my kickoff's "differs materially", which named no
   test. Keep the stage-2 report as `evidence/sim-stage2.txt`. Cost: one more ~18 minute run.
3. **Check the "before" T2 / T3 against ASSUMPTION 153.** The grill read T2 40 / 40 / 40 and T3
   40 / 40 / 28 of 28 on H2c's data. The 28 is, on my reading, the cap-30 count: at cap 400 every
   Shieldbarer seed reaches floor 6 (H2c's `sim-after.txt`, floor 6 "reached" 40). So:
   - fold `soulBySeedFloor` / `fullPartyBySeedFloor` over the CI test's own cap-30 runs on H2c's data
     (the plan's scratch run for "fails on H2c's data" already produces them) and reproduce **exactly** T2
     40 / 40 / 40 and T3 40 / 40 / 28 met of 28 reached (12 didn't reach);
   - the cap-400 "before" must then show T2 met 40 / 40 / 40 with 0 didn't reach, T3 Sorcerer and
     Brute 40 / 40, and Shieldbarer at least 28 met of 40 reached (a seed's first floor-6 run is the
     same run at any cap, so the 28 stay met).
   A mismatch is a bug in the read, not a finding. Report both.
4. **The CI run cap is derived from the windows it must cover (P13).** Export
   `CI_RUN_CAP = Math.max(FIRST_SOUL_MAX_RUNS, FLOOR5_WINDOW_RUNS)` (= 30) beside the thresholds in
   `balance-sim.ts`, its comment carrying ASSUMPTION 148's reasoning (no verdict reads past it), and
   use it in the three CI files. Reusing `FIRST_SOUL_MAX_RUNS` alone is correct today but ties the
   cap to one window: if the floor-5 window ever grew past 30, the cap would truncate it silently and
   could flip that verdict.

**Corrections (labeling, no scope change)**

5. `golden-h2b2-tick-living-applier` doesn't import `POISON`: the import is `BONUS_VS_POISON`, a
   fixture trait. Drop the "check at build"; it reads the potency through its `statuses` export like
   the other fifteen.
6. `golden-h2d-pollen-cloud`: the caster's script is the fixture `always-cast` (slot 0; the
   side-aware default targets every enemy for an AoE spell). There is no `cast-aoe` script.
   H's `always-attack` does target `lowest-hp-enemy` (checked), and E1 is also slot 0, so the wake-up
   lands on E1 either way.
7. `golden-h2c-snapback`: the file name carries no number, so there is no rename (a rename is a
   delete, which the coding agent doesn't do). Title and comments only.
8. `golden-h2d-dot-ticks`: write into the setup what the arithmetic assumes: everyone vitality
   (×1.0), level 11 (`DEFAULT_FIXTURE_LEVEL`), no taken factors. And apply the three statuses with
   `applyStatus(bearer, A, { statusId, duration: 3 }, …)` in `setup`, as the Sporch golden does, so
   the snapshot is computed from the real def: a hand-written snapshot would not fail at the old
   percentage, which is the golden's whole job.

**For the PR review (no plan change):** I'll also read the test step's duration on the PR's GitHub
Actions run against `main`'s last run, since ASSUMPTION 148's limit was measured on Duncan's machine
and the CI runner has fewer cores.

### Assumptions

- **P1 — confirm.** One `holdPotency` helper; each fixture still names its held value
  (`holdPotency(STATUS_REGISTRY, { poison: 20 })`), which is what "pins it in its own fixture"
  needs. Sixteen inline spreads would be noise, and the helper's throw on an unknown id or a
  potency-less status is a check the spreads wouldn't have.
- **P2 — confirm; my kickoff was wrong.** It holds the real Poison and logs its tick (16, header line
  13), so it fails at 40%. Pin plus the Snapback comment fix.
- **P3 — confirm; decide-point 2** (the CONVENTIONS wording).
- **P4 — correct:** fix 1.
- **P5 — confirm.** No fixture with a real-Burn tick exists; the Burn-named tick goldens
  (`h2b1-wick-*`) don't move under Burn 35 in the mutation run.
- **P6 — confirm, with fix 8.** A change from my H2c round-1 recommendation (goldens on the real
  appliers: Venom Bolt, Sporch Igniter, Sporecloud Seeder), and why: the subject is the status's
  number. A real applier adds its own spell power, the Additional and its targeting to the
  arithmetic, none of it under test, and those appliers are covered by their own content goldens
  and the corpus. One golden, three bearers, each tick above the minimum, each failing alone at its
  old percentage, shows exactly the three numbers.
- **P7 — confirm, with fix 6.**
- **P8 — confirm.** Checked against `runSeed`: `run.index = progress.runs + 1` (1-based) and
  `runsToFirstSoul = progress.runs` after the run in which the soul completed, i.e. that run's index.
  So `runsToFirstSoul < run.index` is "completed in an earlier run", and a soul completing during
  the first floor-3 run itself reads missed. The planned `<=` mutation test is the right guard.
- **P9 — confirm.** `partyLevels` is read from `activeParty` before `descend`, after the previous
  run's summon and party pass; `PARTY_SIZE` is 6 (`store.ts:76`) and the party grows only by summon.
- **P10 — confirm.** `nextRun` pushes to `deepestFloor + 1` and farms `deepestFloor`, so floors are
  entered in order and "has a run on floor f" is "reached f".
- **P11 — decide-point 1.**
- **P12 — confirm.**
- **P13 — correct:** fix 4 (file names, the 600 s timeout and the one assertion stand).
- **P14 — confirm.** Failing loudly when a fourth spec ships without a CI file is the point.
- **P15 — confirm.** Name the cause from the fight's events, as planned.
- **P16 — confirm,** plus the stage-2 report (fix 2).
- **P17 — confirm.**
- **P18 — confirm.**
- **P19 — confirm;** I'll add the Actions duration at the PR review.
- **P20 — confirm.** `dedupKey` lives only in the data test, and its status-only path gives
  `wit|aoe|status:sleep`, which no other spell keys to (the mutation run's dedup test stays green).
- **P21 — confirm.** Consistent with reading: every fixture whose events log a real-Poison or
  real-Spore tick is among the sixteen; the five that apply a real DoT without a tick are fix 1's;
  the other tick goldens (`b4-*`, `f3-fight-start-wipe`, `h2a-*`, `h2b1-*`,
  `round-end-interaction`) rest on the mutation run, to be re-run at build.

**The plan against the kickoff:** the golden policy matches (deliberate, listed; mechanism goldens
equal by import; every changed number in a content golden failing with its old value), with P2's
correction. Every mechanism has its failing test at every site. No brief assumption is changed:
nothing to bring back to design.

### Decide-points

1. **Delete the fields the new T3 orphans, in this slice?** After H2d nothing outside `runSeed` and
   tests reads `SeedResult.partySizeAfterSession` or `deepestAfterSession` (neither is printed:
   checked), and `FIRST_SESSION_RUNS` is left as a test run cap and a pin test
   (`balance-sim-report.test.ts:91`). The plan keeps them "for a later slice".
   - **Recommendation: delete them here.** This slice is what orphans them; "a later slice" has no
     owner and no brief line, and a field called `partySizeAfterSession` next to a T3 that no longer
     reads it will read as live to the next person. Cost: the two fields, their lines in `runSeed`,
     the after-session assertions in `balance-sim.test.ts` (1050–1067; its `clearsToFirstSoul`
     check stays), the `FIRST_SESSION_RUNS` pin test, and a test-local cap (10) for the two smoke
     tests that use it as one. `FLOOR5_WINDOW_RUNS`'s comment loses its "T3 is still read after
     FIRST_SESSION_RUNS" line. No report line changes.
   - **The alternative:** keep them as the plan has it. Smaller diff, but dead data in the type the
     report folds from.
2. **Extend the pin rule to rule unit tests (P3)?** `status-snapshot.test.ts` is a unit test, not a
   golden, but it borrows the real Poison and asserts potencies 10 and 4 from its 20%.
   - **Recommendation: yes, and say so in CONVENTIONS.** ASSUMPTION 147's reason (byte-identity of
     rule tests proves only numbers moved; a re-derived rule test can stop reaching its branch)
     holds the same for a unit test. I'd add one line to "Tuning never changes a mechanism golden":
     *the same holds for a unit test whose subject is a rule and which borrows real content (4.1-H2d:
     `status-snapshot.test.ts`)*, so the next tuning pass doesn't re-argue it.
   - **The alternative:** let the unit test follow the data (re-derive 10 / 4 at 40%). Simpler now,
     but it makes rule tests move in every tuning PR, which is what 147 exists to stop.
3. **Approve with these amendments, or a round 2?**
   - **Recommendation: approve.** Fixes 1–8 are precise, each with its check, and none is a design question. On your yes I
     write them, with your answers to 1 and 2, into the kickoff's "Amended at the plan review"
     section (the coding agent reads it at build), as at H2c.
   - **The alternative:** the coding agent folds them into `plan.md` and I review once more: cleaner
     on paper, a round for no design content.

### Decisions

Duncan, 2026-10-10, all three as recommended:
1. **The orphaned fields go in this slice:** `partySizeAfterSession`, `deepestAfterSession` and
   `FIRST_SESSION_RUNS`, with their tests (a test-local cap for the smoke tests).
2. **The pin rule covers a rule's unit test that borrows real content:** `status-snapshot.test.ts`
   is pinned; CONVENTIONS and ASSUMPTION 147 say so.
3. **Approved with the amendments.** No round 2. Fixes 1–8 and decisions 1–2 are written into the
   kickoff's "Amended at the plan review" section, which binds the build alongside `plan.md`.

**The plan is approved: ready to commit.** The kickoff, the plan, this review and the doc edits go
in as the first commit on `phase-4.1-h2d`, so the PR carries the spec it was built against.

### Docs edited

- `.claude/phases/4.1/H2d/kickoff.md`: the no-retaliation pin correction (P2), the
  `FIRST_SESSION_RUNS` trap (decision 1) and the "after" stop rule (fix 2) marked in place; new
  "Amended at the plan review" section with fixes 1–8 and decisions 1–2, standalone for the coding
  agent (decision 3).
- `.claude/CONVENTIONS.md`: "Tuning never changes a mechanism golden": the pin rule covers a rule's
  unit test that borrows real content (decision 2).
- `.claude/briefs/phase-4.1-implementation-plan.md`: ASSUMPTION 147, the same extension (decision 2).
