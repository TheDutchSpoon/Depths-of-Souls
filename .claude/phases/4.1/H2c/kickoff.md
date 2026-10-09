# Kickoff — Phase 4.1 — Slice H2c: the first tuning pass

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- `.claude/phases/4.1/H2c/brief.md`: this slice's brief. Its second half is 4.1-H's simulator
  description and watch points (uncapped stat stacking with the Rallying Cry and Flare data, boss
  floors in 6v6, the Rot Sovereign's Attrition). It moved with the H2c section, and it is the
  input your per-item fixes answer.
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
    suite).
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
  - the 26 goldens that read a number this slice tunes: `golden-dot`, `golden-f2-dot-one-turn`,
    `golden-f2-turn-end-interaction`, `golden-f2-win-over-own-tick`, every `golden-h2b2-*`,
    `golden-hollowkin-wretch-self-dot`, `golden-resonant-harmonize`, `golden-resonant-overtone`,
    `golden-rot-sovereign`, `golden-sorcerer-starter`, `golden-sporch-cinderlord-burn-refresh`,
    every `golden-spore-spread*`, `golden-turn-end-dot-kill-burst` and `-refresh`.

## Scope

This slice is the first tuning pass, on the final rules.
- **Config:** `levelRangeWidth.base` 2 → 0, and the enemy minimum level **rounded down** (ASSUMPTION
  118); `bossLevelOffset` 3 → 5 (ASSUMPTION 119).
- **Content data:**
  - Health remapped to 20–45 for every creature except the three Flickerlings (ASSUMPTION 125);
  - the Stonehorn Warden at Attack 15 with the `warden` role (ASSUMPTION 123);
  - Snapback at 30% of Attack, and Arcane Bolt at spell power 1.0 (ASSUMPTION 124);
  - the DoT and Regen percentages, and the per-item floor-1 fixes the plan proposes from the
    report (ASSUMPTION 129).
- **The simulator:**
  - the floor 1–5 matchup table and the first-try clear rate per floor (ASSUMPTION 127);
  - the floor-5 threshold reading the first 20 floor runs (ASSUMPTION 126);
  - the CI threshold test asserted in the normal suite (ASSUMPTION 148);
  - the before/after report.

The 14 mechanism goldens that read a tuned number get pinned (ASSUMPTION 147).

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
  - My split of the 26, which the plan confirms or corrects with a reason per file: `golden-dot`,
    the three `golden-f2-*` above, the ten `golden-h2b2-*`, and `golden-spore-spread-filter`,
    `-fizzle` and `-dot-kill`.
  - Show it by importing `main`'s and the branch's fixtures and deep-comparing every `expected*`
    export: all equal. Every mechanism golden outside the 26 stays byte-identical as a file.
- **Content goldens: follow the data, re-derived by hand.** `golden-sorcerer-starter`,
  `golden-resonant-overtone` and `-harmonize`, `golden-sporch-cinderlord-burn-refresh`,
  `golden-hollowkin-wretch-self-dot`, `golden-rot-sovereign`, `golden-spore-spread` and
  `golden-turn-end-dot-kill-burst(-refresh)`.
  - Each is listed with the tuning change that moved it, with the new arithmetic in its comments.
  - None is regenerated by running.
