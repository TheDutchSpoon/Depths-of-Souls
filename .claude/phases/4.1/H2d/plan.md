# Plan — Phase 4.1 — Slice H2d: the balancing pass

I implement the numbers the H2d grill chose (ASSUMPTIONS 150–152) and the simulator and CI work around
them (153, 155, 148). I choose no balance number (ASSUMPTION 149). If any measurement below moves a
verdict the other way, or differs materially from the kickoff's "what the grill measured", I stop and
report instead of tuning.

Nothing has been edited in the repo. What I did before writing this plan (the kickoff asks for the
mutation table in the plan): a **scratch copy outside the repo** (`<scratchpad>/mut`, `node_modules`
junctioned), each tuned value applied alone and then all five together, the full suite run each time
(1,333 tests, as on `main`), the failing tests read from vitest's JSON. Nothing of that is committed.

## What reading the code changed against the kickoff

1. **`golden-h2b2-tick-no-retaliation` needs a Poison pin, not only a comment fix.** The kickoff says
   it "holds Snapback but never evaluates it", which is true, but its tick is the real Poison at 20%
   (header: tick 16). It fails under Poison 40%. It gets the pin *and* the "60% since 4.1-H2d" comment fix.
2. **`status-snapshot.test.ts` (6 tests) reads the real Poison percentage** (it builds its world from
   `STATUS_REGISTRY` and asserts snapshot potencies 10 and 4). It is a unit test of a rule
   (single-instance, stronger-snapshot, pass-on), not a golden, but ASSUMPTION 147's reasoning applies
   unchanged, so I pin it the same way and leave its expected values byte-identical (P3).
3. **Burn's percentage is read by no mechanism golden at all.** Under Burn 35% the only failures are
   `statuses.test.ts` and the digest. So Burn has nothing to pin; its changed number is shown only by the
   new content golden (P5). `golden-sporch-cinderlord-burn-refresh` passes unchanged (the snapshots it
   mentions never show in its events) but its header does the arithmetic at 25%: comment fix.
4. **Four goldens the kickoff and ASSUMPTION 147 name do not read any moved number** and need nothing:
   `golden-spore-spread-filter`, `golden-spore-spread-fizzle`, `golden-rot-sovereign`,
   `golden-sporch-cinderlord-burn-refresh` (comment only, above). `golden-h2b2-regen-potency` and
   `golden-h2b2-vulnerability-once` pass (Regen is not moved).
5. **No engine change is needed for Pollen Cloud** (stop condition in the kickoff). Evidence: with the
   damage effect removed the full suite fails only the corpus digest. By reading: `executeCastAoe` /
   `executeSpellEffects` walk `spell.effects` generically (`actions.ts:577`, `:631`); the pre-hit fizzle
   (B5) is on the target's liveness, not on a damage effect (`actions.ts:638`); `dedupKey` already has a
   status-only path (`wit|aoe|status:sleep`, no collision); the spell validator (`effect-types.ts:1091`)
   iterates effects; no simulator reader walks a spell's effects (`grep spell.effects` finds only the
   engine). If building shows otherwise I stop and ask.

## The mutation table (done; re-run at build with the pins in)

Scratch copy, one change at a time (the combined run fails exactly the union):

| Moved alone | Failing tests (besides `corpus-digest`, which every one fails) |
|---|---|
| Poison 20 → 40 | `statuses.test.ts` (potency pin); `status-snapshot.test.ts` (6); goldens: `dot`, `f2-dot-one-turn`, `h2b2-reapply`, `h2b2-tick-dead-applier`, `h2b2-tick-kill-on-death`, `h2b2-tick-living-applier`, `h2b2-tick-no-retaliation`, `h2b2-tick-self-applied`, `h2b2-tick-taken-factors`, `hollowkin-wretch-self-dot`, `turn-end-dot-kill-burst`, `turn-end-dot-kill-burst-refresh` |
| Burn 25 → 35 | `statuses.test.ts` only |
| Spore 15 → 35 | `statuses.test.ts`; goldens: `f2-turn-end-interaction`, `h2b2-carrier-fresh`, `h2b2-spore-spread`, `spore-spread-dot-kill` |
| Snapback 0.3 → 0.6 | `golden-h2c-snapback`; `state/integration.test.ts` "Slice I … descends floor 1" (the revive count, line 204: `expected [] to have a length of 1`, so 1 → 0) |
| Pollen Cloud's damage removed | nothing but the digest |

