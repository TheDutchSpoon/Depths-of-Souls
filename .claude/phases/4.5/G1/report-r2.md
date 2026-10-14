# Report r2 — 4.5-G1: The demo, descent loop and viewer

Built to `handout-r1.md`. Nothing committed, nothing deleted.

## Gates

**The five obsolete files are still in the tree** (see To delete): `descendFlow.test.ts` calls the
old `bossResultLine` signature, so with them present `npx tsc -b` and `npm run build` fail and
`npm run test` has 2 failures, all in that file. The gates below were run with the five files
moved out to scratch and moved back afterwards. Once they are deleted the tree is in the state
that was measured.

| Gate | Result |
| --- | --- |
| `npm run test` | pass: 2151 tests, 2150 passed, 1 skipped (as on `main`) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | pass |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS |
| `npm run docs:check -- comments` | PASS |

## Items

**A1. Floor preview.** `floorShape(floor, biome, config)` in `generation.ts` returns `{ boss,
fights }`; `generateFloor` takes its branch and loop bound from it. The store's `floorPreview(floor)`
is `null` unless the floor is a whole number ≥ 1, and otherwise reads `resolveFloorBiome` (the one
private helper `descend` and `floorPreview` both call: `biomeForFloor` over `deps.biomes`, the
state's `atlasPins` and `runSeed`, plus the biome's 1-based number) and `floorShape` with
`deps.balanceConfig`. Checked: every golden and the corpus digest unchanged (below); the new tests.

**A2. Perk points.** `perkPointsSpent(spec, perkSpend)` exported; `checkSetPerkLevel` calls it over
`perkSpend` with the proposed level set (`new Map(perkSpend).set(perkId, level)`);
`perkPointSummary()` on the store. `perkPoints.test.ts`'s cases moved to
`store-perk-summary.test.ts`, the boundary sweep included (every spec has an allowed and an
`over-budget` answer, asserted).

**A3. Boss clear in the outcome.** `FloorOutcome.bossFirstCleared` and `perkPointsGained`, from the
`bossesCleared` set before the descent and `withBossCleared` after it (so `perkPointsGained` is
`perkPointsFor(after) - perkPointsFor(before)`). Three tests in `store.test.ts`'s `boss floors`
describe, on its existing boss-floor setup: first win `true` / 100 then the repeat `false` / 0;
`recordBossKill` then a win `false` / 0; a non-boss floor `false` / 0.

**A4. Registries.** `src/data/registries.ts` exports `DEFAULT_REGISTRIES`
(`Required<CreateCombatRegistries>`); the store's default deps take `scripts`, `traits` and
`statuses` from it; `DescentViewer`, `copyFight.test` and `fightView.test` read it.
`src/app/registries.ts` is no longer imported (To delete). `copyFight.test`'s replays through it
pass.

**A5. Creature templates.** `src/data/creatures.ts`: `ALL_CREATURE_TEMPLATES` (starters, then each
biome's pool creatures, then each biome's boss, `BIOMES` order) and `BOSS_CREATURES_BY_ID`.
`species/names.test.ts` builds its list from it; its three assertions and the 61 count are
unchanged. `src/app/names.ts` builds `DEMO_NAMES` from it with a one-argument `buildNameTable`
(per-biome walk gone; `creatureName` still throws on a miss) and `bossName(bossId)` reads
`BOSS_CREATURES_BY_ID` (still throws on an unknown id). `creatures.test.ts` asserts the order and
that every biome's boss is in both exports.

**A6. Run-seed bound.** `MAX_RUN_SEED` exported from `store.ts`; `newGame` still uses it;
`startRun.ts` imports it and `MAX_SEED` is gone. `startRun.test` untouched and passing.

