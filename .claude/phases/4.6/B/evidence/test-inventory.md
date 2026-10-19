# 4.6-B: inventory of existing tests the slice changed

How it was made: the mechanisms went in one at a time with no existing test touched; after each
batch the working tree was copied to a scratch directory and `npx tsc -b` and the full
`npx vitest run` ran there, so the log below is the failures of an unmodified suite against the new
code. Baseline on `6dc1eeb` before any change: 261 files, 2411 passed, 1 skipped, 0 failed; `tsc -b`
clean.

| Run | Mechanisms in | Failed tests (total) | New since the run before |
| --- | --- | --- | --- |
| 1 | frontier: `biomeForFloor` fallback, `contentFrontier` and `beyond-content-frontier` gone, `LAST_FIXED_FLOOR`, `unlockBiomeIndex` cap, `checkDescend`, the simulator's frontier stop and floor rows | 31 | 31 |
| 2 | + store guard + reach export (`farthestReachableFloor`, `deepestPlusOne` gone, `descendRefusalText(reason, reach)`) | 32 | 1 (`deepestPlusOne`'s test) |
| 3 | + intro Unicorn roll + `recordBossKill`/`canRecordBossKill` + the config reads (`perkPointsPerBoss`, `STAT_GROWTH_PER_LEVEL`, the specialization total) + the small fixes (ids from the record, `RunRecord.shape`, zero-fight playback, the viewer, `(3r)`, seed text, the marker) | 51 | 19 |

Run 3's mechanisms went in as one batch (the snapshot logs are named m4567); each of its 19 new failures has one
evident cause, given in the table below. The store guard added none, the intro Unicorn roll added
none, and no test pins the intro's log (a Brute or Sorcerer intro never leaves the Unicorn without
its Attack). `tsc -b` showed the same sites plus the signature changes that do not fail at run time.

## Failing tests, each matched to the plan's existing-test list

