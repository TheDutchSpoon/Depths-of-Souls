# Kickoff — Phase 4.1 — Slice H2c: the first tuning pass

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- `.claude/phases/4.1/H2c/brief.md`: this slice's brief. Its second half is 4.1-H's simulator
  description and watch points (uncapped stat stacking with the Rallying Cry and Flare data, boss
  floors in 6v6, the Rot Sovereign's Attrition). It moved with the H2c section. Your report
  measures it; the H2d grill decides what to change (ASSUMPTION 149).
- `.claude/briefs/phase-4.1-implementation-plan.md`, these headings only:
  - "Slice plan and sequencing rules" (the golden rules and "Content docs stay in sync");
  - "The split: H1, H2a, H2b1, H2b2, H2c" (the H2c row);
  - "The H2 grill" in full: "What the evidence said" is your baseline, and the rulings are what
    you build;
  - "Acceptance (4.1-H)", the H2c bullet;
  - the Assumptions checklist, items 21, 22, 98, 101–108 (the simulator and how each threshold is
    read), 113 (the DoT and Regen potencies), 117–129 (the H2 grill rulings), 140, 141 (the Wick,
    if a Flare fix touches it), 144 (a tick is declared in data) and **147, 148** (decided at this
    kickoff: tuning never changes a mechanism golden; the CI threshold test runs in the normal
    suite, from H2d) and **149** (decided at the plan review: this slice chooses no balance
    number; H2d does, after a grill).
- `.claude/phases/phase-4.1-fix-and-consolidation.md`, the "4.1-H1" section (the report's shape,
  its runtime, the walls) and the "4.1-H2b2" section (the digest attribution in layers, and the
  ticks landing on the minimum of 1, which is your DoT input).
- `.claude/phases/4.1/H2b2/review-r1.md`, decide-point 1 (4,971 of 5,318 corpus ticks land on the
  minimum of 1 with the placeholder percentages).
- Content: every `.claude/content/*.md` "Phase 4.1 — decided changes" item marked 4.1-H2c (Health,
  Snapback, Arcane Bolt, the DoT placeholders); `.claude/content/enemy-behaviour.md` (the taunter
  and warden roles, the Stonehorn Warden row); `.claude/specializations/shieldbarer.md` and
  `sorcerer.md`; `.claude/species/species-locked.md` (the Shieldbarer starter).
- CONVENTIONS: "Enemy level curve" and the `bossLevel` text in the boss-floor bullet before it;
  "Balance simulator" (the CI thresholds bullet, updated at this kickoff); "Mechanism goldens vs
  content goldens" and the **"Tuning never changes a mechanism golden"** rule after it (new at
  this kickoff); "DoT and Regen from the applier's snapshot" (the placeholder numbers); "Damage
  channels and the Additional" (its cap reads the target's max HP); the stat-range bullet (Health
  20–45 from H2c); "Role scripts" (taunter vs warden).