**A7. The demo reads the new homes.** `floorInfo` and `FloorInfoContext` gone from
`floorPicker.ts`; `floorInfoText` takes a `FloorPreview`; `RunScreen` calls `floorPreview`.
`sidePanelRows` reads `state.perkPointSummary()`. `RunScreen` calls `descend` directly, reading
`floorPreview(floor).fights` before the descent; `Descent` is `{ id, outcome, fights }`.
`bossResultLine(outcome)` is `null` without a boss, `Defeated <boss>: first clear, +<n> perk
points` on `bossFirstCleared`, else `Defeated <boss>: already cleared, no perk points`.
`descentText.test` keeps a first and a repeat clear over hand-built outcomes (plus no boss and an
unknown id). `presence.test`, `sidePanel.test`, `copyFight.test` and `fightView.test` drive
`store.getState().descend(...)` the way `RunScreen` does.

**B1. Line-up under side headings.** `fightView.ts` exports `splitLineUp(lineUp)` →
`{ allies, foes }`; `DescentViewer` renders **Allies** and **Foes** `<h4>` headings, each with its
`lineUpText` lines. Test: two player creatures and one enemy, unique names.

**B2. Perk effects in the set-up fight.** `fightView.test` case: base Health 20, one player and one
enemy creature, `playerEffects` `[{ stat-modifier, health, 1.5 }]`: HP `[30, 20]`.

**B3. Labels across both parties.** `fightList.test`: a player `rat` and an enemy `rat`, the player
rat 1 → 2: `fightRows` gives `Rat (ally 1) 1 → 2`, `fightHeader`'s `levelsIn` gives `Rat (ally 1):
level 1`.

**B4. Citations.** `fightView.ts` cites `spec/creatures.md#innate-spells` for the prepend and
`spec/statuses.md#health-is-a-modifiable-stat` for the HP; `docs:check -- citations` resolves them.

**B5.** The sentence is deleted from `generation.ts`.

**B6. `record.md`** updated: Files changed (engine, state, data included), Shape, test count, and
Not verified.

## Test count, file by file

`main`: 1993. Round 1: 2137. Now 2151 (+158 on `main`, +14 on round 1), with the five obsolete
files out of the tree.

| File | `main` | r1 | now |
| --- | --- | --- | --- |
| `src/app/descendFlow.test.ts` | – | 4 | gone (to delete) |
| `src/app/perkPoints.test.ts` | – | 6 | gone (to delete) |
| `src/app/floorPicker.test.ts` | – | 21 | 16 |
| `src/app/descentText.test.ts` | – | 9 | 8 |
| `src/app/fightList.test.ts` | – | 5 | 7 |
| `src/app/fightView.test.ts` | – | 12 | 14 |
| `src/state/store.test.ts` | 35 | 35 | 38 |
| `src/state/store-floor-preview.test.ts` | – | – | 10 |
| `src/state/store-perk-summary.test.ts` | – | – | 7 |
| `src/engine/generation-floor-shape.test.ts` | – | – | 3 |
| `src/data/creatures.test.ts` | – | – | 2 |
| `src/data/registries.test.ts` | – | – | 1 |

The other `src/app` files are unchanged in count (`copyFight` 4, `eventText` 31, `names` 5,
`newGame` 2, `playback` 23, `presence` 1, `refusals` 3, `sidePanel` 3, `startRun` 18);
`species/names.test.ts` is still 3. Net: −4 −6 −5 −1 +2 +2 +3 +10 +7 +3 +2 +1 = +14.

**Deleted or moved `src/app` tests and their new homes**
- `descendFlow.test.ts` (4): its first/repeat clear cases → `store.test.ts` (A3, 3 tests) and
  `descentText.test` (hand-built outcomes). "A refused descent returns its reason" and "the outcome
  is the store's own" have no `src/app` home: `descend` is the store's, and `presence.test` drives
  it directly (`beyond-content-frontier`, `empty-party`, a cleared floor-1 outcome); the
  `no-spec` refusal is covered by the store's own tests. The snapshot mechanism no longer exists.
- `perkPoints.test.ts` (6) → `store-perk-summary.test.ts` (7: the six plus `perkPointsSpent`).
- `floorPicker.test.ts` `floorInfo` cases (5: null inputs, huge floor, agreement with
  `generateFloor`, boss floors, boss-less tenth floor) → `generation-floor-shape.test.ts` (3) and
  `store-floor-preview.test.ts` (10). The no-throw case for each field text stays in
  `floorPicker.test` over `floorPreview`.
