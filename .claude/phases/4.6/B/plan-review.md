# Plan review — 4.6-B: Game layer and the comment sweep

## Round 1

**Verdict: changes needed.** The design is right and the line references check out against the
tree (every `store.ts`, `balance-sim.ts` and test line the plan cites lands on what it names). Four
of the planned tests would fail as specified, or pass whatever the code does: the intro's RNG count
and its "biome 1" proof, the reach guard's scope, and an undefined report row. One V12 hit has no
pattern. C1–C3 are decide-points 1–3 below; I recommend approving all three. No item changes the
brief's Assumptions checklist, so nothing here is a "bring it back" signal.

### Plan fixes

1. **The intro Unicorn's tests (Tests table, "Intro Unicorn" row).**
   - **Two `createRng` calls on a first intro, not one.** The new enemy roll is one. Then
     `runScriptedIntro`'s `set` grants the joining Unicorn (`grantCreatureIfUnowned` →
     `addInstance` → `rollPlayerGems`), and that makes the other, as it does today. The test asserts
     both seeds, in order: `hashIntroUnicornDraw(runSeed)` first, then
     `hashGemDraw(runSeed, <the Unicorn's ordinal>)`, and they differ. It also asserts exactly one
     call when the Unicorn is already owned.
   - **"Biome 1" needs an exact-set check.** Biome 1's Vitality pool is exactly three spells:
     Regrowth, Wild Vigor and Life Siphon (`data/spells/overgrowth.ts`; Afterglow unlocks at 2,
     Charnel Feast at 3). So every biome-1 roll holds all three, and only the slot order varies.
     "Three distinct biome-1 Vitality spells" also holds for a biome-3 roll (three of five), and
     "a seed table where the sets differ per seed" can never pass as sets. The test instead
     asserts:
     - over a table of at least 20 seeds, the set is exactly `{regrowth, wild-vigor, life-siphon}`.
       A biome-2 or biome-3 roll breaks that on most seeds;
     - the ordered slots differ between at least two seeds of the table;
     - the same seed gives the same ordered slots, with `runCounter` set to 7 first.
2. **Name every existing test the analysis change touches**, so step 1's inventory has a list to
   match (decide-point 1 approves the class). Beyond the plan's list:
   - `traitStackMaxima`'s two tests in `balance-sim-report.test.ts` (~267, and ~290 through
     `foldTraitStacks`): their stacks gain a roster;
   - the `RunRecord` helpers `run` (`balance-sim-report.test.ts:37`, `balance-sim.test.ts:813`)
     and `runWith` (~391): they gain `shape`;
   - every `buildSpecReport(…, 30, …)` call (`balance-sim-report.test.ts` ~328, ~376, ~465, ~492;
     `balance-sim.test.ts` ~823) and `formatReport({ …, frontier: 30 })` (~377, ~501;
     `balance-sim.test.ts` ~1008). These lose the frontier argument, which the brief's frontier
     entry already lists.

   The boss-recording fallout also includes `store-perks.test.ts:109` (the inert-perk test records
   `'boss-0'` outside the helper). Assertions stay unchanged everywhere.
3. **A floor row with no run (A8).** `buildFloorRows` takes `fightsPerFloor`/`bossLevel` from
   "the first run on that floor", which a hand-built `SeedResult` with gaps doesn't have. Rule: a
   floor that no seed ran has no row, as `buildFirstTryRows` already does. In a real report every
   floor up to `max(run.floor)` has a run, because pushes go one floor at a time, so the rule only
   bites in tests. A test pins it.
4. **The reach guard's scope (A17).** As specified, "`deepestFloor + 1` appears in no non-test
   `src` file except the export" fails on today's tree in two places. The first is
   `balance-sim.ts:151`, where `nextRun` pushes to `progress.deepestFloor + 1`. The second is
   comments: `balance-sim.ts:16`, `:18`, and `store.ts:306` until it is rewritten.
   - **`nextRun` reads `farthestReachableFloor`:** the policy's push is the reach rule. That makes
     it a fourth reader, with its own row in the site table.
   - **The guard reads code only:** comments are stripped before matching, and the pattern
     tolerates spacing (`/deepestFloor\s*\+\s*1\b/`).

   The marker test (A13) reads comments, so it keeps the raw text.
5. **A V12 hit with no pattern.** The review's `traits/glimmerdark.ts:126` (now ~134–135, "made
   possible by conditions.ts completing that condition's non-scripting path") matches none of
   patterns 21–27. The kickoff asks for every V12 hit as a positive case. Decide-point 4 settles
   it. Either way, the plan names this hit and how it is handled.

### Assumptions