- **New content goldens:** each effect number this slice changes (each DoT and Regen potency,
  Arcane Bolt, Snapback, every per-item fix's number) is shown in a hand-derived content golden on
  real data. It is either new, or one of the re-derived goldens above. The plan says which, per
  number.
- **Store and integration tests** change only through content (the Health remap, the starter);
  never through the curve, because the placeholder config they pin is unaffected (see Traps). Each
  changed expectation is listed with its cause.
- **The corpus digest** is regenerated **once**, through `npm run corpus:update`. Nearly every
  fight changes, so attribute in stages with scratch switches outside the repo, in this order:
  1. the curve (range width, rounding, boss offset);
  2. the Health remap;
  3. the Stonehorn Warden;
  4. Snapback and Arcane Bolt;
  5. the DoT and Regen percentages;
  6. each per-item fix.

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

**The simulator and the CI test**

- **The floor-5 window is not the session.** `reachedFloor5InSession` is read at
  `FIRST_SESSION_RUNS` (10). ASSUMPTION 126 moves the threshold to 20 floor runs, but T3's session
  stays 10.
  - Add a separate named constant for the window, and don't change `FIRST_SESSION_RUNS`.
  - Rename the field and fix the header comment and the `Thresholds` doc comment that say 10.
- **The CI threshold test (ASSUMPTION 148).**
  - It runs in `npm run test` over the full 40 seeds per spec, with the run cap at 30 and the boss
    probe off. It asserts the three verdicts, never a value (ASSUMPTION 106 stays true for every
    other test).
  - The cap must change nothing about runs 1–30: show it with a test that the capped run's first
    30 floor runs equal an uncapped run's, on the smoke seeds.
  - Measure the suite's runtime with and without the test, and **stop and ask** if the test adds
    more than about 2 minutes.
- **The report additions are new report code**: the floor 1–5 matchup table, and the first-try
  clear rate per floor. Test them like H1's report, on hand-built seed results.

**Tuning**

- **The DoT percentages and level scaling.** A tick is `potency − 0.2 × Defence`, with a minimum of
  1.
  - The applier's stat and the bearer's Defence scale by the same level factor, so a percentage
    that clears `0.2 × Defence` at equal levels clears it at every equal level.
  - The gap that matters is the level difference (enemies sit above the party), and stats that
    differ by role.
  - The plan shows the arithmetic for its proposed percentages: a typical applier stat against a
    typical Defence, at the floor 1, 5, 10 and 30 levels, on both sides. Then it shows the
    minimum-1 share of corpus ticks before and after.
- **Per-item fixes are content numbers, chosen from the report.**
  - Each fix names the matchup-table row it answers.
  - A fix changes one content item's number (a factor, a percentage), or how often it fires
    through an existing trigger condition.
  - **Stop and ask** before:
    - any new engine mechanism, rule change or global cap;
    - changing any number ASSUMPTIONS 117–125 decided;
    - giving up on the 80% floor-1 threshold for a spec.

    Each is a "bring it back to design" signal.
- **Rallying Cry and the Flare: measure first.**
  - Under `warden` the Stonehorn Warden Provokes only when an ally is below 50% HP, so Rallying
    Cry should stack far less than under `taunter`. Measure before you propose anything; ASSUMPTION
    123 keeps Rallying Cry unchanged unless the report shows otherwise.
  - The Flare's compounding Speed (×1.15 per Wick burn) is the same case: report its largest stack
    before you propose a per-item fix.

**Pinning and the docs**

- **Pinning holds today's number, not the tuned one**, and only the number. Spread the real def
  (`{ ...POISON, potency: { ...POISON.potency, percent: 20 } }`) under the same id in the
  golden's own registry, so the status's shape and effects are still the real ones.
  - Where a golden reads a tuned number that never fires in its fight (Snapback in
    `golden-h2b2-tick-no-retaliation`), say whether it needs a pin.
- **The content docs are the design agent's.** List every content change under the report's
  **Content changes**: the Health table, the starter, Snapback, Arcane Bolt, each potency, and each
  per-item fix with its old and new number. The design agent folds the "(4.1-H2c)" items and
  GAME_DESIGN's open numbers from the code at the PR review.

## Must stay green

- All five gates: `npm run test` (now including the threshold test), `npm run lint`,
  `npm run format:check`, `npm run build`, `npx tsc -b`.
- Every mechanism golden's expected values, compared by importing the fixtures, including the 14
  that get pinned.
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
- **The threshold test:**
  - it is green;
  - it fails on the "before" data (on H1's report the Shieldbarer's first-try floor 1 was far
    below 80%), shown by running it against the pre-H2c numbers;
  - the capped/uncapped prefix test;
  - its measured runtime.
- **The curve:** a test pinning `enemyLevelRange` for floors 1–10, 20 and 30, and `bossLevel` for
  floors 10, 20 and 30 against ASSUMPTIONS 118 and 119. It fails with `Math.round` restored and
  with the offset at 3.
- **The Health remap:** the old → new table for every creature, computed by the script; a test
  that every non-Flickerling creature's Health is in 20–45; and the Flickerlings unchanged.
- **The goldens:**
  - the mechanism goldens' expected exports equal to `main`'s by import comparison, and each
    pinned file's diff shown to be setup-only;
  - each re-derived content golden listed with its cause and its new arithmetic;
  - each new content golden failing with its number reverted.
- **The digest:** regenerated once, every changed fight attributed to its first stage, counts per
  stage.
- **Per-item fixes:** each with the matchup-table row it answers, before and after.
- **Housekeeping:**
  - the test count reconciled file by file against `main`;
  - **Spec questions** and **Content changes**;
  - anything to delete.

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
