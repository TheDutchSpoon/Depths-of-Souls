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

## Round 2

Checked `plan.md` (revision 1) against `plan-handout-r1.md`, the kickoff, `phases/4.5/G1/brief.md`,
`phases/4.5/brief.md#the-demo` and the code on the slice branch (`state/store.ts`,
`state/rewards.ts`, `state/balance-sim.ts`'s `runSeed`, `engine/combat.ts`'s `createCombat`,
`engine/generation.ts`, `data/specializations.ts`, `data/species/starters.ts`, `src/main.tsx`,
`eslint.config.js`).

**Fold-in:** every round-1 item is in the plan as its end state: `timerKey` and same-object no-ops,
`startNewGame` retired, the trimmed seed field, `floorInfo`'s guard as the no-throw mechanism,
`runDescent` over the store API with a fresh `getState()`, both result lines, `fightHeader`'s row,
`slot + 1`, the name table without `boss.adds`, the presence test's spec, the perk sweep's
`maxLevel` bound. Nothing dropped, nothing added beyond the hand-out.

**Verdict:** approved, with this round's fixes carried in the hand-out (the build reads `plan.md`
and `plan-handout-r2.md`, and the hand-out wins). None of them changes the approach; each is a
stated end state. A third plan round is the workflow's signal to pull the slice into a design pass,
and these don't warrant one.

### Plan fixes

- **F12 — One timer action (Approach; `playback.ts`).** The effect as written dispatches
  `'tick' | 'wait-elapsed'`, which means reading the phase inside the effect while its dependencies
  are only `timerKey` and `pendingDelayMs`. That draws `react-hooks/exhaustive-deps`' missing-dependency
  warning (a warning, so lint stays green), and the obvious way to silence it, adding `state` to the
  dependencies, is exactly the bug F1 removed. End state: the reducer has one `timer-elapsed`
  action that it reads by phase (waiting → playing at fight 0, beat 0; playing → the tick rule; done →
  the same object). The effect reads only `pendingDelayMs` and `dispatch`; its dependencies stay
  `timerKey` and `pendingDelayMs`. An effect may list a dependency it doesn't read, so this is
  lint-clean with no disable comment. `playback.test`'s wait→play and tick rows dispatch
  `timer-elapsed`, plus `timer-elapsed` while done returns the identical object.
- **F13 — Who owns the reducer (`DescentResult.tsx`, `DescentViewer.tsx`, `RunScreen.tsx`).** The
  fight list's jump buttons dispatch `jump`, but the reducer lives in `DescentViewer` and
  `DescentResult` reads as its sibling, so the plan doesn't say how the dispatch reaches it. The
  likely fix in the build, lifting `useReducer` into `RunScreen`, loses the descent-id key: a new
  descent would keep the old playback state, its `fight` index can exceed the new descent's
  records, and the reset that the key gives for free has to be hand-written. End state: one
  component, keyed by the descent id, owns the `useReducer` and the timer effect and renders both
  the result (floor line, boss line, fight list with its jump buttons) and the viewer, so a new
  descent remounts both. `RunScreen` holds only the latest descent and its counter.
- **F14 — The perk sweep can't fail (`perkPoints.test`).** Every perk in all three specs costs at
  most 100 per level (`data/specializations.ts`), so at a budget of 100 with nothing bought, every
  `level + 1` is allowed and `free` is 100 whatever `spent` says: a helper returning `spent: 0`
  passes. End state: per spec, after `setSpec`, buy something first so `spent > 0`, then sweep every
  perk with `level + 1 ≤ maxLevel`: `canSetPerkLevel(perk, level + 1).ok` equals
  `costPerLevel ≤ summary.free`, and the test asserts the sweep saw at least one allowed and one
  `over-budget` answer. Fails with `spent` dropped to 0 or summed without `costPerLevel`.
- **F15 — The restated seed bound (`startRun.test`).** The plan restates `MAX_RUN_SEED` in
  `src/app` (the store doesn't export it), as the kickoff lets the perk-spend sum be restated, but
  without the kickoff's matching check that the restatement agrees with the store. If the two drift,
  the helper passes a seed `newGame` throws on: the thrown page the seed trap is about. End state:
  on a real `createGameStore()`, `startRun` with `"4294967295"` starts a game, and the store's
  `newGame({ seed: 4294967296 })` throws; with the helper's `"4294967296"` refusal already
  tested, the two boundaries meet. Fails with the constant off by one either way.
- **F16 — Spec order (labeling, `startRun.ts`).** `SPECIALIZATIONS` is
  `[SORCERER, BRUTE, SHIELDBARER]`, so `SPEC_CHOICES` is Sorcerer, Brute, Shieldbarer, not the
  plan's "(Brute, Shieldbarer, Sorcerer)". The pick lists data order, and the presence test's spec
  (the first of `SPEC_CHOICES`) is the Sorcerer.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| 1 | **Confirm** | Decided in round 1 (DP1). |
| 2 | **Confirm** | F12 changes the action, not the rule. |
| 3 | **Confirm** | |
| 4 | **Confirm**, with F15 | |
| 5 | **Confirm** | |
| 6 | **Confirm** | |
| 7 | **Confirm** | The header's N is DP3. |
| 8 | **Confirm** | |
| 9 | **Confirm** | |
| 10 | **Confirm** | |
| 11 | **Confirm** | |
| 12 | **Confirm**, with F16 | The spec is the Sorcerer. |
| 13 | **Confirm** | F13 keeps the descent key as the timer's reset, so the click-through's "new descent mid-playback" item checks it. |
| 14 | **Confirm** | |
| 15 | **Confirm** | |

Also checked and fine: the Sorcerer starter gets a rolled regular gem (`addInstance` →
`rollPlayerGems`), so the spell test's two reads differ as the plan says; creature ids are
`<template>-<side>-<slot>` and event `effectId`s are definition ids, so "no output string holds an
id" can't trip on a trait or status id; all three biomes have a boss, so floors 10, 20 and 30 are
one-fight boss floors; `runSeed`'s three calls are the plan's, in its order (its extra probe scripts
don't change the start); emptying all six slots is allowed (`checkSetPartySlot`), so the presence
test reaches `empty-party`.

### Decide-points

- **DP3 — What N is in "Fight n / N" (`fightHeader`).** The brief says "Fight n / N" without saying
  whether N is the floor's fight count or the number of fights fought, and the plan passes a bare
  `total`. They differ only on a floor lost or drawn before its last fight. **Recommend: the floor's
  fight count**, the same N as the floor line (from `floorInfo`): a lost floor 5 reads "Fight 3 / 12"
  in the header and "loss at fight 3 of 12" in the result, never "Fight 3 / 3" beside "of 12". The
  alternative counts what the fight list shows, but then the two lines on one screen disagree.

### Decisions

- **DP3:** accepted. N in "Fight n / N" is the floor's fight count, the same N as the floor's
  result line (from `floorInfo`).
- Plan fixes F12–F16 and the assumption calls stand as written above.

### Docs edited

- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#descent-result-and-viewer-g1`: the header's N
  is the floor's fight count (DP3).
