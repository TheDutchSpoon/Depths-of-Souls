# Kickoff — Phase 4.1 — Slice H2d: the balancing pass

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

The balance numbers in this slice were chosen by the design owner in the H2d grill (2026-10-10),
on H2c's report and counterfactual runs of the simulator. You implement them; you choose none
(ASSUMPTION 149). If anything seems to need another balance number, stop and ask.

## Read (in addition to the standing list)

- `.claude/phases/4.1/H2d/brief.md`: this slice's brief.
- `.claude/briefs/phase-4.1-implementation-plan.md`, these headings only:
  - "Slice plan and sequencing rules" (the golden rules and "Content docs stay in sync");
  - "The split: H1, H2a, H2b1, H2b2, H2c, H2d" (the H2d row);
  - "The H2 grill", its last bullet ("Framing");
  - "Acceptance (4.1-H)", the H2d bullet;
  - the Assumptions checklist, items 22, 107 and 126 (how each CI threshold is read), 113 (the
    DoT and Regen potencies), 121 (no draw band), 124 (Snapback), 127 (the report additions),
    **147** (tuning never changes a mechanism golden), **148** (the CI threshold test), **149**
    (this slice exists) and **150–155** (the H2d grill's rulings: what you build).
- `.claude/phases/4.1/H2c/report-r1.md`, "Before / after" and "The DoT measurements for the H2d
  grill"; `.claude/phases/4.1/H2c/evidence/sim-after.txt` (H2c's "after", reproduced line for
  line at the H2c PR review: your baseline); `.claude/phases/4.1/H2c/review-r1.md`, "What was
  verified, and how" (the staged digest attribution and the fixture import comparison you repeat).
- `.claude/phases/phase-4.1-fix-and-consolidation.md`, the "4.1-H2c" section.
- Content: the "Decided at the 4.1-H2d grill" items in `.claude/content/overgrowth.md`,
  `rotcap-hollow.md` and `glimmerdark.md`; `.claude/species/species-locked.md` (the Snapjaws row).
- CONVENTIONS: "DoT and Regen from the applier's snapshot" (the numbers); "Balance simulator" (the
  bands, with T2 and T3 rewritten at this kickoff, and the CI bullet); "Mechanism goldens vs
  content goldens" and "Tuning never changes a mechanism golden".
- Code, before planning:
  - `data/spells/overgrowth.ts` (`POLLEN_CLOUD`), `data/traits/overgrowth.ts`
    (`snapjaw-jaws-snapback`), `data/statuses.ts` (the four `potency` declarations, the header and
    the "(placeholder)" notes), and their data tests;
  - `state/balance-sim.ts`, `balance-sim.test.ts` and `balance-sim-report.test.ts`:
    `computeThresholds`, `runSeed`, `SeedResult`, `RunRecord`, the `t2` / `t3` fields of the spec
    report and their printer lines, `FIRST_SESSION_RUNS` and everything that reads it;
  - the DoT goldens ASSUMPTION 147 names, and how a fixture supplies statuses (`golden-dot`
    exports `statuses = STATUS_REGISTRY`: a pin replaces one entry with the real def, only its
    `potency` held);
  - `golden-h2c-snapback` (its header already gives the 60% arithmetic) and
    `golden-h2b2-tick-no-retaliation` (holds Snapback, never evaluates it);
  - `state/integration.test.ts`, "Slice I … descends floor 1" (its revive count first moved at
    Snapback 30% in H2c);
  - `engine/__corpus__/corpus.ts` and `corpus-digest.test.ts`.

## Scope

- **Content data** (ASSUMPTIONS 150–152):
  - **Pollen Cloud deals no damage.** Its `deal-damage` effect goes; it stays AoE, enemy-side,
    Sleep for 2 turns on every target.
  - **Snapback back to 60% of Attack** (ASSUMPTION 151).
  - **DoT potencies:** Poison 20 → 40% of Attack, Burn 25 → 35% of Intelligence, Spore 15 → 35% of
    Speed. Regen stays 10% of Health. `data/statuses.ts` loses its "placeholder" wording (header
    and the four potency notes): the numbers are decided at the H2d grill.
- **The simulator** (ASSUMPTION 153): T2 and T3 become floor-read ceilings.
  - **T2:** at the start of each seed's first run on floor 3, at least one soul has completed.
  - **T3:** at the start of each seed's first run on floor 6, the party is full (six: four souls
    beyond the two starters).
  - A seed that never runs the floor is "didn't reach", counted apart, never a miss. Reported per
    spec as `met / reached (didn't reach N)`. Both are bands: reported, never asserted.
  - The first-soul median in floor runs **stays in the report**: it is ASSUMPTION 22's CI
    threshold, not T2.