| # | Test (file > title) | Cause | Plan list entry |
| --- | --- | --- | --- |
| 1 | `generation-floor-shape.test.ts` > floorShape > agrees with generateFloor ..., floor 1 to the frontier | calls `contentFrontier` | frontier tests: `generation-floor-shape.test.ts` |
| 2-9 | `generation.test.ts` > biomeForFloor > floor 1 / 10 / 11 / 20 / 21 / 30 / 91 / 100 maps to fixed-sequence decade index | `FIXTURE_BIOME_SEQUENCE` has empty biomes, so the fallback walks past them | `FIXTURE_BIOME_SEQUENCE` gains content |
| 10-11 | `generation.test.ts` > biomeForFloor > floor 101+ re-derives / is stable | the draw runs over the authored biomes; the fixture has none | `FIXTURE_BIOME_SEQUENCE` gains content |
| 12-15 | `generation.test.ts` > contentFrontier (4 tests) | `contentFrontier` is gone | frontier tests: `generation.test.ts` `contentFrontier` block |
| 16 | `integration.test.ts` > the content frontier reflects the 3 authored biomes | `contentFrontier` | frontier tests: `integration.test.ts` ~356 |
| 17-18 | `store.test.ts` > descend() / canDescend() > beyond-content-frontier (2 tests) | the refusal is gone | frontier tests: `store.test.ts` ~587-651 |
| 19 | `presence.test.ts` > start, the silent intro, floor 1, and both refusal paths | `canDescend(31)` is ok; the frontier text is gone | frontier tests: `presence.test.ts` ~44-52 |
| 20 | `floorPicker.test.ts` > ... "99999999999999999999" is refused as beyond-content-frontier | `1e20` is `floor-out-of-reach` | frontier tests: `floorPicker.test.ts` ~62 |
| 21 | `floorPicker.test.ts` > prefillFloor and deepestPlusOne > Deepest + 1 | `deepestPlusOne` is gone | `deepestPlusOne`'s test |
| 22-23 | `refusals.test.ts` > every descend refusal reason has its own plain text / the reasons the real store and the seed field produce | the reasons record has four keys | frontier tests: `refusals.test.ts` ~26 |
| 24 | `balance-sim-report.test.ts` > the first-try clear rate per floor > stops at the frontier | the rows run to the deepest floor run | frontier tests: `balance-sim-report.test.ts` ~249 |
| 25-27 | `balance-sim-report.test.ts` > the printed report ... ; T2 and T3 floor reads (2 tests) | the `buildSpecReport(..., 30, ...)` and `frontier: 30` arguments shift the config | the frontier argument goes |
| 28 | `balance-sim.test.ts` > has every spec, a row per content floor and the report items | `contentFrontier` | frontier tests: `balance-sim.test.ts` ~146 |
| 29-30 | `balance-sim.test.ts` > hard wall and the stop rule > `frontier` stop (2 tests) | `'frontier'` is gone | frontier tests: `balance-sim.test.ts` ~305-320 |
| 31 | `balance-sim.test.ts` > T4: stop reasons, first-wall floors ... | `stopReasons` has `cap` only | frontier tests: `balance-sim.test.ts` ~846 |
| 32 | `balance-sim.test.ts` > the walls' size, per seed ... | the frontier argument shifts the config | the frontier argument goes (~823) |
| 33-38 | `store-perks.test.ts` (6 tests: refundAllPerks, inert perk, lowering a level, over-budget, a new level, post-change total) | `'boss-0'` is no boss in the biome data, so `recordBossKill` refuses it | boss-recording tests: the `bruteStore` helper (line 12) and line 109 |
| 39 | `store-newgame.test.ts` > the played store really has every field away from fresh | records `'boss-0'` | boss-recording tests: `store-newgame.test.ts:57` |
| 40 | `store.test.ts` > recordBossKill() / perk points > is idempotent ... | records two ids the fixture biomes don't hold | boss-recording tests: `store.test.ts` ~859-861 |
| 41 | `rewards.test.ts` > perkPointsFor > 100 points per boss | `perkPointsFor` takes the config | `perkPointsFor(bossesCleared, config)` (C2) |
| 42 | `eventText.test.ts` > describeEvent > StatusApplied prints its line with labels | `(3r)` is now `(3 turns)` | the `(3r)` expectation |
| 43-44 | `balance-sim-report.test.ts` > the matchup table > analyzeFight lists the DISTINCT enemy templates; templateIdOf strips the side and slot suffix | the roster replaces enemy ids; `templateIdOf` is gone | the roster-taking analysis functions (C1); the `templateIdOf` test |
| 45-46 | `balance-sim-report.test.ts` > per-trait stack maxima (2 tests) | `traitStackMaxima` takes the sides | the roster-taking analysis functions (C1) |
| 47 | `balance-sim.test.ts` > stat-modifier stack attribution > analyzeFight reports the largest stack per side | the sides come from a roster | C1, `balance-sim.test.ts` ~625 |
| 48-50 | `balance-sim.test.ts` > analyzeFight on hand-built events > growth and shred stacks are separate, per side (3 tests) | same | C1, the ~1064-1260 block |
| 51 | `balance-sim.test.ts` > the live wiring > bossContext names the biome boss and its traits | `bossContext(preview, record, biomes)` | `bossContext`'s test follows the new signature |

51 of 51 failures match an entry. None is a surprise.

## Type errors with no run-time failure

Each is a signature change the plan already makes, matched to its entry:

| Site | Entry |
| --- | --- |
| `refusals.test.ts` ~134, `presence.test.ts` ~51, ~60 | `descendRefusalText(reason, reach)` (hand-out, `refusals.test.ts` ~134 and `presence.test.ts` ~60) |
| `balance-sim.test.ts` ~285, ~291 | the wall test's `stopReason(p, 30, 400)` loses the frontier (hand-out) |
| `balance-sim-report.test.ts` ~233, ~243, ~246 | the two first-try tests' `buildFirstTryRows(..., 30)` (hand-out) |
| `balance-sim-report.test.ts` ~252, ~332, ~376, ~377, ~480, ~496, ~501; `balance-sim.test.ts` ~307-319, ~823, ~1008 | the frontier argument goes |
| `balance-sim-report.test.ts:37`, `balance-sim.test.ts:813` (`run`), `balance-sim-report.test.ts` ~391 (`runWith`) | `RunRecord` gains `shape` |
| `balance-sim-report.test.ts` ~267, ~290 | `traitStackMaxima` takes the sides |
| `balance-sim-report.test.ts` ~151 | `analyzeFight` takes the roster |
| `rewards.test.ts` ~220-222 | `perkPointsFor` takes the config |

Comment-only: `store.test.ts` ~721 names `contentFrontier` in the crash-route test's comment (hand-out).

Set-up changes with no failure to log: the `stat-modifier stack attribution` describe's shared ids
`A`/`B`/`C` become opaque (hand-out).

## After the existing tests were adjusted

See the report's gate table: the full suite, `tsc -b`, lint, format, build and both docs checks.