| # | Plan ASSUMPTION | Call |
| --- | --- | --- |
| A1 | Rows to the deepest floor any seed *ran* | **Confirm** (decide-point 3). |
| A2 | `biomeForFloor` accepts any list; throws only with nothing authored at or before the decade, or nothing authored past 100 | **Confirm.** Keep the `generation invariant violated` prefix: `generation.test.ts:245`'s empty-list test reads it. |
| A3 | `perkPointsPerBoss`; `STAT_GROWTH_PER_LEVEL` in `engine/config.ts`; `specializationPointTotal(config)`, `validateSpecialization(spec, config = DEFAULT_BALANCE_CONFIG)` | **Confirm.** Checked: `TEST_BALANCE_CONFIG` is the only other `BalanceConfig` literal, and 0.25 is exact in binary, so every materialized stat is unchanged. The growth is a progression number in the combat-constants file. The PR review's `CONVENTIONS.md#where-each-number-lives` edit says so. |
| A4 | `farthestReachableFloor(deepestFloor)` in `store.ts`; `deepestPlusOne` deleted | **Confirm.** Its `floorPicker.test.ts` test goes with it, as kickoff fallout. |
| A5 | `{ ok: true } \| { ok: false; reason: 'unknown-boss' }`; a repeat is `ok` with no `set` | **Confirm.** This is the brief's `ASSUMPTION (B)` on the result shape. The no-`set` repeat is needed: zustand's `set` merges into a new state object even when the Set is the same reference. |
| A6 | The intro stream hashes the run seed alone, with its own constants and a fixed salt; biome is the number 1 | **Confirm.** This is the brief's `ASSUMPTION (B)` on the stream. The tests are plan fix 1. |
| A7 | `StopReason` stays `'cap'`; `t4.stopReasons` stays `{ cap }` | **Confirm.** Removing the always-`cap` field would touch every `SeedResult` helper for no report gain. The T4 line then prints `cap N` only. |
| A8 | Past `LAST_FIXED_FLOOR`, a row takes its shape from the first seed's run, read through the store's `floorPreview` | **Correct:** add the no-run rule (plan fix 3). The rest stands. All three authored biomes have a boss, so seeds can't disagree on a row today. |
| A9 | `applyPerkPlan` reads `perkPointSummary().earned` | **Confirm.** The spend is refunded just before, and `earned` doesn't depend on it, so the value is `main`'s. |
| A10 | The filter compares `bossTemplateId` with `ROT_SOVEREIGN.id` | **Confirm.** This is the kickoff's first option: like with like, and it survives 4.6-F's branding. The phase brief's line names `ROT_SOVEREIGN_BOSS_ID`; the PR review folds the spec as built. The test can't tell the two constants apart today, as the plan says. |
| A11 | Out-of-reach, duration and no-fight wording | **Confirm.** |
| A12 | A zero-fight playback starts `done`; the viewer shows a no-fight line, returning after every hook | **Confirm.** `floorResultLine` already reads a zero-fight outcome as "cleared", so `DescentResult` needs no guard. |
| A13 | One first-line marker on every non-test `src/app`, `src/ui` file and `main.tsx`; CSS excluded | **Confirm.** The citation resolves and names no phase. |
| A14 | No new description pinned by a test | **Confirm.** |
| A15 | Patterns 21+ read comments and titles, not literals | **Confirm.** `names.ts` reads only ids ≤ 9 (`LAST_VALUE_PATTERN`) in a value, so this needs no code beyond the plan's string-literal test. |
| A16 | The repeat Rot Sovereign win: the real store with a high-level party, or a fixture boss store | **Confirm.** The build picks, and the report says which and why. Resolution and spell-pool assertions stay on the real store. |
| A17 | A raw-source test (`import.meta.glob` with `?raw`) proves the reach export's readers and the marker | **Correct:** scope it as in plan fix 4. Otherwise the tool is fine: `tsconfig.app.json` already loads `vite/client`, and `RunScreen.tsx` has no other test. |
| A18 | C1/C2 set-up changes are direct fallout | **Decide-points 1 and 2.** |

The plan changes nothing in the brief's Assumptions checklist. It confirms both `(B)` items, so
there is no "bring it back" signal.

**Golden policy:** matches the kickoff, plus decide-points 1–2 if approved. The claim "every state
after the intro is byte-identical" holds in the code. The grant, the XP and `runCounter + 1` don't
read the intro's result or log. The Unicorn is a `striker`, so its gems matter only on a turn its
attack is locked.

**Mechanism → test, at every site:** complete except plan fixes 1 and 4. The `biomeIndex`
discriminator (a biome-4-only spell of every affinity, then floor 35) is good. So are the
`unlockBiomeIndex` deepest-150 seed table and the opaque-id analysis tests. The store guard throws
in no existing test: I checked every test store's biome list (`store.test.ts`'s eight lists, and
`BIOMES` everywhere else), and each starts with an authored biome.