**Classification by subject (CONVENTIONS "Mechanism goldens vs content goldens").** All 16 DoT goldens
above are **mechanism goldens**: DoT lifecycle, re-application, tick source / dead applier / living
applier / self-applied, taken factors, no-retaliation, tick-kill spread, carrier-fresh snapshot, Spore
spreading, and (ASSUMPTION 147's correction) `hollowkin-wretch-self-dot` and the `turn-end-dot-kill-burst`
pair, whose subjects are rules on a real creature. None is a content golden, so none is re-derived; all
16 are pinned. The content goldens are `golden-h2c-snapback` (re-derived) and the two new ones below.

## Approach and module changes, by file

### Content data (ASSUMPTIONS 150–152)

- `data/spells/overgrowth.ts`: `POLLEN_CLOUD.effects` loses its `deal-damage`; what remains is the
  `apply-status` of Sleep, duration 2, on `cast-target`. Still `aoe`, `targetSide: 'enemy'`, Wit,
  biome 1. The doc comment changes from "AOE + upside -> ~30-40% band" to "a control spell with no
  damage, like Pacify and Silence (4.1-H2d, ASSUMPTION 150)".
- `data/traits/overgrowth.ts`: `SNAPJAW_JAWS_TRAIT` `spellPower: 0.3` → `0.6`; the doc comment gets the
  history (60%, 30% in H2c, 60% from 4.1-H2d, ASSUMPTION 151).
- `data/statuses.ts`: `POISON` 20 → 40, `BURN` 25 → 35, `SPORE` 15 → 35, `REGEN` stays 10. The header
  ("The percentages are PLACEHOLDERS (4.1-H2b2); 4.1-H2d tunes them") and the four potency notes
  (POISON, BURN, REGEN, SPORE doc comments) lose "placeholder" and say "decided at the 4.1-H2d grill
  (ASSUMPTION 152)". The "placeholder" in `BURN`'s default-duration comment (line 64) is about the
  duration, not the potency, and stays.

### Simulator (`state/balance-sim.ts`) (ASSUMPTION 153)

New named constants (band parameters, like `SESSION_TARGET_FLOOR`; not balance numbers):
`SOUL_BY_FLOOR = 3`, `FULL_PARTY_BY_FLOOR = 6`.

New pure, exported helpers:

- `type FloorRead = 'met' | 'missed' | 'did-not-reach'`
- `firstRunOnFloor(runs, floor): RunRecord | null`: the first run whose `floor === floor`.
- `soulBySeedFloor(seed: Pick<SeedResult, 'runs' | 'runsToFirstSoul'>, floor): FloorRead`: no run on the
  floor → `'did-not-reach'`; else `'met'` iff `runsToFirstSoul !== null && runsToFirstSoul < run.index`,
  else `'missed'`. (`runsToFirstSoul` is the run count *after* the run in which the soul completed, so
  `< run.index` means "completed at the end of an earlier run": a soul completing during the floor-3 run
  itself, `runsToFirstSoul === run.index`, does not count.) No new `RunRecord` field (P8).
- `fullPartyBySeedFloor(seed: Pick<SeedResult, 'runs'>, floor): FloorRead`: `run.partyLevels.length >=
  PARTY_SIZE` at that first run (P9).
- `tallyReads(reads): { met: number; reached: number; didNotReach: number }` (`reached = met + missed`).

`SpecReport`: `t2` keeps `clearsToFirstSoul`, `runsToFirstSoul`, `seedsWithoutSoul` (the first-soul
median in floor runs stays in the report, it is ASSUMPTION 22's threshold) and gains `atFloor3`;
`t3` becomes `{ atFloor6 }` (the party-size histogram `partySizeCounts` goes: nothing but the old T3
line printed it). Both tallies are built in `buildSpecReport` from `results` (P11). `SeedResult` gains
no field. The printer's T2 line becomes `T2 a soul completed by the first run on floor 3 (ceiling:
sooner is fine): met X / Y (didn't reach N); first soul (ASSUMPTION 22): …` followed by the existing
first-soul text unchanged; the T3 line becomes `T3 a full party of 6 by the first run on floor 6
(ceiling): met X / Y (didn't reach N)`. Every other report line is untouched.

`FIRST_SESSION_RUNS` **stays**: `runSeed` still records `partySizeAfterSession` and `deepestAfterSession`
at it and tests use it as a run cap (`balance-sim.test.ts:134,169,1050`, `balance-sim-report.test.ts:91`).
`FLOOR5_WINDOW_RUNS` is unchanged; its comment ("T3's party size is still read after FIRST_SESSION_RUNS")
is refreshed. The file header ("It REPORTS; it asserts nothing (the CI threshold test is 4.1-H2d's)") and
the threshold paragraph are updated; the bands are still reported, never asserted (P12).

### The CI threshold test (ASSUMPTIONS 148, 155)

Three new files, one per spec, so Vitest runs them in parallel:
`state/balance-ci-sorcerer.test.ts`, `balance-ci-brute.test.ts`, `balance-ci-shieldbarer.test.ts`. Each:

```ts
const options = { seeds: SIM_SEEDS, runCap: FIRST_SOUL_MAX_RUNS, probeBosses: false }
const t = computeThresholds(SIM_SEEDS.map((seed) => runSeed('<spec>', seed, options)))
expect({ floor1: t.floor1Pass, firstSoul: t.firstSoulPass, floor5: t.floor5Pass }).toEqual(
  { floor1: true, firstSoul: true, floor5: true })
```

with a 600 s timeout. It calls the simulator's own `runSeed` and `computeThresholds` and copies none of
the threshold code; it asserts verdicts, never a value. The cap reuses `FIRST_SOUL_MAX_RUNS` (30), which
is the number ASSUMPTION 148 names and the largest window any verdict reads (P13). A small guard in
`balance-sim.test.ts`: `SPECIALIZATIONS` ids are exactly `sorcerer, brute, shieldbarer`, so a fourth spec
cannot ship without a CI file (P14).

### Tests and fixtures

- `data/statuses.test.ts`: the potency test is renamed (no "placeholder") and pins 40 / 35 / 10 / 35.
- `data/spells/index.test.ts`: new test, Pollen Cloud is an AoE enemy-side Wit spell whose effects are
  exactly `[apply-status sleep, duration 2, cast-target]` and which keys as `wit|aoe|status:sleep`.
- `state/integration.test.ts`: the revive count and comments (below).
- `engine/status-snapshot.test.ts`: the Poison pin, setup only (`world()` and the `state0.statuses` map
  at line 276 both use the held registry).
- New `engine/__fixtures__/held-statuses.ts` (+ its test): `holdPotency(registry, { poison: 20 })` returns
  a copy of the registry in which each named status is the real `StatusDef` spread with only
  `potency.percent` replaced; it throws on a status without a `potency` or an unknown id (P1).
- Goldens: next section.
- `state/balance-sim-report.test.ts` (hand-built runs, like H2c's report code) and
  `balance-sim.test.ts` (the existing `t2`/`t3` fold tests at 835–850, line 155): see the mechanism table.

## Golden policy (restated from the kickoff; ASSUMPTION 147)

**Mechanism goldens: expected values byte-identical.** Each of the 16 pins is setup-only: the fixture's
`statuses` export (or the registry it hands to `createCombat`) becomes `holdPotency(STATUS_REGISTRY, …)`
at today's value; header arithmetic that quotes the real percentage gets "(pinned at 20% since 4.1-H2d)".

| Held value | Fixtures |
|---|---|
| Poison 20 | `dot`, `f2-dot-one-turn`, `h2b2-reapply`, `h2b2-tick-dead-applier`, `h2b2-tick-kill-on-death`, `h2b2-tick-living-applier`, `h2b2-tick-no-retaliation`, `h2b2-tick-self-applied`, `h2b2-tick-taken-factors`, `hollowkin-wretch-self-dot`, `turn-end-dot-kill-burst`, `turn-end-dot-kill-burst-refresh` |
| Spore 15 | `f2-turn-end-interaction`, `h2b2-carrier-fresh`, `h2b2-spore-spread`, `spore-spread-dot-kill` |
| Burn | none reads it |

`golden-h2b2-tick-living-applier` also imports `POISON` by name; I check at build whether it reads the
potency from it or only the id, and pin whichever it reads. Comment-only edits (no code): `h2b2-tick-no-retaliation`
(Snapback "60% since 4.1-H2d, 30% in H2c"), `sporch-cinderlord-burn-refresh` (its 25% arithmetic), plus
any other header the build finds quoting a moved percentage (listed in the report).

**Proof, by import.** A scratch test (outside the repo) imports every `golden-*.fixture.ts` from a clone
of `main` and from the branch and deep-compares every `expected*` export, `TURN_STEPS`, `EXPECTED_DRAWS`
and `SEED`, as the H2c review did. Predicted: all equal except `golden-h2c-snapback` (changed) and the
two new fixtures (new). Pins shown setup-only: the fixture diff, comments stripped through the TypeScript
printer, differs from `main`'s only on the `statuses` declaration and its import.

**Content goldens: re-derived by hand, each failing with its old number.**

1. `golden-h2c-snapback` (re-derived): magnitude 40 × 0.6 = 24, minus 0.2 × 10 = 2, raw 22, final 22, P
   100 → 78 (its header already gives the 60% arithmetic). Fails at 0.3 (10 / 90). File name, title and
   comments move from "30%" to "60%".
2. **New `golden-h2d-pollen-cloud`**, real `POLLEN_CLOUD`. Setup (all vitality, neutral, level 11 so the
   Additional is 0): C (caster, Speed 100, `cast-aoe` slot 0 holding the real spell), H (Speed 50, Attack
   20, `always-attack`), E1 (Health 30, Defence 0, Speed 2) and E2 (Health 40, Defence 0, Speed 1), both
   `always-wait`. `TURN_STEPS = 2` (C, H). Expected, by hand: C: `SpellCast` aoe `[E1, E2]`, `StatusApplied`
   sleep duration 2 on E1 then E2, **no `DamageDealt`**, `TurnEnded`. H attacks the lowest-HP enemy
   (E1): core 20, chip 0.2, raw 20.2, final 20, E1 30 → 10; `on-damage-taken` wakes only E1 (`TriggerFired`
   sleep, `StatusExpired` E1); E2 gets no event and keeps Sleep. The test also asserts E2's final
   `remainingDuration` is 2 and that no `DamageDealt` has C as source. Fails with the damage effect
   restored (a `DamageDealt` per target appears, and a hit that lands before the Sleep).
3. **New `golden-h2d-dot-ticks`**, the real `POISON`, `BURN` and `SPORE`, applied in `setup` the way the
   Sporch golden does. A (player; Attack 100, Intelligence 80, Speed 60, Defence 10, `always-wait`, acts
   first) is the applier of all three; E1, E2, E3 (enemy; Health 1000, Defence 50, Speeds 3 / 2 / 1,
   `always-wait`) bear Poison, Burn and Spore (duration 3). Indirect tick = `MAX(1, floor(potency −
   0.2 × Defence))`, Defence term 10:

   | Bearer | Potency (new) | Tick | Old potency → tick (fails with it) |
   |---|---|---|---|
   | E1 Poison 40% of Attack 100 | 40 | 30, E1 1000 → 970 | 20 → 10 |
   | E2 Burn 35% of Intelligence 80 | 28 | 18, E2 1000 → 982 | 20 → 10 |
   | E3 Spore 35% of Speed 60 | 21 | 11, E3 1000 → 989 | 9 → `MAX(1, −1)` = 1 |

   All three above the minimum of 1. `TURN_STEPS = 4`. The full event list (turn brackets, the three
   `DamageDealt`s with `damageSource: 'dot'`) is derived by hand in the fixture comments. I run each
   percentage back to its old value in the scratch copy and name the failing assertion (P6).

Every content golden whose number moves is listed with the change that moved it (report). No other
content golden moves: the mutation table is the evidence.

**Store, integration and data tests move through content (predicted).**

- `state/integration.test.ts` "Slice I … descends floor 1": the revive count goes 1 → 0 at Snapback 60%
  (the mutation run shows only the direction and that it fails at line 204; I state the cause from the
  fight's printed events, as the H2c review did, not from this prediction). Assertions after line 204 were not reached by the failing run, so more
  may move (the draw order changes with Snapback); each is listed with its cause. Re-pinned
  generated-then-checkpoint-verified, keeping the Revived-after-a-death checkpoint loop, with the cause
  and first stage (Snapback) in the comments. The Snapjaw comment at line 178 ("30% since 4.1-H2c") is updated.
- `statuses.test.ts` (numbers) and `spells/index.test.ts` (new test) as above. Everything else
  (`store*.test.ts`, `store-gems`, `roles`, `starters`, `species/*`) is green in the mutation run: unchanged.

**The corpus digest** is regenerated once, through `npm run corpus:update`, after everything else is
green. Attribution (P16): a scratch `git clone` of `main`'s HEAD outside the repo, `node_modules`
junctioned, three cumulative patches (each stage's `git diff` against the previous checked to be exactly
that change), `npm run corpus:update` per stage into per-stage copies, a scratch script comparing fight by
fight. **Stage 1** Pollen Cloud, **2** Snapback 0.6, **3** the DoT percentages. Per stage: fights first
changed there, and fights whose log differs from the previous stage; the repo's regenerated digest must be
byte-identical to stage 3's. Predicted: stage 1 changes the fights where a Wit creature rolls Pollen Cloud
(a large share: 75% of biome-1 Wit creatures hold it); stage 2 first-changes the fights containing a Snapjaw
that is hit; stage 3 first-changes only DoT fights not already changed (H2c's digest has 153 of 527 fights
with ticks, so at most that many, probably far fewer). `corpus-coverage.test.ts` must stay green at each stage.

## Mechanisms and the test that fails with each removed (every site)

| Mechanism | Sites | Test that fails with it removed |
|---|---|---|
| Pollen Cloud deals no damage | `POLLEN_CLOUD.effects` | `golden-h2d-pollen-cloud` (damage restored: `DamageDealt` events); `spells/index.test.ts` Pollen Cloud effects; digest |
| Sleep wake unchanged | `SLEEP` (not edited) | the same golden's second half (H's hit wakes E1 only); fails if the wake-up is made to remove both |
| Snapback 60% | `snapjaw-jaws-snapback` | `golden-h2c-snapback` (fails at 0.3); the Slice I integration test; digest |
| Poison 40% | `POISON.potency` | `golden-h2d-dot-ticks` E1 (10 at 20%); `statuses.test.ts` |
| Burn 35% | `BURN.potency` | `golden-h2d-dot-ticks` E2 (10 at 25%); `statuses.test.ts` |
| Spore 35% | `SPORE.potency` | `golden-h2d-dot-ticks` E3 (1 at 15%); `statuses.test.ts` |
| Regen stays 10% | `REGEN.potency` | `statuses.test.ts`; `golden-h2b2-regen-potency` (unchanged) |
| 16 pins + `status-snapshot` pin | each fixture's `statuses` | mutation table re-run at build: with the pin removed and the percentage moved, each of the 16 and the 6 snapshot tests fail; with the pin in, all pass at the moved data |
| `holdPotency` | `held-statuses.ts` | its test: the held def equals the real def except `potency.percent`; unknown id and no-potency status throw |
| T2 read | `soulBySeedFloor` | hand-built seeds: soul completed in an earlier run → met; completed *during* the first floor-3 run → missed (fails with `<=`); completed between the first and a later floor-3 run → missed (fails if it reads the last floor-3 run); never completes → missed; no floor-3 run → did-not-reach, not missed |
| T3 read | `fullPartyBySeedFloor` | party of 6 on the first floor-6 run → met; 5 → missed (fails with `>= 5`); full only on a later floor-6 run → missed; no floor-6 run → did-not-reach |
| Tally and fold | `tallyReads`, `buildSpecReport` | hand-built `SeedResult`s: `met / reached (didn't reach N)` counts, did-not-reach excluded from the denominator; replaces the old `t2`/`t3` fold tests at 835–850 |
| Printer | T2 / T3 lines | formatter test on a hand-built report: exact text incl. "(didn't reach N)"; the first-soul median text still present on the T2 line; the ASSUMPTION 22 line unchanged |
| `FIRST_SESSION_RUNS` kept | `runSeed`'s after-session fields | existing `balance-sim.test.ts` 1050–1067 and `balance-sim-report.test.ts:91` stay green and untouched |
| CI threshold test | 3 files | not removable by mutation; shown instead as green on H2d's data and **failing on H2c's** (scratch copy with the three content changes reverted; I name the failing spec and verdict: the grill measured the Shieldbarer floor 1 at 26 of 40), plus the `SPECIALIZATIONS` guard |

## Predicted changed set (before anything runs)

- **Source:** `data/spells/overgrowth.ts`, `data/traits/overgrowth.ts`, `data/statuses.ts`,
  `state/balance-sim.ts`. Nothing under `engine/` except fixtures and tests.
- **New files:** `engine/__fixtures__/held-statuses.ts` (+ `.test.ts`); `golden-h2d-pollen-cloud` and
  `golden-h2d-dot-ticks` (fixture + test each); `state/balance-ci-{sorcerer,brute,shieldbarer}.test.ts`.
- **Goldens:** 16 pinned (setup-only, expected values identical); 1 re-derived (`golden-h2c-snapback`);
  2 new; comment-only: `h2b2-tick-no-retaliation`, `sporch-cinderlord-burn-refresh` and any header
  the build finds quoting a moved percentage. **Every other golden is byte-identical.**
- **Tests that change:** `data/statuses.test.ts`, `data/spells/index.test.ts` (+1),
  `engine/status-snapshot.test.ts` (setup pin), `state/integration.test.ts`,
  `state/balance-sim.test.ts` (t2/t3 fold, line 155, the spec guard), `state/balance-sim-report.test.ts`
  (+ the new helper and printer tests). Test count: roughly +20 (3 CI, 2 goldens, ~3 held-statuses,
  ~12 report tests, 1 data test, minus the replaced fold tests); reconciled file by file against `main`
  with `vitest --reporter=json` on both trees.
- **Digest:** regenerated once; stage counts as above.
- **Evidence (`evidence/`):** `sim-before.txt`, `sim-after.txt`, `dotscan-before.txt`, `dotscan-after.txt`, a
  mutation table, the digest stage table, the CI timing table. No scripts kept; the report quotes the
  rule of each scratch script.

## Order of work

1. `npm ci`; compare `node --version` and tool versions with `package-lock.json`.
2. **Simulator code first, data untouched:** helpers, report fields, printer, simulator tests, the header
   comments. Gates for that state.
3. **Capture "before":** `npm run sim` on H2c's data with the new report code (about 18 minutes,
   background). Check every pre-existing line against `H2c/evidence/sim-after.txt` apart from the runtime
   and the T2 / T3 lines; save as `evidence/sim-before.txt`. No data edit until it finishes (P17). Fixture
   and test edits meanwhile are fine: the simulator imports none of them.
4. Content data, `statuses.test.ts`, the new data test; the pins and `held-statuses`; the re-derived and
   two new goldens; integration re-pin; comment fixes.
5. The scratch measurements (below). All gates. `npm run corpus:update` once.
6. `npm run sim` on the final tree, the CI tests, the report, the phase record.

## Scratch measurements (all outside the repo)

- **Mutation proofs:** the mutation table above re-run with the pins in, plus each new golden's number
  put back to its old value (Pollen Cloud's damage restored, Snapback 0.3, each DoT at its old
  percentage), failing test named for each.
- **CI test on H2c's data:** a scratch copy with the three content changes reverted; the three files run;
  the failing spec and verdict named. Wall time: full `npm run test` (3 runs each, same machine) on a
  clone of `main` and on the branch, and the three CI files' own durations from the JSON (P19).
  ASSUMPTION 148's limit is about 2 minutes added; if it is exceeded I stop and ask.
- **The DoT tick scan** as H2c ran it: a scratch vitest test over `buildCorpus()` + `createCorpusCombat` +
  `resolveFight`, counting `DamageDealt` with `damageSource: 'dot'` and the share with `finalDamage 1`,
  per status, Parts A+B (fights 0–499) and Part C (500+) apart. Check first on `main`'s tree: it must
  reproduce H2c's 6,615 of 7,251 (Poison 202 / 252, Burn 2,876 / 3,112, Spore 3,537 / 3,887; Part C
  304 of 304) before I trust the "after" (P18).
- **Fixture import comparison** and the **digest stage build**, as described above.

## Report content (the PR and the phase record)

The gates with the test count reconciled by file; the golden policy with the import comparison; the
mutation proofs; the digest attribution; the CI test result on both data sets and the wall times; the
before/after report: every band T1–T5 (with the new T2 / T3), the three verdicts, floors 1–5 matchup rows,
first-try clear per floor, the Sorcerer's floor-10 median and the draw rates (ASSUMPTION 150's named
costs: kickoff expects first-try floor 1 40 / 40 / 40, floor 5 within 20 runs 40 / 40 / 37, floor-10 first
clear 106 / 71 / 166, draws 5.9 / 2.7 / 12.6%); the DoT tick scan before / after. **Spec questions** I
expect: CONVENTIONS' pin rule should say it covers non-golden mechanism unit tests (`status-snapshot`); the
kickoff's "no pin" for `h2b2-tick-no-retaliation`; the stale "placeholder" wording in content docs (the
design agent folds them). **Content changes:** Pollen Cloud (Sleep 2 only), Snapback 0.6, Poison 40% /
Burn 35% / Spore 35%. **To delete:** none expected. The phase record is the "4.1-H2d" section appended to
`phases/phase-4.1-fix-and-consolidation.md` (no `phases/4.1/brief.md` exists, so the old layout applies).

