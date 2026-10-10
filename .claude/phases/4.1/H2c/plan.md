# Plan — Phase 4.1 — Slice H2c: the first tuning pass (ships only the decided numbers)

Written against the amended `kickoff.md`, `brief.md`, `plan-review.md` round 1, ASSUMPTIONS 113,
117–129, 147, 148, 149 and the code on `phase-4.1-slice-h2c`. Nothing has been run or edited. Plan-local
assumptions are **P1…P34** (the brief's own numbers go to 150); each is marked inline and collected,
with its status, in the checklist at the end.

## Revision 1: what changed

Round 1 plus Duncan's decision (ASSUMPTION 149: **this slice chooses no balance number**; DoT
percentages, per-item fixes and the CI threshold test move to **4.1-H2d**).

- **Removed:** the DoT stage and its arithmetic table, the stage-5/6 digest attribution, the per-item
  fixes (levers, stop conditions), the Rallying Cry/Flare fix clauses, the CI threshold test and its
  capped-prefix test, all DoT pins (17 files), the DoT content goldens, Regen. Withdrawn
  assumptions: P3, P9, P11, P13–P19. P24 is replaced by P29.
- **Added:** the three-set DoT **measurement** (scratch, nothing committed); the integration-test
  change through the curve (fix 3); the header corrections to four goldens; the corrected Arcane Bolt
  file (`data/spells/overgrowth.ts:121`, **not** `core.ts:22`, which is Ember Lance); the enemy Wit
  casters that also carry Arcane Bolt in stage 4 (fix 2); stages as cumulative patches (fix 4);
  the matchup table keyed by (floor, template) with floor 1 printed alone (fix 8); the completed
  predicted set (fix 6); the Health script's `baseStats: { health: N` match (fix 12); the Warden's exact
  `baseStats` assertion (fix 10).
- **Corrected:** P8 (floor dimension), P10 (**no Snapback pin** in `golden-h2b2-tick-no-retaliation`).
- **Dropped as redundant:** the new Warden behavioural test (fix 11): `roles.test.ts` fails under
  `taunter`, and `scripts.test.ts`'s `warden` block already pins the rules.
- **Kept as written:** the curve and its table, the Health remap, the Warden, Snapback and Arcane Bolt
  numbers, the simulator window and the two report additions.

## Scope in one paragraph

Ship ASSUMPTIONS 118 (width 0, minimum rounded down), 119 (boss offset 5), 123 (Warden Attack 15,
`warden`), 124 (Snapback 30%, Arcane Bolt 1.0), 125 (Health 20–45), 126 (floor-5 window 20) and 127 (the
matchup table and first-try per floor), plus the before/after report and the DoT measurements for the
H2d grill. DoT/Regen percentages stay `Poison 20 / Burn 25 / Regen 10 / Spore 15`; no per-item fix; no
threshold test (the report prints the three verdicts and values, it asserts nothing).

## Step 0 — before anything is edited

- `npm ci`; compare `node --version` and tool versions with `package-lock.json`.
- **Capture "before"**: `npm run sim > .claude/phases/4.1/H2c/sim-before.txt` on the unchanged tree
  (about 14 min, background). It has no matchup table or per-floor first-try rate (new report code), so
  a second pass with the **new report code on the old numbers** (scratch clone, below) gives
  `sim-before-extended.txt` for those two tables only (**P4**).
- Save the corpus digest of the unchanged tree for attribution (stage 0).

## Scratch tooling (outside the repo; nothing committed)

A `git clone` of the branch outside the repo (`<scratchpad>/h2c-clone`, `npm ci`). Stages are
**cumulative patches** on the previous one (`starters.ts` carries stages 2 and 3), and each stage's
`git diff` against the previous is checked to be exactly that stage's change (**P33**).

| Stage | Cumulative change |
|---|---|
| 0 | `main` |
| 1 | the curve: `curves.ts` (`Math.floor`), `balance.ts` (`base` 0, `bossLevelOffset` 5) |
| 2 | the Health remap |
| 3 | the Stonehorn Warden (Attack 15, `warden`) |
| 4 | Snapback 0.3 and Arcane Bolt 1.0 (Arcane Bolt is also a biome-1 Wit gem: about 3 in 4 enemy Wit casters carry it, so stage 4 moves those enemy fights too) |

Per stage the clone runs `npm run corpus:update` into a per-stage digest copy; a scratch script compares
fight by fight and attributes each changed fight to the **first** stage whose log differs. The repo's
digest is regenerated once at the end with `npm run corpus:update` (**P21**). The same clone, with the
final simulator and the old numbers, produces `sim-before-extended.txt`.