- **The CI threshold test** (ASSUMPTIONS 148, 155): in the normal suite, one test file per spec,
  each running the full 40 seeds at run cap 30 with the boss probe off through the simulator's own
  `runSeed` and `computeThresholds`, asserting the three verdicts (never a value). Green on H2d's
  data; shown failing on H2c's.
- **The before/after report** and the DoT tick scan (below).

**Not in scope:** any combat or status rule or new engine mechanism; any other per-item fix or
balance number (floor 2 and the early walls are a watch point, ASSUMPTION 154); the XP curve and
the fight count (ASSUMPTIONS 117, 154); a draw band (121); the living and content docs (the
design agent folds them at the PR review).

## Golden policy

**Deliberate, listed**, under ASSUMPTION 147.

- **Mechanism goldens: expected values byte-identical.**
  - Each mechanism golden that reads a DoT percentage pins it in its own fixture: the real
    `StatusDef` spread with only `potency.percent` held at today's value. The edit is setup-only.
  - Don't trust ASSUMPTION 147's list as complete or exact: **find the set by mutation** (move each
    percentage alone, see which goldens fail), classify each one as mechanism or content by its
    subject (CONVENTIONS), and put the table in the plan. Candidates beyond the list:
    `golden-rot-sovereign`, `golden-sporch-cinderlord-burn-refresh`, `golden-spore-spread`, the
    other `golden-h2b2-*` goldens.
  - No mechanism golden reads Pollen Cloud. `golden-h2b2-tick-no-retaliation` holds Snapback but
    never evaluates it: a comment fix ("60% since 4.1-H2d"), no pin.
  - Show it by importing `main`'s and the branch's fixtures and deep-comparing every `expected*`
    export, `TURN_STEPS`, `EXPECTED_DRAWS` and `SEED`, as H2c did.
- **Content goldens: re-derived by hand, each failing with its old number.**
  - `golden-h2c-snapback` at 60% (fails at 30%).
  - **New `golden-h2d-pollen-cloud`** on the real `POLLEN_CLOUD`: one cast on two enemies, no
    `DamageDealt`, both asleep for 2 turns, and the next hit on one wakes only that one. Fails with
    the damage effect restored.
  - **One tick each for Poison, Burn and Spore** on real data, with the tick above the minimum of
    1 and the arithmetic in comments; each fails at its old percentage. Reuse an existing content
    golden that reads the number where one fits, re-derived; otherwise a new one.
  - Every content golden whose number moves is listed with the change that moved it.
- **Store, integration and data tests** move through content. Predict them in the plan. The Slice I
  integration test's revive count first moved at Snapback 30% (H2c, 0 → 1): expect it to move
  back. Re-pin generated-then-checkpoint-verified, with the cause and first stage in its comments.
- **The corpus digest** is regenerated **once**, through `npm run corpus:update`, attributed in
  cumulative stages built in a scratch clone outside the repo: **1** Pollen Cloud, **2** Snapback,
  **3** the DoT percentages. Count, per stage, the fights first changed there and the fights whose
  log differs from the previous stage.
- The plan lists the predicted changed set (tests, goldens, pins, digest stages) **before**
  anything runs.

## Traps

**Order of work**

- **Capture the "before" first, with the new report code on H2c's data.** H2c's "after" is your
  "before" (`evidence/sim-after.txt`), but it has no T2 / T3 in the new shape. Build the report
  changes first, run `npm run sim` before any data edit, and check that every pre-existing line
  matches H2c's `sim-after.txt` (apart from the runtime and the T2 / T3 lines). Save it as
  `evidence/sim-before.txt`. The full report takes about 18 minutes on Duncan's machine.

**Content**

- **Pollen Cloud loses an effect, not a number.** It becomes the first enemy-side AoE spell with
  no damage (Pacify and Silence are single-target). Check everything that walks a spell's effects or
  assumes an enemy-targeting AoE deals damage: spell validators and data tests (the
  spell-power convention tests, if any), the pre-hit fizzle (B5) and the "Hit" / target checks
  for AoE, the gem roll's castability rules, the damage observer, the simulator's matchup and
  damage readers. If any of these needs an engine change, stop and ask: this slice changes no
  mechanism.
- **Sleep's wake-up is unchanged.** Before, the Cloud's hit came first and the Sleep after it, so
  the hit never woke anyone. Now nothing in the cast hits. The new golden shows the next hit
  from another source waking its target.
- **Snapback reaches the player through the Unicorn's revives.** The H2c review printed the fight:
  two Snapbacks across the Brute's double strike, then a revive. Expect that integration fight to
  move and say why from its events.

**The simulator**