## Assumptions checklist

- **P1** The pins go through one small helper, `holdPotency` (own tested file in `__fixtures__/`), not 16
  inline spreads. The kickoff says "pins it in its own fixture": each fixture still names its held value; the
  spread lives in the helper. If you prefer inline spreads, it is a mechanical change.
- **P2** `golden-h2b2-tick-no-retaliation` gets a Poison pin as well as the Snapback comment fix (it fails
  under Poison 40%).
- **P3** `status-snapshot.test.ts` is pinned like a mechanism golden (expected values unchanged), although
  it is a unit test.
- **P4** `golden-spore-spread-filter`, `-fizzle`, `golden-rot-sovereign`, `golden-h2b2-regen-potency` and
  `-vulnerability-once` read no moved number (mutation) and are not pinned; only headers that quote a
  moved percentage get comment edits.
- **P5** Burn has no mechanism golden to pin; only the new content golden and `statuses.test.ts` show
  its change.
- **P6** One content golden (`golden-h2d-dot-ticks`, three bearers, real statuses applied in `setup`)
  covers Poison, Burn and Spore; no existing golden is re-derived for them because none is a content golden.
  The stats (Attack 100, Intelligence 80, Speed 60, Defence 50) are my fixture choices, not balance numbers.
- **P7** `golden-h2d-pollen-cloud` shows "the next hit wakes only its target" with an ally's attack on the
  lowest-HP enemy; setup stats are fixture choices.
