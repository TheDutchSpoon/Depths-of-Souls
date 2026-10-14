# Record — 4.5-G1: The demo, descent loop and viewer

The first half of the run-loop demo replaces the stub on the live site. The demo restates no game
rule: six rules it needed have one home in the engine, the store or the data
(`phases/4.5/brief.md#the-demos-game-layer-homes`), and `src/app` reads them.

## Files changed

**Renamed:** `src/ui/CombatDemo.tsx` → `src/ui/DescentViewer.tsx`.

**Engine (`src/engine`):** `generation.ts` gains `floorShape(floor, biome, config)`, and
`generateFloor` takes its boss branch and its fight count from it; the false "Never imported by
src/ui/src/app" sentence is gone. New `generation-floor-shape.test.ts`.

**Store (`src/state`):** `store.ts` gains `floorPreview` and `perkPointSummary` on `GameActions`,
`FloorPreview` and `PerkPointSummary`, the exported `perkPointsSpent` and `MAX_RUN_SEED`,
`FloorOutcome.bossFirstCleared` and `perkPointsGained`, one private biome resolution that `descend`
and `floorPreview` share, and default deps read from `DEFAULT_REGISTRIES`. `store.test.ts` gains
three outcome tests. New `store-floor-preview.test.ts` and `store-perk-summary.test.ts`.

**Data (`src/data`):** new `registries.ts` (`DEFAULT_REGISTRIES`) and `creatures.ts`
(`ALL_CREATURE_TEMPLATES`, `BOSS_CREATURES_BY_ID`), each with a test;
`species/names.test.ts` builds its list from `ALL_CREATURE_TEMPLATES`.

**Changed, `src/app` and `src/ui`:** `App.tsx` (start screen → run screen, side panel),
`newGame.ts` (`startNewGame` removed, header rewritten), `newGame.test.ts` (3 → 2 tests),
`floorPicker.ts` (`floorInfo` gone; `floorInfoText` takes a `FloorPreview`), `descentText.ts`
(`bossResultLine` takes the outcome), `names.ts` (built from the data's templates; `bossName(id)`),
`sidePanel.ts` (reads `perkPointSummary()`), `startRun.ts` (imports `MAX_RUN_SEED`),
`fightView.ts` (`splitLineUp`; citations), `DescentViewer.tsx` (Allies and Foes headings),
`RunScreen.tsx` (calls `floorPreview` and `descend` directly), `src/index.css`, and the tests of
each.

**New, `src/app`** (pure, each with a test): `copyFight`, `descentText`, `eventText`, `fightList`,
`fightView`, `floorPicker`, `names`, `playback`, `refusals`, `sidePanel`, `startRun`; plus
`presence.test.ts`.

**New, `src/ui`:** `DescentResult`, `RunScreen`, `SidePanel`, `StartScreen`.

**Obsolete, to delete:** `src/app/descendFlow.ts`, `descendFlow.test.ts`, `perkPoints.ts`,
`perkPoints.test.ts`, `registries.ts`.

## Shape

- `startRun` is the one start path: `newGame` → `setSpec` → `runScriptedIntro`, the simulator's
  run start, after validating the seed field.
- The demo reads the store's floor preview, perk-point summary and boss-clear fields, and the
  data's registries and creature templates. The run screen calls `descend` directly and keeps the
  outcome with the floor's fight count from `floorPreview`, read before the descent.
- Playback is a pure reducer over `{ phase, fight, revealed, speed }` with one `timer-elapsed`
  action; the viewer owns the reducer and one timeout effect keyed on `timerKey`, and is keyed by
  the descent's id so a new descent remounts it.
- The viewer builds each fight's set-up with `createCombat` once per descent and reads spell
  names and line-up HP from it. The line-up prints under an **Allies** and a **Foes** heading.
- Tests: 158 more than `main` (1993 → 2151).

## Not verified

The browser click-through was run by the PR review, in
`.claude/phases/4.5/G1/evidence/click-through-r1.md`. The side-heading line-up (B1) is the next
review's browser check.
