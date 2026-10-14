# PR review r2 — 4.5-G1: The demo, descent loop and viewer

Reviewed: branch `4.5-g1` at `4a89ff0` ("fix"), against `main` at `1c9f587` and round 1's
`51a955d`. Inputs: `kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r2.md`,
`review-r1.md`, `handout-r1.md`, `report-r2.md`, `record.md`, and the living docs on the branch.
Evidence: `evidence/checks-r2.md`, `evidence/click-through-r2.md`.

## Verdict

**Fixes: one action for Duncan and a cleanup hand-out** (`handout-r2.md`, three small items). Every
item of `handout-r1.md` is in the code and pinned by the test the report names: the six game-layer
homes (A1–A7) have one home each in the engine, the store and the data, the demo reads them, and
the line-up shows Allies and Foes (checked in the browser). Goldens, the corpus digest and every
existing engine, state and data test are untouched but the two the hand-out allowed. What blocks
approval is that the branch as pushed doesn't build, and two cleanup items a review doesn't leave
in.

## Real fixes

1. **The pushed commit fails `tsc -b`, `build` and `test` (Duncan: delete five files).**
   `4a89ff0` still holds `src/app/descendFlow.ts`, `descendFlow.test.ts`, `perkPoints.ts`,
   `perkPoints.test.ts` and `registries.ts`. `descendFlow.test.ts` calls the old four-argument
   `bossResultLine`, so `npx tsc -b` reports two TS2554 errors and the file has 2 failing tests;
   CI on the PR is red. The coding agent never deletes, and listed them under **To delete**;
   they need deleting before `/slice-fix`, in the same commit as the round-3 fixes or before it.
   Nothing imports them: with the five removed, every gate is green (below).

## Cleanup (hand-out C1–C3)

2. **A stale test title (C1).** `startRun.test.ts`'s "the restated seed bound meets the store"
   names the restatement A6 removed: `startRun.ts` imports `MAX_RUN_SEED` now. The leftover sweep's
   one hit.
3. **The boss line's points figure is unpinned (C2).** `bossResultLine` prints
   `+${outcome.perkPointsGained}`, but every first-clear test uses 100, so a line that hard-codes
   `+100 perk points` passes `descentText.test` and the whole suite (M18). That literal would be the
   "100 per boss" rule restated in `src/app`, the kind of copy this round moved out. Round 1 had a
   `+200` case for exactly this; it went with the snapshot subtraction. A hand-built outcome with
   250 points pins it.
4. **`record.md` (C3)** still lists the five files as "Obsolete, to delete", and its **Not
   verified** says the side-heading check is the next review's; it has now been run.

## Decide-points