- `descentText.test`: the two-boss-gap case (+200) is gone with the snapshot subtraction.

## Golden policy

- `git diff --stat 51a955d -- src/engine src/state src/data`:
  - `src/engine/generation.ts` +22/−3: `floorShape`, `generateFloor` reads it (A1), the sentence (B5);
  - `src/state/store.ts` +92/−22: A1, A2, A3, A4, A6;
  - `src/state/store.test.ts` +38: three outcome tests (A3), additive;
  - `src/data/species/names.test.ts` +1/−13: builds from `ALL_CREATURE_TEMPLATES` (A5).
  - Untracked, new: `src/data/creatures.ts`, `creatures.test.ts` (A5), `registries.ts`,
    `registries.test.ts` (A4), `src/engine/generation-floor-shape.test.ts` (A1),
    `src/state/store-floor-preview.test.ts` (A1), `store-perk-summary.test.ts` (A2).
- No `__golden__` fixture or corpus file is in `git diff 51a955d --name-only`. The three
  `balance-ci-*` tests and the corpus tests pass unchanged, so the digest is unchanged; it was not
  regenerated. No existing engine, state or data test changed but `names.test.ts` (A5) and the three
  new tests added to the end of `store.test.ts` (`ASSUMPTION 1`).

## Mutations (each applied, the named tests run, then reverted)

| Test | Mutation | Fails |
| --- | --- | --- |
| `floorShape` boss-less tenth floor | drop the biome-has-boss check | yes |
| `floorShape` agreement; floors 10/20/30 | boss floor uses `fightCount` | yes (2) |
| `floorPreview` pinned biome | resolve with an empty `atlasPins` | yes |
| `floorPreview` null inputs | remove the guard | yes (6) |
| `floorPreview` fight count against a cleared floor | `floorShape` fights + 1 | **no**: `generateFloor` reads the same `floorShape`, so both move together. The test pins the contract; the engine test pins the agreement with the generator's boss flag and length |
| `perkPointsSpent` / summary / boundary | sum without `costPerLevel` | yes (5) |
| `bossFirstCleared` | always true on a boss defeat | yes (2) |
| `perkPointsGained` | constant 0 | yes |
| `bossResultLine` | ignore `bossFirstCleared` | yes |
| `bossName` | return the id | yes |
| `ALL_CREATURE_TEMPLATES` | omit the bosses | yes (5) |
| `splitLineUp` (B1) | foes filter matches nothing | yes |
| B2 | drop `effects: record.playerEffects` | yes |
| B3 | `fightRow` given the player party alone | yes |
| B3 | `fightHeader` given the player party alone | yes |

## ASSUMPTIONs

1. The A3 tests sit inside `store.test.ts`'s `boss floors` describe, because its boss fixtures are
   private to that describe; this adds tests to an existing file and changes none.
2. `buildNameTable` stays exported with one argument (a creature list), so `names.test` can build a
   table without the bosses.
3. `floorPreview` previews floors past the content frontier (`descend` refuses them), as the old
   `floorInfo` did.
4. The line-up headings are `<h4>`, under the fight's `<h3>` title.
5. `src/app` tests that drove `runDescent` now call `store.getState().descend(...)` directly.

## Spec questions

- `phases/4.5/brief.md#floor-picker-g1` and `#descent-result-and-viewer-g1` may still describe
  `floorInfo`, `runDescent` or the snapshot-based boss line; I did not edit them.
- `spec/store.md` does not yet list `floorPreview`, `perkPointSummary`, `perkPointsSpent`,
  `MAX_RUN_SEED`, `FloorOutcome.bossFirstCleared` or `perkPointsGained`.
- `spec/run.md#boss-floor-generation` could cite `floorShape` as the one home of the boss-floor
  test.

## Content changes

None.

## To delete

`src/app/descendFlow.ts`, `src/app/descendFlow.test.ts`, `src/app/perkPoints.ts`,
`src/app/perkPoints.test.ts`, `src/app/registries.ts`. Nothing imports them (`descendFlow.test.ts`
is the only one failing, on the old `bossResultLine` signature).

## Not checked

The browser check of B1 (the Allies and Foes headings) is the next review's.
