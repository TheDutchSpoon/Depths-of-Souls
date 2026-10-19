# Plan hand-out, round 1: 4.6-B

**Verdict: changes needed.** Fold the items below into `plan.md` and list what changed at its top.
Every ASSUMPTION not named here stands as written. A1–A7, A9–A16 are confirmed as the plan states
them.

Re-read these lines first; they were edited for this round:
- `phases/4.6/brief.md#the-cave-has-no-content-frontier`: the simulator's floor rows;
- `phases/4.6/brief.md#small-game-layer-fixes`: the Rot Sovereign filter, and `nextRun` as a reach
  reader;
- `phases/4.6/brief.md#the-comment-sweep`: the one V12 hit with no pattern;
- `phases/4.6/brief.md#bs-listed-test-changes`: the analysis tests' set-up and `perkPointsFor`'s
  config;
- `phases/4.6/B/kickoff.md`, Traps: the Simulator bullet (floor rows) and the comment-check
  bullet (the V12 exception).

## 1. Intro Unicorn tests (Tests table, "Intro Unicorn" row; A6)

- **RNG requests.** A first intro makes exactly two `createRng` calls, in this order:
  1. `hashIntroUnicornDraw(runSeed)`, the enemy Unicorn's roll;
  2. `hashGemDraw(runSeed, <the joining Unicorn's ordinal>)`, the joining Unicorn's stored set,
     which `runScriptedIntro`'s grant rolls as it does on `main`.

  The test asserts both seeds in that order and that they differ. A second test, with the Unicorn
  already owned, asserts exactly one call: the enemy roll.
- **Biome 1, proven exactly.** Biome 1's Vitality pool is exactly three spells: `regrowth`,
  `wild-vigor` and `life-siphon`. Every biome-1 roll holds all three, so only the slot order varies.
  The test asserts:
  - over a table of at least 20 run seeds, the enemy Unicorn's set is exactly
    `{regrowth, wild-vigor, life-siphon}` (a biome-2 or biome-3 roll would add `afterglow` or
    `charnel-feast` on most seeds);
  - the ordered slots differ between at least two seeds of the table;
  - the same seed gives the same ordered slots, with `runCounter` set to 7 before the intro.
- Drop "three distinct biome-1 Vitality spells" and "a seed table where the sets differ per seed"
  as written. The Pacified-Unicorn-casts test stays.

## 2. Existing tests the analysis and report changes touch (Tests, existing-test list; A18)

These are listed changes. Each changes its set-up only, and every assertion stays as it is:

- **`analyzeFight`, `stackBucket`, `traitStackMaxima`** take the fight's roster
  (`{ playerParty, enemyParty }`) instead of reading an id suffix. The tests below pass a roster
  built by a small test helper from opaque ids (`'a1'`, `'b2'`) that no suffix parser could read:
  - `balance-sim.test.ts` ~625 and the hand-built-event block ~1064–1260;
  - `balance-sim-report.test.ts` ~129 (the matchup roster), and `traitStackMaxima`'s tests ~267
    and ~290 (through `foldTraitStacks`).
- **`bossContext`'s test** (`balance-sim.test.ts` ~1378) follows the new signature.
- **`RunRecord` gains `shape`**, so its helpers gain it: `run` (`balance-sim-report.test.ts:37`,
  `balance-sim.test.ts:813`) and `runWith` (`balance-sim-report.test.ts` ~391).
- **The frontier argument goes** from every `buildSpecReport(…, 30, …)` call
  (`balance-sim-report.test.ts` ~328, ~376, ~465, ~492; `balance-sim.test.ts` ~823) and from
  `formatReport({ …, frontier: 30 })` (`balance-sim-report.test.ts` ~377, ~501;
  `balance-sim.test.ts` ~1008).
- **`perkPointsFor(bossesCleared, config)`** takes its config with no default argument. Its three
  cases (`rewards.test.ts` ~218) pass `TEST_BALANCE_CONFIG`, expectations unchanged.
- **Boss recording:** also `store-perks.test.ts:109` (the inert-perk test records `'boss-0'`
  outside `bruteStore`). It records a real boss id, as the helper does.

Step 1's inventory must match the plan's list plus this one exactly. Anything else is still a
stop-and-ask.

## 3. Floor rows (`balance-sim.ts`, Rows; A1, A8)

- `buildFloorRows` and `buildFirstTryRows` run over floors `1..max(run.floor)` across the spec's
  seeds: the deepest floor any seed ran, not the deepest any seed cleared.
- **A floor that no seed ran has no row**, in both builders. A row's `fightsPerFloor` and
  `bossLevel` come from the first run on that floor in seed order (`shape`, read through the
  store's `floorPreview`). A new test feeds `buildSpecReport` hand-built results with a gap
  (floors 1 and 3 run, floor 2 not) and asserts that no floor-2 row exists.

## 4. The reach export's readers and its guard (`src/app`, `src/ui`; Tests "Reach export" row; A4, A17)

- `farthestReachableFloor(deepestFloor)` in `store.ts` has four readers: `checkDescend`, the demo's
  "Deepest + 1" (`RunScreen.tsx`), the out-of-reach text, and the simulator's `nextRun`. `nextRun`
  pushes to `farthestReachableFloor(progress.deepestFloor)`.
- Each reader has its own test, and the site table gets a `nextRun` row: after a clear, the push
  floor equals `farthestReachableFloor(deepestFloor)`.
- **The raw-source guard reads code only.** It strips comments before matching, so a comment
  that names the rule passes, and matches `/deepestFloor\s*\+\s*1\b/`. It allows the one export
  and fails anywhere else in non-test `src`. The marker test (A13) still reads the raw text,
  comments included.

## 5. The comment check and the one V12 hit with no pattern (`comments.ts`, The sweep)

- `traits/glimmerdark.ts` ~134–135, "made possible by conditions.ts completing that condition's
  non-scripting path", gets **no pattern**. "Made possible by" is ordinary English for a
  dependency.
- The sweep fixes it by hand, comment only. The report lists it as the one V12 hit the widened
  check doesn't catch, with before and after.
- Every other V12 hit is a positive case in `comments.test.ts`, with a near-miss negative beside
  it, as the plan's table has them.