- **DP1: `spec/store.md` is over its budget: 4,709 B against 4 KB.** This review writes A1–A3,
  A4 and A6 into it (`floorPreview`, `perkPointSummary` and `perkPointsSpent`,
  `bossFirstCleared` and `perkPointsGained`, `DEFAULT_REGISTRIES`, `MAX_RUN_SEED`), as the brief
  asked; it was at 3,933 B. **Recommend: raise the budget to 6 KB** (4,709 B plus 20%, rounded up
  to a whole KB, the table's own rule). The growth is new store rules: two read-only answers in
  the store-actions list and two outcome fields, beside the actions and fields they belong with.
  A condense finds nothing to cut (the file has no history or duplicates; each addition is a
  rule a caller needs), and a split would put `floorPreview` apart from `canDescend` and the
  outcome's fields apart from `FloorOutcome`, files a store slice reads together. The alternative
  is a condense slice before G2's kickoff, which I'd expect to come back with "raise".
  **Duncan's call: raise to 6 KB.** `workflow/budgets.md` is edited (Docs edited).

The report's other questions need nothing more:

- **ASSUMPTION 1–5** stand. ASSUMPTION 3 (`floorPreview` previews past the content frontier, only
  `descend` refuses there) is now written into `spec/store.md#store-actions`; the browser shows
  floor 31's preview beside its refusal, as round 1 accepted.
- **Spec questions:** the brief's `#floor-picker-g1` and `#descent-result-and-viewer-g1` already
  read the store's preview and the outcome (round 1 edited them); `spec/store.md` now lists the
  new answers and fields; `spec/run.md#boss-floor-generation` names `floorShape` (doc edits below).

## What was verified, and how

Details and every count in `evidence/checks-r2.md`. Sandbox clone, `npm ci` on each tree, Node 22,
Vitest 5.0.3 matching the lockfile.

- **The pushed commit:** `npx tsc -b` fails (2 × TS2554 in `descendFlow.test.ts`) and that file's
  tests fail 2 of 4. Item 1.
- **Gates, with the five files removed:** `npm run test` 2151 tests (2150 passed, 1 skipped),
  `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations` and `-- comments`: all
  green. Per-file counts match the report's table exactly; outside `src/app`, only
  `store.test.ts` (35 → 38) and the six new files differ from `main`.
- **Golden policy:** no `__golden__` or corpus file in the diff; all 145 golden fixtures' 1341
  exports deep-equal to `main`'s (shared registries included); `store.test.ts`'s diff is additions
  only, `species/names.test.ts`'s only its list's source.
- **Each hand-out r1 item, in the code:** `floorShape` is `isBossFloor && biome.boss`, one fight or
  `fightCount`, and `generateFloor` reads both its branch and its loop bound from it;
  `resolveFloorBiome` is the one resolution `descend` and `floorPreview` call (the old
  `findIndex` by id and the new `indexOf` of the found biome give the same number);
  `floorPreview`'s guard returns `null` before resolving; `checkSetPerkLevel` sums through
  `perkPointsSpent` over a copy with the proposed level; `bossFirstCleared` is `withBossCleared`
  returning a new set, which it does only for a boss not already in it (`store.ts`'s documented
  same-reference contract); `DEFAULT_REGISTRIES` is the store's default deps and the viewer's;
  `ALL_CREATURE_TEMPLATES` and `BOSS_CREATURES_BY_ID` feed `names.ts` and
  `species/names.test.ts`; `MAX_RUN_SEED` is the store's and `startRun.ts` imports it; `RunScreen`
  reads the preview's fight count before calling `descend` directly; `splitLineUp` by `side`;
  B2's 30/20 HP case; B3's player and enemy rat; B4's two citations state what the comment says;
  B5's sentence is gone.
- **Mutations:** 23 over the fix diff and the hand-out's pins (M1–M24 in the evidence). 22 are
  caught by the test the report names; M18 survives `descentText.test` and the full suite (item
  3). The report's one uncaught mutation (`floorShape` fights + 1 against the store test) is caught
  by `generation-floor-shape.test` (M3).
- **Browser,** headless Chromium on the dev server: Allies and Foes headings on every fight with
  the right creatures under each, the info line from the preview (floors 1, 2, 10, 31), "Fight n /
  11" on a floor 2 lost at fight 7, the side panel's perk points, playback still running, no
  console warning or error (`evidence/click-through-r2.md`).
- **Leftover sweep** over `src/` and the living docs for every name the round removed or moved:
  one hit, item 2.
- **Mailbox:** step files, `record.md`, and `evidence/` (r1 and r2). Nothing to delete there.

## Docs edited

- `.claude/spec/store.md`, `spec/store.md#newgame`: the seed range is `0..MAX_RUN_SEED`, exported
  (A6).
- `.claude/spec/store.md`, `spec/store.md#store-actions`: `floorPreview(floor)` and
  `perkPointSummary()`, with `perkPointsSpent` as the one spend sum the `over-budget` check uses
  (A1, A2).
- `.claude/spec/store.md`, `spec/store.md#a-descents-outcome`: `bossFirstCleared` and
  `perkPointsGained` (A3); the default store's registries are `DEFAULT_REGISTRIES` (A4).
- `.claude/spec/run.md`, `spec/run.md#boss-floor-generation`: `floorShape` is the one home of the
  boss-floor test and the fight count; `generateFloor` and `floorPreview` read it (A1).
- `.claude/spec/progression.md`, `spec/progression.md#specializations-are-data`: the link to the
  store actions names the earned, spent and free summary (A2).
- `.claude/spec/creatures.md`, `spec/creatures.md#species-and-creature-data`:
  `ALL_CREATURE_TEMPLATES` and `BOSS_CREATURES_BY_ID` (A5).
- `phases/4.5/brief.md#the-demos-game-layer-homes` stays as the built entry (the phase's plan).
- New evidence: `.claude/phases/4.5/G1/evidence/checks-r2.md` and
  `.claude/phases/4.5/G1/evidence/click-through-r2.md`.
- `.claude/workflow/budgets.md`: `spec/store.md`'s budget is 6 KB (DP1, Duncan's decision): its
  growth is new store answers and outcome fields that belong beside the actions and fields they
  extend, so a condense has nothing to cut and a split would scatter one subsystem. 4,709 B plus
  20%, rounded up.
- `docs:check -- citations` passes with these edits (693 in 503 files); `-- budgets`: none over.
