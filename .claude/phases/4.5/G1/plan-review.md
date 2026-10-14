# Plan review — 4.5-G1: The demo, descent loop and viewer

## Round 1

Checked against the kickoff, `phases/4.5/G1/brief.md`, `phases/4.5/brief.md#the-demo`,
`spec/store.md` and the code on the slice branch (`state/store.ts`, `engine/generation.ts`,
`engine/combat.ts`, `engine/curves.ts`, `state/rewards.ts`, `state/balance-sim.ts`,
`data/species/starters.ts`, `src/ui/CombatDemo.tsx`).

**Verdict:** changes needed. The approach is sound and most of the plan stands; the fixes below are
small, but three of them (F2, F3, F5) are tests or lines that would ship wrong as written.

### Plan fixes

- **F1 — The timer effect's key (Approach; `playback.ts`; ASSUMPTION 2).** "One effect keyed on
  that state" re-runs on any new state object, so an action that changes nothing visible (pressing
  the speed already selected, a skip that is ignored) restarts the current beat's timeout, and a
  speed change during the 3-second wait restarts the wait. End state: `playback.ts` exports a pure
  `timerKey(state)` (phase, fight, revealed, and speed only outside the wait); the effect's
  dependencies are that key and `pendingDelayMs`; the reducer returns the same state object for a
  no-op action. `playback.test` adds: each no-op action returns the identical object; a speed
  change during the wait leaves `timerKey` unchanged; a speed change while playing changes it.
  Fails with the key on the whole state object.