- **P8** T2 is read from `runsToFirstSoul < run.index` on the first run with `floor === 3`; no `RunRecord`
  field is added. "A soul has completed" is the existing meaning (any `soulProgress >= 100`).
- **P9** T3 is `partyLevels.length >= PARTY_SIZE` (6) at the first run on floor 6. "Four souls beyond the
  two starters" is the same event: the party only grows by summoning.
- **P10** A seed "reaches" a floor iff it has a run with that floor (pushes go to `deepestFloor + 1`, so
  no floor is skipped); a seed stopped by the run cap before it is "didn't reach".
- **P11** The tallies are folded in `buildSpecReport` from `SeedResult.runs` and `runsToFirstSoul`;
  `SeedResult` gains no field; `t3.partySizeCounts` is dropped; `partySizeAfterSession`,
  `deepestAfterSession` and `FIRST_SESSION_RUNS` stay though only `runSeed` and tests read them now (delete
  them in a later slice if you want them gone).
- **P12** T2 and T3 are reported, never asserted; the CI test asserts only the three ASSUMPTION 22 verdicts.
- **P13** CI test file names `balance-ci-<spec>.test.ts`, run cap `FIRST_SOUL_MAX_RUNS` (30), timeout
  600 s, one assertion on the three verdict booleans.
- **P14** A guard test pins the spec ids to the three CI files.
- **P15** The Slice I revive count goes 1 → 0 (direction from the mutation run; assertions after it are
  unseen and may also move).
- **P16** The digest stages are built from a clone of `main` HEAD with the three cumulative patches; the
  repo's digest must equal stage 3's byte for byte.
- **P17** The "before" report runs in the repo on H2c's data before any data edit; fixture and test edits
  during the run are harmless because the simulator imports none of them.
- **P18** The DoT scan is validated first by reproducing H2c's 6,615 of 7,251 on `main`.
- **P19** CI wall time is measured on one machine, 3 runs each of the full suite; the figure is noisy and I
  report the range.
- **P20** No engine change: Pollen Cloud becoming a damage-free AoE needs none (read and mutation-checked
  above); if building shows otherwise I stop and ask.
- **P21** The mutation scan above was run in a scratch copy of the pre-implementation tree; the table is
  predicted, not final, until it is re-run at build.