**Notes for Duncan (no plan change):**
- **PAUSE 1's commit fails `docs:check -- comments` by design**: the widened patterns land before
  the sweep that fixes their hits. Push it together with the sweep commit, or expect one red CI run.
- **The full simulator report changes more than "floors 40+" suggests.** Before, 37 of 40 Brute
  seeds stopped at floor 30 (`phases/4.5/S/evidence/sim-report.txt`). Now they push 31, fail, and
  re-farm floor 30 until the cap. So the Rot Sovereign's boss rows (all visits) and the attrition
  rows fill with repeat floor-30 visits, and the run takes longer: about 2,500 more Brute floor runs
  against roughly 45,000 in the whole report today. That is well inside `sim.yml`'s 120-minute
  timeout. It is report-only and accepted by the brief. The CI verdicts' numbers are unaffected,
  since no 30-run seed reaches floor 30.

### Decide-points

1. **C1: are the analysis tests' set-up changes allowed?** Removing the id parsing means
   `analyzeFight`, `stackBucket` and `traitStackMaxima` take a roster, and the tests that relied
   on `-player-N` suffixes must pass one. The full list is in plan fix 2.
   - Options: (a) approve set-up-only changes, assertions untouched; (b) keep a suffix parser
     for the tests.
   - **Recommend (a).** "No regex and no hand-built id remain" is the kickoff's requirement
     (`spec/creatures.md#creaturelevel-and-creatureorigin`: nothing parses `CreatureId` suffixes).
     A test-only parser would keep the rule broken where the tests can't see it. The opaque test
     ids then prove no parser is left.
2. **C2: may `perkPointsFor`'s three cases (`rewards.test.ts:218`) pass a config?**
   - Options: (a) yes, `TEST_BALANCE_CONFIG`, expectations unchanged; (b) a default argument, so
     the call sites stay.
   - **Recommend (a).** A default would bring back the hidden 100 that this item removes, at the
     one call site where it is easiest to miss.
3. **C3: where do the simulator's floor rows stop?**
   - Options: (a) the deepest floor any seed **ran**, `max(run.floor)` (the plan); (b) the deepest
     floor any seed **cleared**.
   - **Recommend (a).** It is what the kickoff meant: the report's own "reached" column counts
     seeds that ran a floor (`attemptedSeeds`). Stopping at the deepest clear would drop the row
     holding a seed's last failed pushes, which is exactly where a wall shows.
4. **The Glimmerdark V12 hit: pattern or hand fix?** The text is "made possible by conditions.ts
   completing that condition's non-scripting path" (plan fix 5).
   - Options: (a) hand-fix it in the sweep, with no pattern, and list it as the one V12 hit the
     check doesn't catch; (b) add a pattern such as `/\bmade possible by\b/`.
   - **Recommend (a).** "Made possible by" is ordinary English for a dependency ("a cascade made
     possible by Splashing"), and the history here sits in "completing". A pattern narrow enough to
     have no false positives would match this one comment only, which is a pin, not a check. The
     kickoff line "each V12 hit is a positive case" then reads "each V12 hit but this one".

### Decisions

- **Decide-point 1 (C1):** (a). The analysis and report tests change their set-up only. Each
  takes a roster built from opaque ids that no suffix parser could read, and its assertions stay
  untouched. The full list is plan fix 2.
- **Decide-point 2 (C2):** (a). `perkPointsFor` takes the config with no default argument, and its
  three cases in `rewards.test.ts` pass `TEST_BALANCE_CONFIG`, expectations unchanged.
- **Decide-point 3 (C3):** (a). The floor rows and first-try rows run to the deepest floor any seed
  of the spec ran, `max(run.floor)`. A floor that no seed ran has no row (plan fix 3).
- **Decide-point 4:** (a). The Glimmerdark V12 hit gets no pattern. The sweep fixes it by hand, and
  the report lists it as the one V12 hit the widened check doesn't catch.
- Plan fixes 1–5 stand as written.

### Docs edited

- `phases/4.6/brief.md#the-cave-has-no-content-frontier`: the simulator's floor rows run to the
  deepest floor any seed ran (decide-point 3).
- `phases/4.6/brief.md#small-game-layer-fixes`: the attrition filter compares with
  `ROT_SOVEREIGN.id` (A10), and the simulator's push (`nextRun`) is a reader of the reach export
  (plan fix 4).
- `phases/4.6/brief.md#the-comment-sweep`: the Glimmerdark V12 hit is fixed by hand, with no
  pattern (decide-point 4).
- `phases/4.6/brief.md#bs-listed-test-changes`: the analysis and report tests' set-up changes and
  `perkPointsFor`'s config argument are listed (decide-points 1 and 2).
- `phases/4.6/B/kickoff.md`: the floor-row ASSUMPTION is resolved (decide-point 3), and the "each
  V12 hit is a positive case" rule names its one exception (decide-point 4).