- **F2 — "Picker never throws" names the wrong mechanism (`floorPicker.test`).** `checkDescend`
  already refuses a non-integer or `< 1` floor (`NaN`, `0`, `2.5`, `-3`) as `floor-out-of-reach`
  without touching `biomeForFloor` (`state/store.ts`, `checkDescend`), so removing
  `parseFloorField` throws nothing. What stops the throw is `floorInfo`'s whole-number-≥-1 guard
  in front of `biomeForFloor`; the row's "fails when" is that guard removed. `parseFloorField`
  stays (it stops `""` reading as 0 and `"0x10"` / `" 1e1"` reading as real floors), with its own
  cases. Expected reasons: a 400-digit string parses to `Infinity`, which is not an integer, so it
  is `floor-out-of-reach`, not `beyond-content-frontier`; `"99999999999999999999"` (`1e20`) is
  `beyond-content-frontier`, and `floorInfo(1e20)` returns without throwing (floors past 100 take
  `biomeForFloor`'s hashed draw).
- **F3 — The first-clear snapshot test can't fail (`descendFlow.ts`; ASSUMPTION 3).** As written,
  `recordBossKill('broodmother')` then a descent that defeats no boss: before and after are equal
  whether the snapshot is taken before or after `descend`, so the test is insensitive. A fresh
  party can't reach floor 10 in a unit test. End state: `runDescent(store, floor)` takes the store
  API (`Pick<StoreApi<GameState & GameActions>, 'getState'>`), reads `bossesCleared` from
  `getState()` before calling `descend` and from a fresh `getState()` after (a state object read
  before `descend` keeps the old `Set`: the store replaces it, `withBossCleared`). Its test lives in
  `descendFlow.test` on a hand-built store whose `descend` returns a `bossDefeated` and adds it to
  `bossesCleared` as the real one does: the result is a first clear, and fails with the snapshot
  taken after `descend`; a second store where the boss is already cleared gives a repeat clear.
  The presence test drops this row.
- **F4 — No `100` literal in the boss line (`descentText.ts`; ASSUMPTION 7).** The points figure
  is `perkPointsFor(bossesAfter) − perkPointsFor(bossesBefore)` (`CONVENTIONS.md#no-magic-numbers`;
  the rule is `spec/progression.md#perk-points`). First clear is still `bossDefeated` absent from
  `bossesBefore`. The repeat-clear wording stays "already cleared, no perk points".
- **F5 — The floor line mislabels a draw and has no source for N (`descentText.ts`;
  ASSUMPTION 7).** `FightResult` is `'win' | 'loss' | 'draw'`, and round-cap draws are a real outcome
  (`phases/4.5/brief.md#balance-verdicts`). `fightRecords` stops at the first non-win, so it can't
  give the floor's fight count. End state: `floorResultLine(outcome, fights)` reads `Floor n:
  cleared` or `Floor n: <loss|draw> at fight k of N`, with N from `floorInfo` for the descended
  floor (the line already pinned against `generateFloor`). `descentText.test` covers a clear, a
  loss and a draw.
- **F6 — The viewer header (`fightList.ts` / `DescentViewer.tsx`).** The brief's header carries
  the XP and level-ups after the fight as well as the levels going in
  (`phases/4.5/brief.md#descent-result-and-viewer-g1`). `fightHeader` returns the fight's row
  from `fightRows` with its `levelsIn`, so the header and the list read one helper.
- **F7 — Seed field trimming (ASSUMPTION 4).** `parseSeedField` trims before the regex as
  `parseFloorField` does, so `" 42 "` is 42 in both fields. Add `" 42 "` to the accepted cases.
- **F8 — The label's slot (ASSUMPTION 6).** Read `creature.slot + 1`, not the array position. The
  two agree today (the store compacts the party to dense slots, `resolvePlayerParty`; generation
  numbers enemy slots), but the slot is the field the engine itself uses for adjacency and ties.
  Side words "ally" / "foe" stand.
- **F9 — Name the presence test's spec (ASSUMPTION 12).** There is no default spec: name the one
  the pinned seed clears with (the first of `SPEC_CHOICES` is fine).
- **F10 — Perk boundary test (`perkPoints.test`).** Levels at `maxLevel` are `invalid-level`, not a
  budget answer: the "ok exactly when cost ≤ free" sweep covers `level + 1 ≤ maxLevel` only, and
  each spec is entered with `setSpec` (which refunds) before its sweep.
- **F11 — Boss adds in the name table (`names.ts`).** Every add is a member of its biome's
  `speciesPool` (`generateFloor`'s add lookup throws otherwise), so the `boss.adds` rows duplicate
  pool rows. Build the table from the starters, every pool and every `boss.creature`; the test's
  "fails when" is the boss row removed.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| 1 | **Decide-point** (DP1) | Changes the G1 brief's "timer handling … moved and reused". |
| 2 | **Correct** | F1: a speed change never restarts the wait. |
| 3 | **Confirm**, with F3 | The module is right; its test and signature change. |
| 4 | **Correct** | F7 (trim). The regex and the two reasons stand. |
| 5 | **Confirm** | With F2's expected reasons. |
| 6 | **Correct** | F8 (`creature.slot + 1`). |
| 7 | **Correct** | F4 and F5. Level-up text `<label> 1 → 2` stands. |
| 8 | **Confirm** | The fight list is the way back to an earlier fight. |
| 9 | **Confirm** | Skip to end of floor and the speed buttons stay live during the wait (F1 makes the speed safe there). |
| 10 | **Confirm** | |
| 11 | **Confirm** | |
| 12 | **Confirm**, with F9 | |
| 13 | **Confirm** | The kickoff's rule; F1's `timerKey` test narrows what only the click-through covers. |
| 14 | **Confirm** | `STARTERS` is the same four creatures `DEFAULT_DEPS.standaloneCreatures` lists. |
| 15 | **Confirm** | The deepest authored ordinary floor, 29, has 38 fights, not 39. |
| Brief (G1, G2) strings | **Confirm** for G1 | The plan's two notes are the brief's exact strings. G2 confirms its own. |

Also checked and fine: golden policy matches the kickoff (byte-identical, no new golden,
`newGame.test.ts` unchanged unless DP2 changes that); nothing in the engine spawns a creature
mid-fight (`engine/actions.ts`), so every event id is in one of the record's parties and
`label`'s throw is a real-bug signal; kills counting every enemy `CreatureDied` (a revived enemy
counted twice) matches what rewards bank; `fightCount` on a boss floor and `isBossFloor` alone are
both caught by the info-line test.

### Decide-points

- **DP1 — Playback as a reducer plus one timeout effect, not 3.5's interval (ASSUMPTION 1).**
  The G1 brief says the timer handling is "moved and reused, not rewritten", and the plan rewrites
  it. **Recommend: accept.** 3.5's timer served one fight with one control; G1 adds a wait, three
  speeds, jumps and runs across fights, and a `clearTimer()` hand-called from each handler is the
  shape the kickoff warns stacks timers. The reducer also makes the playback rules unit-testable
  without Testing Library, which 3.5's never was. What 3.5 contributes survives: the beat pace,
  beats, the cosmetic reveal, and no side effect in an updater. If accepted, the G1 brief's Known
  line becomes: event text and beat grouping are moved, not rewritten; the playback clock is new.
- **DP2 — Retire `startNewGame`.** After this slice nothing calls it but its own test: `startRun`
  is the one start path, and G2's New game returns to the start screen, which calls `startRun`
  again. Two helpers that both start a game are the two paths the kickoff's "one start path" trap
  is about. **Recommend: retire it.** `newGame.ts` keeps `generateRunSeed`; its `startNewGame`
  cases in `newGame.test.ts` move to `startRun.test` (blank field draws from the injected source),
  and the report reconciles the test count. The alternative, keeping it, costs nothing now but
  leaves a dead export for the next slice to wonder about.

### Decisions

- **DP1:** accepted. Playback is a pure reducer plus one timeout effect; event text and beat
  grouping are moved, not rewritten.
- **DP2:** accepted. `startNewGame` is retired; `startRun` is the only start path, and the
  `startNewGame` cases move from `newGame.test.ts` to `startRun.test`.
- Plan fixes F1–F11 and the assumption calls stand as written above.

### Docs edited

- `.claude/phases/4.5/G1/brief.md`, `phases/4.5/G1/brief.md#known`: the timer handling is no longer
  "moved"; the playback clock is new (DP1).
- `.claude/phases/4.5/G1/kickoff.md`, the reading list's `CombatDemo.tsx` line: the timer handling
  is replaced, not moved (DP1).
- `.claude/phases/4.5/G1/kickoff.md`, Golden policy and the "One start path" trap: `newGame.test.ts`
  changes as `startNewGame` is retired, and the start helper is the only start path (DP2).