- Code, before planning:
  - `data/balance.ts`, `engine/curves.ts` and `curves.test.ts`, `engine/__fixtures__/balance.ts`
    (the Phase 4 placeholder config the store and integration tests pin);
  - `state/balance-sim.ts` and `balance-sim.test.ts`: `computeThresholds`, `runSeed`,
    `FIRST_SESSION_RUNS`, `SESSION_TARGET_FLOOR`, `reachedFloor5InSession`, the report printer;
  - `data/species/*.ts` and their tests (every creature's `baseStats`, the range tests),
    `data/species/starters.ts` (the Stonehorn Warden's Attack and role), `data/roles.test.ts`;
  - `data/statuses.ts` (the four `potency` declarations), `data/spells/core.ts` (Arcane Bolt's
    `spellPower`), `data/traits/overgrowth.ts` (`snapjaw-jaws-snapback`),
    `data/traits/glimmerdark.ts` (the Flare, the Wick's Health-percent heals);
  - `engine/__corpus__/corpus.ts` (it generates with `DEFAULT_BALANCE_CONFIG`) and
    `corpus-digest.test.ts`;
  - the goldens that read a number this slice changes: `golden-sorcerer-starter`,
    `golden-resonant-harmonize` and `-overtone` (Arcane Bolt), `golden-g1-leech-sovereign-pacified`
    (the real Leech Sovereign; it doesn't read her Health, plan review round 2), and
    `golden-h2b2-tick-no-retaliation` (it holds Snapback,
    which never fires there). The four content goldens whose headers say "real base stats"
    (`golden-rot-sovereign`, `golden-spore-spread`, `golden-sporch-cinderlord-burn-refresh`,
    `golden-hollowkin-wretch-self-dot`) copy the old Health.

## Scope

This slice is the first tuning pass, on the final rules.
- **Config:** `levelRangeWidth.base` 2 → 0, and the enemy minimum level **rounded down** (ASSUMPTION
  118); `bossLevelOffset` 3 → 5 (ASSUMPTION 119).
- **Content data:**
  - Health remapped to 20–45 for every creature except the three Flickerlings (ASSUMPTION 125);
  - the Stonehorn Warden at Attack 15 with the `warden` role (ASSUMPTION 123);
  - Snapback at 30% of Attack, and Arcane Bolt at spell power 1.0 (ASSUMPTION 124).
- **No balance number is chosen in this slice** (ASSUMPTION 149, decided at the plan review). The
  DoT and Regen percentages stay at today's placeholders, and there are no per-item floor-1 fixes:
  the design owner decides both in 4.1-H2d's grill, on this slice's report.
- **The simulator:**
  - the floor 1–5 matchup table and the first-try clear rate per floor (ASSUMPTION 127);
  - the floor-5 threshold reading the first 20 floor runs (ASSUMPTION 126);
  - the before/after report, with the three threshold verdicts reported, not asserted;
  - the DoT measurements for the H2d grill (ASSUMPTION 149): the full report (cap 400, probe off)
    on the "after" data in a scratch clone, nothing committed, for three DoT sets: today's
    placeholders (Poison 20 / Burn 25 / Spore 15), 35 / 30 / 30, and 50 / 40 / 45, Regen at 10. Per
    set: first-try clear on floors 21–30, T4, the Rot Sovereign's row, the round-cap draws, the three
    verdicts, and the minimum-of-1 share of DoT ticks on corpus Parts A and B (Part C apart).
    Evidence only: no recommendation.
- The CI threshold test (ASSUMPTION 148) lands in 4.1-H2d, where it can be green.

The mechanism goldens that read a number this slice changes get pinned (ASSUMPTION 147): today
none. `golden-g1-leech-sovereign-pacified` borrows the real Leech Sovereign but reads no number the
slice moves (plan review round 2). The DoT goldens wait for H2d.

**Not in scope:**
- any combat or status rule, and any new engine mechanism;
- the fight count and the XP curve (117), the level multiplier curve (118 keeps it), bosses'
  fight count (122) and a lock break-through chance (120);
- a draw band (121), and any global stack cap (the stacking rule is locked);
- the content docs (the design agent folds them at the PR review).

## Golden policy

**Deliberate, listed**, under ASSUMPTION 147 (CONVENTIONS "Tuning never changes a mechanism
golden").

- **Mechanism goldens: expected values byte-identical.** A golden whose subject is a rule pins
  each tuned number it reads in its own fixture: the real def spread, with only that number held
  at today's value. The edit is setup-only.
  - This slice moves no DoT percentage, so the DoT goldens are untouched (H2d pins them).
  - **No pin in this slice.** `golden-g1-leech-sovereign-pacified` uses the real Leech Sovereign,
    but none of its events reads her Health: it passes with her Health at 45 (measured at the plan
    review, round 2). It gets a comment-only header correction (its setup comment says "Health
    30"), not a pin.
  - `golden-h2b2-tick-no-retaliation` holds Snapback but never evaluates it: no pin.
  - Show it by importing `main`'s and the branch's fixtures and deep-comparing every `expected*`
    export: all equal. Every mechanism golden stays byte-identical as a file, apart from the
    comment-only header corrections.
- **Content goldens: follow the data, re-derived by hand.** `golden-sorcerer-starter`,
  `golden-resonant-overtone` and `-harmonize` (Arcane Bolt 1.0).
  - Each is listed with the change that moved it, with the new arithmetic in its comments, and
    fails with Arcane Bolt at 0.5.
  - None is regenerated by running.
  - The four content goldens that say "real base stats" but copy the old Health
    (`golden-rot-sovereign`, `golden-spore-spread`, `golden-sporch-cinderlord-burn-refresh`,
    `golden-hollowkin-wretch-self-dot`) get a header correction naming the copied stats that are
    real and saying Health is the pre-H2c value. No setup or expected change. So does
    `golden-g1-leech-sovereign-pacified` (above): five comment-only corrections, each shown
    identical to `main`'s file with comments stripped.
- **New content golden:** Snapback at 30% (`golden-h2c-snapback`), hand-derived on the real Snapjaw
  Jaws trait, with the counter above the minimum of 1, failing at 60%.
- **Store and integration tests** change through content (the Health remap, the starter, Snapback,
  Arcane Bolt). Measured at the plan review (round 2), two tests in `state/integration.test.ts`
  move, both on the placeholder config: "Slice I … descends floor 1" (`revivedCount` 0 → 1) and
  "Phase 4.1-G2 … the Pacified Unicorn casts" (the gem draw lands on slot 1, Wild Vigor, not slot 0).
  Re-pin each generated-then-checkpoint-verified, keep its rule assertions and checkpoints, and
  rewrite its comments with the new cause and first stage. The "Phase 4.1-A defaults" block runs
  the default config, so its log moves with the curve, but its assertions hold: it stays unchanged.
  Each changed expectation is listed with its cause.
- **The corpus digest** is regenerated **once**, through `npm run corpus:update`. Nearly every
  fight changes, so attribute in stages. Build each stage in a scratch clone outside the repo as a
  cumulative patch on the one before (`starters.ts` carries both stage 2 and stage 3), in this
  order:
  1. the curve (range width, rounding, boss offset);
  2. the Health remap;
  3. the Stonehorn Warden;
  4. Snapback and Arcane Bolt (Arcane Bolt is also a biome-1 Wit gem, so enemy Wit casters move
     here too).

  Each changed fight is attributed to the first stage that changes its log. The report counts
  fights per stage.
- The plan lists the predicted changed set (tests, goldens, digest stages) **before** anything runs.

## Traps

**Order of work**

- **Capture the "before" report first.** Run `npm run sim` on the unchanged tree before the first
  edit (the branch equals `main`: H2a and H2b are merged). Save its output in the mailbox, because
  the PR and the phase record show it. The full report takes about 14 minutes.

**The curve and the Health remap**

- **The rounded-down minimum is engine code, not config.** `scaledMinLevel` in `engine/curves.ts`
  rounds with `Math.round` in both branches. ASSUMPTION 118 changes both to `Math.floor`.
  - My lean: one rule in the curve, no rounding-mode config field (the plan marks it ASSUMPTION).
  - The Phase 4 placeholder config's minimum is an exact integer (a flat ×1.00 multiplier), so
    rounding changes nothing there. Show that the tests pinning it don't move through the curve.
  - Fix the stale comments: "Default offset 3", and ASSUMPTION 4's "a SINGLE Math.round".
  - Check the result against the docs: floors 1–9 spawn at 1, 2, 3, 5, 6, 7, 9, 10, 11; floor 10
    at 13–14; floor 30 at 44–47; bosses at 19 / 34 / 52 on floors 10 / 20 / 30.
- **The Health remap is a one-time data edit, not a runtime transform.**
  - Apply `floor(20 + (old − 10) × 1.25 + 0.5)` to every creature's `health` in `src/data` with a
    script, never by hand: biome species, bosses, the starters and the Unicorn.
  - Skip the three Flickerlings, already on the new scale (38 / 25 / 28).
  - Test fixtures and in-golden creatures are not content: don't touch them.
  - The range tests become Health 20–45, other stats 10–30.
  - The report lists every creature's old → new value.
- **Health is read by more than the HP pool.** Max HP, the Additional's cap
  (`0.2 × target maxHP`), Regen's potency (10% of the healer's Health), Afterglow's heal, and the
  Wick's Health-percent heals all move with the remap. That's intended: the grill measured the
  full decided set with it.
  - The plan lists every Health reader in data and engine, so the stage-2 attribution and the
    content goldens know what moved.

**The simulator**

- **The floor-5 window is not the session.** `reachedFloor5InSession` is read at
  `FIRST_SESSION_RUNS` (10). ASSUMPTION 126 moves the threshold to 20 floor runs, but T3's session
  stays 10.
  - Add a separate named constant for the window, and don't change `FIRST_SESSION_RUNS`.
  - Rename the field and fix the header comment and the `Thresholds` doc comment that say 10.
- **The report additions are new report code**: the floor 1–5 matchup table, and the first-try
  clear rate per floor. Test them like H1's report, on hand-built seed results. Key the matchup
  rows by floor and enemy template, and print floor 1 on its own: a floor-1 fight has one enemy,
  so its rows attribute each fight exactly.
- **No CI threshold test here.** It lands in H2d (ASSUMPTIONS 148, 149). The report still shows the
  three verdicts and their values, before and after.

**Measurement, not tuning** (ASSUMPTION 149)

- **You choose no balance number.** The DoT and Regen percentages stay at today's placeholders,
  and there are no per-item fixes. If anything in this slice seems to need a balance number, stop
  and ask: it is a "bring it back to design" signal.
- **The DoT measurements for the H2d grill.** In a scratch clone with nothing committed, run the
  full report (cap 400, probe off) on the "after" data for each of three DoT sets: today's
  placeholders (Poison 20 / Burn 25 / Spore 15), 35 / 30 / 30, and 50 / 40 / 45, with Regen at 10.
  - Almost every DoT applier is Rotcap Hollow content (floors 21–30); Poison also comes from Venom
    Bolt, a biome-1 Instinct gem. So report, per set: first-try clear on floors 21–30, T4, the Rot
    Sovereign's row, the round-cap draws and the three verdicts.
  - Also report the share of DoT ticks that land on the minimum of 1, on the corpus's generated
    fights (Parts A and B), with Part C's coverage fights apart: their stacked Defence ticks 1 at
    any percent.
  - Present the numbers as evidence. Don't recommend a set.
- **Rallying Cry and the Flare: measure and report.** Under `warden` the Stonehorn Warden Provokes
  only when an ally is below 50% HP, so Rallying Cry should stack far less than under `taunter`.
  Report its largest stack before and after, and the Flare's (×1.15 Speed per Wick burn). Propose
  no change. The report's `largestStacks` keeps one maximum per bucket, whichever trait holds it,
  so this needs a per-trait maximum in the report code (see "Amended at the plan review").

**Pinning and the docs**

- **Pinning holds today's number, not the tuned one**, and only the number. Only a number the
  golden actually reads gets a pin: in this slice, none does (the Leech Sovereign golden doesn't
  read her Health). H2d's DoT pins spread the real def with only that number held.
- **The content docs are the design agent's.** List every content change under the report's
  **Content changes**: the Health table, the starter, Snapback and Arcane Bolt, each with its old
  and new number. The design agent folds the "(4.1-H2c)" items and
  GAME_DESIGN's open numbers from the code at the PR review.

## Must stay green

- All five gates: `npm run test`, `npm run lint`,
  `npm run format:check`, `npm run build`, `npx tsc -b`.
- Every mechanism golden's expected values, compared by importing the fixtures, including the
  Leech Sovereign golden.
- The frozen double-resolve determinism test, the deep-frozen golden runner, and the simulator's
  determinism test.
- `corpus-coverage.test.ts`: every spell cast with its effects landing and every status applied,
  with no stale exemption.
- The data validators, the `perform-action` data test, and `balance-sim.test.ts`'s mechanism tests.

## The PR must prove

- **The before/after report**, in the PR and in the phase record's H2c section:
  - every band (T1–T5);
  - the three threshold verdicts and values;
  - the round-cap draw rates and the largest stacks;
  - the boss rows, the matchup table and the first-try clear per floor;
  - "before" captured on the unchanged tree.
- **The DoT measurements** for the H2d grill: the three sets, each with the figures listed under
  "Measurement, not tuning", and the largest Rallying Cry and Flare stacks before and after.
- **The curve:** a test pinning `enemyLevelRange` for floors 1–10, 20 and 30, and `bossLevel` for
  floors 10, 20 and 30 against ASSUMPTIONS 118 and 119. It fails with `Math.round` restored and
  with the offset at 3.
- **The Health remap:** the old → new table for every creature, computed by the script; a test
  that every non-Flickerling creature's Health is in 20–45; and the Flickerlings unchanged.
- **The goldens:**
  - the mechanism goldens' expected exports equal to `main`'s by import comparison, and the five
    header corrections shown comment-only;
  - each re-derived content golden listed with its cause and its new arithmetic;
  - `golden-h2c-snapback` failing with Snapback at 60%.
- **The digest:** regenerated once, every changed fight attributed to its first stage, counts per
  stage.
- **Housekeeping:**
  - the test count reconciled file by file against `main`;
  - **Spec questions** and **Content changes**;
  - anything to delete.

## Amended at the plan review (2026-10-10)

The design owner moved every balance choice out of this slice (ASSUMPTION 149): no DoT percentage,
no per-item fix, and no CI threshold test here. All three go to 4.1-H2d, which opens with a grill
on this slice's report. This kickoff was edited in place to match: Scope, the golden policy, the
Traps ("The simulator", "Measurement, not tuning", pinning), Must stay green and The PR must prove.
Round 1 of `plan-review.md` lists the plan fixes that still apply.

**Round 2 (2026-10-10): plan approved with these amendments.** They bind the build alongside
`plan.md` revision 1. They were measured by running the full suite on a scratch copy with every H2c
number applied.
- **No pin.** `golden-g1-leech-sovereign-pacified` passes with the Leech Sovereign's Health at 45:
  none of its events reads it. Drop the plan's P1, P14 and P22. Correct its setup comment ("Health
  30") instead, comment-only, as a fifth header correction (P32's comments-stripped check).
- **`state/integration.test.ts`:**
  - the "Phase 4.1-A defaults" block stays unchanged (still ten wins on floor 1; P25 is "checked
    green", not "regenerate");
  - "Slice I … descends floor 1": `revivedCount` goes 0 → 1 (line 193). Re-pin it, and rewrite the
    comment above it (the H2a reason it was 0) with the new cause and first stage;
  - "Phase 4.1-G2 … the Pacified Unicorn casts its slot-0 gem": the Unicorn is still Pacified and
    still casts instead of waiting, but the gem draw lands on slot 1 (Wild Vigor: a `SpellCast`,
    then a `StatModifierApplied` on herself), not slot 0 (Life Siphon). Re-pin the drawn slot and
    its effect generated-then-checkpoint-verified. Keep the rule assertions (no `Waited`, her own
    `SpellCast`), add a checkpoint that the cast slot holds a gem from her stored set, rename the
    test, and rewrite the describe's header comment (the "137/212 events … Life Siphon" history).
- **Per-trait stack maxima (report code).** `largestStacks` keeps one maximum per bucket, so
  Rallying Cry's and the Flare's largest stacks can't both be read before and after. Add a general
  per-attribution maximum (bucket × trait id → the largest `StackCount`, with floor and seed),
  printed as the top few per bucket. It is a pure fold over the existing `StackCount`s, tested on
  hand-built fights (two traits in one bucket both kept, the smaller not lost), with "before" from
  the extended pass (P4).
- **`golden-h2c-snapback`:** fixture creatures default to level 11, where the Additional is 0, so
  P's hit on E is `floor(20 + 0.2) = 20` (E 1000 → 980); keep that level. Write the full
  `expectedEvents` (`toEqual`, `TURN_STEPS = 1`).
- **The DoT minimum-of-1 scan** regenerates the corpus fights per DoT set in the clone (the digest
  holds hashes, not logs).
- **The predicted set, as measured:**
  - `curves.test.ts`: 3 default-config tests (floors 1, 100, 101); rename their `round(...)`
    titles;
  - the species range tests: 2 per biome file plus 1 in `starters.test.ts`;
  - `roles.test.ts`: 1;
  - the three Arcane Bolt goldens and the corpus digest;
  - the two integration tests above;
  - everything else stays green.
- `src/app/demoFight.ts` keeps its old-scale creatures (the throwaway demo, not content). Say so in
  the report.

## Docs edited

- `.claude/briefs/phase-4.1-implementation-plan.md`:
  - moved the H2c section to this mailbox's `brief.md`, leaving its heading and a pointer;
  - added ASSUMPTION 147 (tuning never changes a mechanism golden) and ASSUMPTION 148 (the CI
    threshold test in the normal suite, capped at 30 floor runs), both decided by the design owner
    at this kickoff;
  - the "Acceptance (4.1-H)" H2c bullet now reads "mechanism goldens untouched" as expected values
    byte-identical with tuned numbers pinned.
- `.claude/phases/4.1/H2c/brief.md`: new; the H2c section, moved byte for byte (heading to the next
  `###`, which takes 4.1-H's simulator description and watch points with it, since they sit under
  that heading).
- `.claude/CONVENTIONS.md`:
  - a new standing rule after "Mechanism goldens vs content goldens": "Tuning never changes a
    mechanism golden" (ASSUMPTION 147, made a rule at the design owner's request);
  - "Balance simulator", the CI thresholds bullet: where and how the threshold test runs
    (ASSUMPTION 148).
