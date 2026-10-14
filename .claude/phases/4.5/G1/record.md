# Record — 4.5-G1: The demo, descent loop and viewer

The first half of the run-loop demo replaces the stub on the live site. No file under
`src/engine`, `src/state` or `src/data` changed.

## Files changed

**Renamed:** `src/ui/CombatDemo.tsx` → `src/ui/DescentViewer.tsx`.

**Changed:** `src/app/App.tsx` (start screen → run screen, side panel), `src/app/newGame.ts`
(`startNewGame` removed, header rewritten), `src/app/newGame.test.ts` (3 → 2 tests), `src/index.css`.

**New, `src/app`** (pure, each with a test): `copyFight`, `descendFlow`, `descentText`,
`eventText`, `fightList`, `fightView`, `floorPicker`, `names`, `perkPoints`, `playback`,
`refusals`, `registries`, `sidePanel`, `startRun`; plus `presence.test.ts`.

**New, `src/ui`:** `DescentResult`, `RunScreen`, `SidePanel`, `StartScreen`.

## Shape

- `startRun` is the one start path: `newGame` → `setSpec` → `runScriptedIntro`, the simulator's
  run start, after validating the seed field.
- Playback is a pure reducer over `{ phase, fight, revealed, speed }` with one `timer-elapsed`
  action; the viewer owns the reducer and one timeout effect keyed on `timerKey`, and is keyed by
  the descent's id so a new descent remounts it.
- The viewer builds each fight's set-up with `createCombat` once per descent and reads spell
  names and line-up HP from it.
- Tests: 144 more than `main` (1993 → 2137), all in `src/app`.

## Not verified

The browser click-through was not run (no browser tool in the build session).
