# Checks — 4.5-G1, review r2

Branch `4.5-g1` at `4a89ff0` ("fix"), against `main` at `1c9f587` and round 1's `51a955d`. Sandbox
clone, `npm ci` on each tree, Node 22.22.0, Vitest 5.0.3 (the lockfile's).

## The pushed commit fails two gates

`4a89ff0` still holds the five files the report lists under **To delete**. On it:

```
$ npx tsc -b
src/app/descendFlow.test.ts(39,37): error TS2554: Expected 1 arguments, but got 4.
src/app/descendFlow.test.ts(49,37): error TS2554: Expected 1 arguments, but got 4.
$ npx vitest run src/app/descendFlow.test.ts
Tests  2 failed | 2 passed (4)
```

So `npm run build` (which runs `tsc -b`) and `npm run test` fail on the branch as pushed, and CI
on the PR is red. Every measurement below is on `4a89ff0` with `src/app/descendFlow.ts`,
`descendFlow.test.ts`, `perkPoints.ts`, `perkPoints.test.ts` and `registries.ts` removed (a
scratch commit in the sandbox), which is the tree the report measured.

## Gates (five files removed)

| Gate | Result |
| --- | --- |
| `npm run test` (JSON reporter) | 2151 tests: 2150 passed, 1 skipped, 246 files |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | pass |
| `npx tsc -b` | clean |
| `docs:check -- citations` | PASS, 690 in 498 files (693 in 503 with this review's doc edits) |
| `docs:check -- comments` | PASS, 7569 comments, 1886 titles |
| `docs:check -- budgets` | 0 over before this review's edits; `spec/store.md` 4.7 KB of 4 after (DP1) |

`main`: 1993 tests (1992 passed, 1 skipped) in 229 files. Per file, every count matches the
report's table: `store.test.ts` 35 → 38, new `store-floor-preview` 10, `store-perk-summary` 7,
`generation-floor-shape` 3, `data/creatures` 2, `data/registries` 1; `src/app` as listed
(`floorPicker` 16, `descentText` 8, `fightList` 7, `fightView` 14, the rest unchanged from round
1). Every file outside `src/app` but `store.test.ts` and the new ones is identical in count to
`main` and passes.

## Golden policy

- `git diff --name-status 1c9f587 4a89ff0`, outside `src/app`, `src/ui` and `.claude`: the seven
  new files, `generation.ts`, `store.ts`, `store.test.ts`, `species/names.test.ts`, and round 1's
  `src/index.css`. No `__golden__` fixture and no corpus file.
- Every export of all 145 `__golden__/*.fixture.ts` (1341 exports, shared registries included),
  imported on both trees through `import.meta.glob` and deep-compared: identical.
- `store.test.ts`'s diff is 38 added lines, none removed: three tests at the end of the
  `boss floors` describe. `species/names.test.ts` changes only where its list comes from; its
  three assertions and the 61 count are untouched.
- The corpus digest test passes with its fixture unchanged.

## Mutations (fix diff `51a955d..4a89ff0`)

Each applied in the sandbox, then the named test files plus `src/engine/corpus-digest.test.ts`
run, then reverted.

| # | Mutation | Failing (tests) |
| --- | --- | --- |
| M1 | `floorShape`: drop the biome-has-boss check | `generation-floor-shape` 1 |
| M2 | `floorShape`: a boss floor uses `fightCount` | `generation-floor-shape` 2, `store-floor-preview` 1 |
| M3 | `floorShape`: ordinary floor fights + 1 | `generation-floor-shape` 1 (the boss-less floor against `fightCount`) |
| M5 | `floorPreview` resolves with empty `atlasPins` | `store-floor-preview` 1 |
| M6 | `floorPreview` guard removed | `store-floor-preview` 6, `floorPicker` 1 |
| M7 | `floorPreview`: `boss` always false | `store-floor-preview` 1 |
| M8 | `perkPointsSpent` without `costPerLevel` | `store-perk-summary` 5 |
| M9 | over-budget check ignores the proposed level | `store-perk-summary` 4 |
| M10 | `perkPointSummary` spent always 0 | `store-perk-summary` 4, `sidePanel` 1 |
| M11 | `bossFirstCleared` true on any boss defeat | `store` 2 |
| M12 | `perkPointsGained` without the subtraction | `store` 2 |
| M13 | `perkPointsGained` constant 0 | `store` 1 |
| M14 | `DEFAULT_REGISTRIES.traits` empty | `registries` 1, `copyFight` 4 |
| M15 | `ALL_CREATURE_TEMPLATES` omits the bosses | `data/creatures` 2, `species/names` 1, `app/names` 2 |
| M16 | `BOSS_CREATURES_BY_ID` empty | `data/creatures` 1, `descentText` 2, `app/names` 1 |
| M17 | `bossResultLine` ignores `bossFirstCleared` | `descentText` 1 |
| M18 | `bossResultLine` prints a literal `+100` | **none**: `descentText` passes, and so does the full suite (2151 tests, 0 failed) |
| M19 | `splitLineUp`: foes take the player entries | `fightView` 1 |
| M20 | side panel shows earned as free | `sidePanel` 1 |
| M21 | `startRun`'s seed bound one lower | `startRun` 2 |
| M22 | set-up fight drops `playerEffects` (B2) | `fightView` 1 |
| M23 | `fightRow` labels over the player party alone (B3) | `fightList` 1 |
| M24 | `fightHeader` labels over the player party alone (B3) | `fightList` 1 |

The report's "`floorShape` fights + 1, not caught by the store test" holds, and the engine test
catches it (M3); the corpus digest does not.

## Leftover sweep

Over `src/` and the living docs for `floorInfo`, `FloorInfo`, `FloorInfoContext`, `runDescent`,
`descendFlow`, `DEMO_REGISTRIES`, `app/registries`, `app/perkPoints`, `MAX_SEED`, `bossesBefore`,
`bossesAfter`, `snapshot` (in the demo), "Never imported by src/ui",
"restate": one hit, `src/app/startRun.test.ts`'s title "the restated seed bound meets the store"
(the bound is imported now). `floorInfoText` stays, by the hand-out.