## Approach and module changes, by file

### Config and curve

- `src/engine/curves.ts` — `scaledMinLevel`: `Math.round` → `Math.floor` in **both** branches; one
  rule, no config field (**P5**). Fix the doc comment (ASSUMPTION 4's "SINGLE Math.round") and the
  `bossLevel` comment ("Default offset 3").
- `src/data/balance.ts` — `levelRangeWidth.base` 0; `bossLevelOffset` 5; header comment (H2d tunes the rest).
- `src/engine/__fixtures__/balance.ts` — **untouched**: its flat ×1.00 multiplier makes the minimum an
  exact integer, so `floor` equals `round`; it keeps `base: 2`, offset 3.

Expected curve (hand-derived `floor × (99a + (b−a)(floor−1)) / 9900`, a = 125, b = 200; above 100
`floor × (b + (floor−100)) / 100`):

| floor | raw min | new `{min,max}` | old | new boss | old boss |
|---|---|---|---|---|---|
| 1 | 1.250 | 1–1 | 1–3 | 6 | 6 |
| 2 | 2.515 | 2–2 | 3–5 | 7 | 8 |
| 3 | 3.795 | 3–3 | 4–6 | 8 | 9 |
| 4 | 5.091 | 5–5 | 5–7 | 10 | 10 |
| 5 | 6.402 | 6–6 | 6–8 | 11 | 11 |
| 6 | 7.727 | 7–7 | 8–10 | 12 | 13 |
| 7 | 9.068 | 9–9 | 9–11 | 14 | 14 |
| 8 | 10.424 | 10–10 | 10–12 | 15 | 15 |
| 9 | 11.795 | 11–11 | 12–14 | 16 | 17 |
| 10 | 13.182 | 13–14 | 13–16 | **19** | 19 |
| 20 | 27.879 | 27–29 | 28–32 | **34** | 35 |
| 30 | 44.091 | 44–47 | 44–49 | **52** | 52 |
| 108 | 224.640 | 224–234 | 225–237 | 239 | 240 |

Floors 2, 3, 6, 9 (≤ 100 branch) and 108 (> 100 branch) are where `round` ≠ `floor`; floors 10/20/30 pin
the boss offset (17 / 32 / 50 at offset 3).

### Content data

- **Health remap**: one-time script `.claude/phases/4.1/H2c/health-remap.mjs` (in the mailbox) rewrites
  `baseStats: { health: N` (that exact pattern only, so no trait's `stat: 'health'` modifier can be
  touched; **P20**) in `src/data/species/{overgrowth,glimmerdark,rotcap-hollow,starters}.ts` with
  `floor(20 + (old − 10) × 1.25 + 0.5)`. It **skips the three Flickerlings by creature id** (their 25 and
  28 are values other creatures also hold) and writes `health-remap-table.md` (every creature, old → new).
  By hand: 14 → 25, 16 → 28, 18 → 30, 20 → 33, 22 → 35, 24 → 38, 25 → 39, 26 → 40, 28 → 43, 30 → 45;
  every old value in the data is 14–30, so all results are in 20–45; 58 creatures change (61 `baseStats`
  minus three). Fixtures and in-test creatures are not touched.
- `src/data/species/starters.ts` — Stonehorn Warden: `attack` 10 → 15, `defaultScriptId` `'taunter'` →
  `'warden'` (Health 25 → 39 from the remap). Fix the stale comments.
- `src/data/traits/overgrowth.ts` — `SNAPJAW_JAWS_TRAIT.spellPower` 0.6 → 0.3; comment ("(0.3)" now
  equals the generic Retaliate, it's no longer "bigger").
- `src/data/spells/overgrowth.ts:121` — **Arcane Bolt** `spellPower` 0.5 → 1.0 (read the file to confirm
  the entry is Arcane Bolt before editing; `core.ts:22` is Ember Lance and stays at 0.5).
- `src/data/statuses.ts`, `glimmerdark.ts`: **no change**. (Their "placeholder, H2c tunes them" comments
  are the design agent's to repoint to H2d at the PR review; I list them under Spec questions.)

### Simulator (`src/state/balance-sim.ts`)

- **Floor-5 window.** New `FLOOR5_WINDOW_RUNS = 20`; `FIRST_SESSION_RUNS` stays 10 (T3's party size,
  `deepestAfterSession`). Rename `SeedResult.reachedFloor5InSession` → `reachedFloor5InWindow` and
  `Thresholds.seedsReachingFloor5InSession` → `seedsReachingFloor5InWindow`; fix the header comment (also
  "the CI threshold test is H2's" → H2d's), both doc comments, and the printed line ("first 20 floor
  runs"). `runSeed` reads the flag from the finished `runs`
  (`runs.slice(0, FLOOR5_WINDOW_RUNS).some(r => r.floor >= SESSION_TARGET_FLOOR)`), so a capped test run
  stops with the right value (**P6**).
- **Matchup table (127).** `FightMetrics.enemyTemplateIds: readonly string[]` = the distinct template ids
  of the enemy creatures (`firstRoundEnemyIds` with the `-enemy-<slot>` suffix stripped; **P7**).
  `SeedResult.earlyFights: readonly { floor, enemyTemplateIds, result, capDraw }[]` for floors 1–5
  (`MATCHUP_MAX_FLOOR = 5`; **P23**). Pure `buildMatchupRows(results)`, rows keyed by **(floor, template)**:
  fights, wins, losses, round-cap draws, other draws; a fight counts once for each distinct template in it,
  with the fight's result (a row is "fights containing this creature"; floors 2–5 share fights between
  templates, floor 1 has one enemy so its rows attribute exactly; **P8**). `formatSpec` prints floor 1 on
  its own, then floors 2–5.
- **First-try clear per floor (127).** Pure `buildFirstTryRows(results, frontier)` from `RunRecord[]`: for
  each floor, over the seeds that ran it, the share whose **first run on that floor** cleared. No new
  `SeedResult` field.
- `SpecReport` gains `matchups` and `firstTryByFloor`. `computeThresholds` keeps its verdict logic.
- **No CI threshold test** (H2d).

### Tests

- `engine/curves.test.ts` — default-config tests re-derived from the table; placeholder-config tests untouched
  (**they prove the placeholder config doesn't move through the curve**).
- `data/species/*.test.ts` — range: Health 20–45 for every creature except the Flickerlings (their
  `[38, 25, 28]` guard stays), other stats 10–30; titles fixed.
- `data/species/starters.test.ts` — the Warden's exact `baseStats` (`{ health: 39, attack: 15,
  intelligence: 10, defence: 30, speed: 10 }`) and `defaultScriptId` `'warden'`; no "stat total" assertion (it
  holds only on the old Health scale; after the remap the starters total 103 / 103 / 104).
- `data/roles.test.ts` — `'shieldbarer-starter': 'warden'`; stale comment at line 128.
- `data/scripts.test.ts:306` — comment only (the taunter≡always-provoke test compares two scripts on one
  creature and stays valid; "its two real users" is no longer true).
- `state/balance-sim.test.ts` — renames, new tests (below).
- `state/integration.test.ts` — see the predicted set.

## Golden policy (restated from the kickoff)

**Deliberate, listed**, ASSUMPTION 147.
- **Mechanism goldens: expected values byte-identical; one pin.** `golden-g1-leech-sovereign-pacified`
  materializes the real `LEECH_SOVEREIGN` at level 1, so its Health (30 → 45) moves. Its subject is a rule
  (a Pacified striker casts), so it is a mechanism golden: its fixture spreads the real creature and holds
  only `baseStats.health` at 30 (`{ ...LEECH_SOVEREIGN, baseStats: { ...LEECH_SOVEREIGN.baseStats,
  health: 30 } }`), a setup-only edit; the header says Health is held at the pre-H2c value (**P1, P22**).
  **Shown**: (a) import comparison of `main`'s and the branch's fixture, every `expected*` export, `TURN_STEPS`
  and `EXPECTED_DRAWS` deep-equal; (b) with the pin removed the golden **fails** (the pin is needed; if it
  somehow passes, the pin is dropped and the file stays byte-identical; **P14**). Every other mechanism
  golden stays byte-identical as a file.
- `golden-h2b2-tick-no-retaliation` holds Snapback but never evaluates it: **no pin** (**P10** corrected:
  if a tick ever offered a triggering source, Snapback would log `TriggerFired` at any power, so the golden
  fails either way).
- **Content goldens follow the data, re-derived by hand** (setup, arithmetic and draws in comments; none
  regenerated by running): `golden-sorcerer-starter`, `golden-resonant-overtone`, `golden-resonant-harmonize`,
  all Arcane Bolt 0.5 → 1.0, each failing with Arcane Bolt at 0.5. Each is listed in the report with its
  cause and new arithmetic. Setups are kept so the bolt's damage stays above the floor of 1 (otherwise a
  revert would not change the log).
- **New content golden:** `golden-h2c-snapback` (below).
- **Header corrections** (comment-only, allowed by CONVENTIONS; I list each file and show old vs new
  identical with comments stripped): `golden-rot-sovereign`, `golden-spore-spread`,
  `golden-sporch-cinderlord-burn-refresh`, `golden-hollowkin-wretch-self-dot` say "real base stats" but copy
  the old Health; the header names which stats are real and says Health is the pre-H2c value (**P32**).
- **Store and integration tests** change through content (Health, starter, Snapback, Arcane Bolt) and, in one
  place, through the curve; each changed expectation is listed with its cause.
- **Corpus digest**: regenerated once; fights attributed to stages 1–4 with counts per stage.

### New golden: `golden-h2c-snapback` (hand-derived, real data)

Real `SNAPJAW_JAWS_TRAIT` on a fixture bearer (**P26**): bearer E (enemy, Endurance, Attack 40, Defence 0,
Health 1000, `always-wait`); attacker P (player, Endurance so affinity is ×1.00, Attack 20, Defence 10,
Health 100, `always-attack`, faster than E). Snapback is an `on-damage-taken` `deal-damage` to
`triggering-source`, `offStat attack`, `spellPower 0.3`, **indirect** (H2a): magnitude `40 × 0.3 = 12`, no
chip, no dealt pool, `MAX(1, floor(12 × 1.00 × 1 × 1 − 0.2 × 10)) = floor(12 − 2) = 10`. At 0.6 it is
`floor(24 − 2) = 22`, so a revert changes the log, and 10 is well above the minimum of 1. P's own hit on E
(20 − 0 + chip = 20, no Additional beyond the level-1 cap, derived in the comments) is the trigger.
Expected events written by hand from the arithmetic; the golden asserts the `DamageDealt` presence
with amount 10 and P's remaining HP 90 (presence, never absence).

## Mechanisms and the test that fails with each removed (every site)

| Mechanism | Sites | Test that fails with it removed |
|---|---|---|
| Rounded-down minimum | `scaledMinLevel` ≤ 100 branch; > 100 branch | `curves.test.ts` pins `enemyLevelRange` for floors 1–10, 20, 30 (floors 2, 3, 6, 9 fail with `Math.round`) and floor 108 (fails when only the > 100 branch is `round`); each branch mutated separately in the clone, failing test named in the report |
| Width base 0 | `balance.ts` | the same table (floor 1 `{1,1}`; fails at 2) |
| Boss offset 5 | `balance.ts` | `bossLevel` at floors 10 / 20 / 30 = 19 / 34 / 52 (fails at 3) |
| Placeholder config unmoved | `__fixtures__/balance.ts` | the existing placeholder curve tests stay green, untouched |
| Health remap | 58 creatures, 4 files | the range test per species file (Health 20–45; fails on any un-remapped value such as 14); the Flickerling guard fails if the script remapped them; the Sovereign golden fails without its pin |
| Warden starter | `starters.ts` Attack and role | `starters.test.ts` (exact `baseStats`, role), `roles.test.ts` (`warden`; fails under `taunter`) |
| Snapback 0.3 | `overgrowth.ts` | `golden-h2c-snapback` (fails at 0.6) |
| Arcane Bolt 1.0 | `spells/overgrowth.ts` | the three re-derived goldens (each fails at 0.5) |
| Floor-5 window 20 | `runSeed`, `computeThresholds` | hand-built `SeedResult`s: floor 5 on run 15 counts, on run 21 does not (fails at 10); `partySizeAfterSession` still read at run 10 (fails if `FIRST_SESSION_RUNS` changed); a capped test run (cap < 20) gets the right flag |
| Matchup table | `enemyTemplateIds`, `earlyFights`, `buildMatchupRows`, the printer | hand-built events through `analyzeFight` (template ids, duplicate template counted once); hand-built results (per (floor, template) counts, floors > 5 excluded, cap vs other draws, floor 1 printed alone); fails if any is removed |
| First-try per floor | `buildFirstTryRows`, the printer | hand-built `RunRecord`s (failed first run then clear = miss; farm-before-push order; a floor never run is absent); formatter test |
| Sovereign pin | the fixture | the golden fails with the pin removed |

## Predicted changed set (before anything runs)

- **Goldens:** 1 pinned (setup-only); 3 re-derived; 1 new; 4 comment-only header corrections. **Every
  other golden file is byte-identical.** The DoT goldens are untouched (their percentages don't move).
- **Unit/data tests:** `curves.test.ts`, `species/*.test.ts`, `starters.test.ts`, `roles.test.ts`,
  `balance-sim.test.ts` (changes); comment-only: `scripts.test.ts`, `store.test.ts` ("adds the Unicorn on a
  win": the real Unicorn is now 39 HP; HERO still wins, hitting 35 core plus the Additional and acting
  again, and the test asserts only `win`, so I predict a stale "25-HP target" comment, not a changed
  expectation), `status-timing.test.ts:750` (a self-Poisoned seer at 3 HP; its "3% tick of 100 max HP"
  comment is stale: Poison is the 20%-of-Attack snapshot). Verified green, structural: `combat.test.ts`
  (lines 117, 245: the Sorcerer trait grants Arcane Bolt).
- **`state/integration.test.ts`**: the "Phase 4.1-A defaults" block uses `createGameStore()` (default
  config), pins floor 1 at ten Brute wins, and floor 1's enemy range goes 1–3 → 1–1 at stage 1. It is
  generated-then-checkpoint-verified: regenerate it once, attribute each change to its first stage, keep
  its checkpoints (**P25**). The CFG-pinned floor-1 run also moves through content (Health, Warden, Snapback,
  Arcane Bolt), and its Snapjaw Jaws assertion (line 178, "retaliates for 60% of its Attack" comment) gets a
  30% comment and must still see Snapback fire (`triggersFor > 0`); every change is listed with its cause.
  `store-gems`, `store-hub`, `store-newgame` descents assert relations (equal events, `ok`): checked,
  expected green.
- **Corpus digest**: nearly every fight changes at stage 1 (enemy levels); counts per stage 1–4 in the
  report. `corpus-coverage.test.ts` must stay green with no stale exemption (checked at each stage).
- **Counts:** test count reconciled file by file against `main` (`vitest --reporter=json` on both trees).

## Health readers (what the remap moves; for the stage-2 attribution)

Max HP; the Additional's cap `min(floor(0.2 × target maxHP), 10 − (level−1))` (`engine/damage.ts`,
`config.ts`: a level-1 hit on a typical Health-16 target had cap 3, on its remapped 28 it is 5); Regen's
potency (10% of the **healer's** Health, `statuses.ts:74`, rises 50–80% with no number change); the Wick's
burn (10% of its own Health, `glimmerdark.ts:42`) and heal (20%, `:52`), both on Flickerlings, which don't
move; Health-percent HP conditions (integer cross-multiplication on max HP); the Unicorn's revive HP. Trait
`stat: 'health'` modifiers (`glimmerdark.ts:331,341`, `overgrowth.ts:150,192`, `rotcap-hollow.ts:146`) are
multiplicative on whatever the Health is. The h2b1 goldens use the real Flickerlings (unchanged), so they
don't move; the Sovereign golden does and is pinned.

## The DoT measurements for the H2d grill (ASSUMPTION 149; evidence only, nothing committed)

In the scratch clone on the **final "after" data** (stages 1–4), run `buildReport({ seeds: SIM_SEEDS,
probeBosses: false })` (cap 400, 40 seeds, three specs) for three DoT sets, edited **in the clone only**:

| Set | Poison | Burn | Spore | Regen |
|---|---|---|---|---|
| today | 20 | 25 | 15 | 10 |
| B-low | 35 | 30 | 30 | 10 |
| B-high | 50 | 40 | 45 | 10 |

Per set and spec: first-try clear on floors 21–30, T4 (stop reasons, walls, deepest floors), the Rot
Sovereign's attrition row, round-cap draw rate, the three verdicts and values. Per set, the **share of DoT
ticks that land on the minimum of 1** on the corpus's generated fights, **Parts A and B** (fights 0–299
and 300–499), with **Part C** (index 500 onward, the coverage fights) reported apart: a "tick" is a
`DamageDealt` with `damageSource: 'dot'` and "on the minimum" is amount 1, the way the H2b2 review scanned
(4,971 of 5,318) (**P27**). The "today" set doubles as the stage-4 report, so it is also the "after" report.
The policy runs don't depend on the probe (the probe is rolled back; H1's policy-only comparison test
asserts it), so the probe-off "after" equals the full report apart from its boss-probe columns, and the full
probe-on `npm run sim` is run once on the final tree for the PR (**P29**). No recommendation is made.

## Report content (the PR and the phase record)

Every band T1–T5, the three verdicts and values, round-cap draw rates, largest stacks, boss rows, the
floor 1–5 matchup table and first-try per floor, before (unchanged tree; extended pass for the new tables)
and after. **Rallying Cry and the Flare:** report the largest Rallying Cry stack (player side) and the
Flare's largest stack, before and after (from `largestStacks` attributed by trait id) and the round-cap
draw rate; propose nothing (**P30**; any change to Rallying Cry is a stop-and-ask anyway, ASSUMPTION 123).
**Spec questions:** the Sovereign case (CONVENTIONS' rule names "a real status, spell or trait"; it should
say "or creature": the design agent folds it), the "placeholder, H2c tunes" comments in `statuses.ts` and
the content docs, and anything else that surfaces. **Content changes:** the Health table, the Warden,
Snapback 0.6 → 0.3, Arcane Bolt 0.5 → 1.0. **To delete:** none (scratch lives outside the repo; the
mailbox files I add are `sim-before*.txt`, `sim-after*.txt`, the Health script and table).

## Gates

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`; the Sovereign
import comparison; the determinism, double-resolve and deep-frozen tests; `corpus-coverage.test.ts`.

## Assumptions checklist

Active:
- **P1** `golden-g1-leech-sovereign-pacified` is a mechanism golden and is pinned (Health 30). *(confirmed round 1)*
- **P2** `golden-h2b2-vulnerability-once` reads nothing tuned; untouched (and the DoT goldens wait for H2d).
- **P4** `sim-before.txt` is the unmodified `main` report; the two new tables for "before" come from a second pass with the new report code on the old numbers in the scratch clone.
- **P5** One `Math.floor` in both branches of `scaledMinLevel`; no rounding-mode config field.
- **P6** The floor-5 flag is computed from the finished `runs` at a window of 20; `FIRST_SESSION_RUNS` stays 10.
- **P7** Matchup keys are distinct enemy template ids (the `-enemy-<slot>` suffix stripped).
- **P8** *(corrected)* Rows are keyed by (floor, template); a row counts a fight once per distinct template in it with the fight's result; floors 1–5; floor 1 printed alone.
- **P10** *(corrected)* `golden-h2b2-tick-no-retaliation` is **not** pinned for Snapback.
- **P12** Any unit test that fails because it borrowed a tuned number would be pinned in setup (none is predicted; only the Sovereign golden).
- **P14** The Sovereign pin is shown needed: the golden fails with it removed (else it is dropped).
- **P20** The Health script matches `baseStats: { health: N` only, skips the Flickerlings by creature id, and lives with its table in the mailbox.
- **P21** Stage attribution runs in a scratch clone outside the repo as cumulative patches (stages 1–4), per-stage digests via `npm run corpus:update`; the repo digest is regenerated once at the end.
- **P22** The Sovereign pin is written inline in its fixture.
- **P23** `earlyFights` covers floors 1–5 only (`MATCHUP_MAX_FLOOR = 5`).
- **P25** `integration.test.ts`'s "Phase 4.1-A defaults" block is regenerated once as generated-then-checkpoint-verified; changes attributed to their first stage.
- **P26** `golden-h2c-snapback` uses fixture bearer/attacker with the numbers above (Attack 40 → magnitude 12; attacker Defence 10 → 10 damage, 22 at 0.6); the exact expected events are hand-written at build and may adjust the setup numbers, not the mechanism.
- **P27** A DoT tick is a `DamageDealt` with `damageSource: 'dot'`; "on the minimum of 1" is amount 1 (as the H2b2 review scanned); Parts A (0–299) and B (300–499) vs Part C (500+).
- **P29** DoT measurements run probe-off at cap 400 on 40 seeds; probe-off policy runs equal probe-on ones, and the PR's full probe-on report is run once on the final tree.
- **P30** Rallying Cry and the Flare are measured and reported (largest stack, draw rate, before/after); nothing is proposed.
- **P32** The four "real base stats" header corrections are comment-only; each shown identical to the old file with comments stripped.
- **P33** Each scratch stage's diff against the previous stage is checked to be exactly that stage's change.
- **P34** Stale-comment fixes in `store.test.ts`, `status-timing.test.ts`, `scripts.test.ts`, `roles.test.ts`, `curves.ts`, `balance.ts` are comment-only; the integration test's changes are as P25.

Withdrawn by the round-1 decisions: **P3, P9, P11, P13, P15, P16, P17, P18, P19, P24** (their subjects
moved to H2d or are replaced by P29/P30), **P22**'s DoT-pin half.