- **Read T2 and T3 from data the run already has, if it can.** `RunRecord.partyLevels` gives the
  party size at a run's start; completed souls at a run's start may need recording. The plan marks
  how it reads each as an ASSUMPTION. New pure helpers, tested on hand-built runs like H2c's report
  code (including a seed that never reaches the floor, and a soul completing during the floor-3
  run itself, which doesn't count for that run).
- **`FIRST_SESSION_RUNS`** is T3's old read point. Keep it if anything else reads it (the T4
  "after session" fields); otherwise say so. Don't change `FLOOR5_WINDOW_RUNS`.
- **The CI test must not copy the threshold code.** It calls `computeThresholds` on `runSeed`'s
  results. Measure the suite's wall time on `main` and on the branch; ASSUMPTION 148's limit is
  about 2 minutes added (kickoff measurement: 49 s for all three specs in sequence on H2c's data,
  about 70 s with the Pollen Cloud change).
- **"Fails on H2c's data"** is shown, not argued: run the test with the three content changes
  reverted in a scratch copy and name the failing verdict (the grill's measurement: the
  Shieldbarer's floor 1, 26 of 40).

**What the grill measured, so you can check your "after"**

All on 40 seeds; Sorcerer / Brute / Shieldbarer.
- **Pollen Cloud alone, full report:** first-try floor 1 40 / 40 / 40; floor 5 within 20 runs
  40 / 40 / 38; floor-10 first clear, median floor runs, 104 / 68 / 154; round-cap draws 5.9 / 2.6
  / 12.9%. The Sorcerer's slower mid-game (86 before) and the extra draws are named, accepted
  costs (ASSUMPTION 150): report them.
- **With Snapback 60% too, full report:** floor 1 40 / 40 / 40; floor 5 within 20 runs 40 / 40 /
  37; floor-10 first clear 106 / 71 / 166 (14 Shieldbarer seeds never clear it); draws 5.9 / 2.7 /
  12.6%. The Jaws loses every floor-1 fight it's in; its cost is on floor 2 (ASSUMPTION 151).
- **40 / 35 / 35 is unmeasured.** It sits between two sets H2c measured that moved no verdict.

If your "after" moves a verdict the other way, or differs materially from these, **stop and
report it**. Don't tune.

## Must stay green

Every existing test except the listed changes; every mechanism golden's expected values (by
import); `curves.test.ts`; `balance-sim.test.ts` and `balance-sim-report.test.ts` (extended, not
weakened); the new CI threshold test; all five gates.

## The PR must prove

- **The CI threshold test:** green on H2d's data, failing on H2c's (which spec and verdict); the
  suite's wall time on `main` and on the branch.
- **The before/after report:** every band (T1–T5, with the new T2 and T3) and the three verdicts,
  before and after, with the floor 1–5 matchup rows and first-try clear per floor, plus the
  Sorcerer's floor-10 median and the draw rates (ASSUMPTION 150's named costs). Both reports in
  `evidence/`.
- **The DoT tick scan**, as H2c ran it: the minimum-of-1 share of DoT ticks on the corpus's
  generated fights (Parts A and B; Part C apart), before and after, per status.
- **Mechanism goldens equal by import;** each pin shown setup-only.
- **Every changed number** in a hand-derived content golden that fails with the old value
  (Pollen Cloud with its damage restored, Snapback at 30%, each DoT at its old percentage).
- **The digest's stage attribution.**
- **Content changes**, as built, for the design agent's fold.

## Docs edited at this kickoff

- `.claude/briefs/phase-4.1-implementation-plan.md`: the H2d section moved to this mailbox's
  `brief.md` (byte for byte, by script), leaving its heading and a pointer; ASSUMPTIONS 150–155
  added (the grill's rulings); ASSUMPTION 113 gets a pointer to 152, ASSUMPTION 124 to 151.
- `.claude/CONVENTIONS.md`: the DoT and Regen numbers ("DoT and Regen from the applier's
  snapshot"); the T2 and T3 bands and the T2 unit note ("Balance simulator").
- `.claude/GAME_DESIGN.md`: the DoT and Regen numbers (§6 and §13); a clean-path levelling watch
  point in §13's first balance bullet (ASSUMPTION 154).
- `.claude/ROADMAP.md`: the H2d bullet names the grill's outcome.
- `.claude/content/overgrowth.md`, `rotcap-hollow.md`, `glimmerdark.md`: "Decided at the 4.1-H2d
  grill" items in their pending sections (Pollen Cloud, Snapback, the DoT numbers, Regen).
- `.claude/species/species-locked.md`: the Snapjaws row (Snapback 60% from 4.1-H2d).

Prettier: `.claude` is in `.prettierignore`, so the repo's `--check` on these files passes without
checking them; the 4.1 brief wasn't Prettier-formatted before this kickoff either.
