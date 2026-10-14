# Plan hand-out — 4.5-G1, round 1

**Verdict: changes needed.** Fold every item below into `plan.md`, list what changed at its top,
and resubmit. Re-read the edited lines first: `phases/4.5/G1/brief.md#known`, and in `kickoff.md`
the reading list's `CombatDemo.tsx` line, **Golden policy**, and the "One start path" trap.

## Playback

- **Playback clock (Approach; ASSUMPTION 1, confirmed).** Playback is the pure reducer in
  `src/app/playback.ts` plus one `setTimeout` effect in the viewer, as the plan describes. 3.5's
  `setInterval` ref and `clearTimer()` are not carried over; its beat pace, `groupIntoBeats`,
  `describeEvent` and the "no side effect inside a state updater" rule are.
- **Timer key (`playback.ts`, Approach; amends ASSUMPTION 2).** `playback.ts` exports a pure
  `timerKey(state)`: phase, fight and revealed, plus speed only when the phase is not `waiting`.
  The viewer's timer effect depends on that key and `pendingDelayMs(state)`, never on the state
  object. The reducer returns the **same object** for an action that changes nothing (the current
  speed pressed again, `skip-fight` while waiting or done, a jump to the current position). So a
  speed change during the 3-second wait never restarts the wait, and a no-op never restarts a
  beat. ASSUMPTION 2 now reads: a speed change keeps the position, and during the wait it leaves
  the wait running.
  - `playback.test` adds: every no-op action returns the identical object; a speed change while
    waiting leaves `timerKey` equal; a speed change while playing changes it. Fails with the effect
    keyed on the whole state object (`timerKey` returning the state).

## Start path

- **`startRun` is the only start path (`startRun.ts`, `newGame.ts`).** `startNewGame` is removed
  from `src/app/newGame.ts`; `generateRunSeed` and `RandomSource` stay there. Its cases in
  `src/app/newGame.test.ts` move to `startRun.test` (a blank field draws from the injected source,
  and the seed is what `newGame` receives). The report's test count lists `newGame.test.ts`'s
  change, test by test. This replaces the plan's "`newGame.test.ts` is not changed" in **Golden
  policy** and under `startRun.ts`.
- **Seed field (`parseSeedField`; amends ASSUMPTION 4).** The text is trimmed before anything
  else: blank after trimming → `seed: null`; otherwise it must match `/^-?\d+$/`
  (`not-a-whole-number`), then lie in `0 .. 2^32 − 1` (`seed-out-of-range`). `" 42 "` is accepted
  as 42; add it to `startRun.test`'s accepted cases.

## Floor picker

- **What stops a throw (`floorPicker.test`, "Picker never throws" row).** The store's
  `checkDescend` already refuses any non-integer or `< 1` floor as `floor-out-of-reach` without
  calling `biomeForFloor`. The mechanism that keeps the picker from throwing is `floorInfo`'s guard
  (`null` unless a whole number ≥ 1) in front of `biomeForFloor`; the row's "fails when" is that
  guard removed (`biomeForFloor` throws on 0 and `NaN`). `parseFloorField` stays, with its own
  cases: `""` and `" "` are not 0, and `"0x10"` and `"1e1"` are not floors 16 and 10 (each is
  `NaN`).
- **Expected refusals (same test; ASSUMPTION 5, confirmed).** A 400-digit string parses to
  `Infinity`, refused as `floor-out-of-reach`. `"99999999999999999999"` parses to `1e20`, refused
  as `beyond-content-frontier`, and `floorInfo(1e20)` returns without throwing (floors past 100
  take `biomeForFloor`'s hashed draw).

## Descent result

- **`descendFlow.ts` (ASSUMPTION 3, confirmed with this shape).** `runDescent(store, floor)` takes
  the store API, `Pick<StoreApi<GameState & GameActions>, 'getState'>`, and returns
  `{ ok: true, outcome, bossesBefore, bossesAfter } | { ok: false, reason }`. It reads
  `bossesBefore` from `getState()` before calling `descend`, and `bossesAfter` from a **fresh**
  `getState()` after (the store replaces the `Set`, so a state object read before `descend` still
  holds the old one). `RunScreen` passes `useGameStore`.
  - Its test is `descendFlow.test`, on a hand-built store whose `descend` returns an outcome with a
    `bossDefeated` and adds that boss to `bossesCleared`, as the real store does: the result is a
    first clear (before lacks the boss, after has it). Fails with the snapshot taken after
    `descend`. A second hand-built store with the boss already cleared gives a repeat clear.
  - The presence test drops its "snapshot before descend" row.
- **Boss result line (`descentText.ts`; amends ASSUMPTION 7).** `bossResultLine(bossDefeated,
  bossesBefore, bossesAfter, biomes)`: `null` when `bossDefeated` is `null`; a first clear when
  `bossesBefore` lacks the boss: `Defeated <boss name>: first clear, +<N> perk points`, with
  `N = perkPointsFor(bossesAfter) − perkPointsFor(bossesBefore)` (no `100` literal); otherwise
  `Defeated <boss name>: already cleared, no perk points`. An unknown boss id throws.
- **Floor result line (`descentText.ts`; amends ASSUMPTION 7).** `floorResultLine(outcome,
  fights)`, with `fights` from `floorInfo` for the descended floor (the fight records stop at the
  first non-win, so they don't give the floor's count): `Floor n: cleared`, or `Floor n: <loss |
  draw> at fight k of N`, where k is the number of records and the word is the last record's
  result. `descentText.test` covers a clear, a loss and a draw.
- **Viewer header (`fightList.ts`, `DescentViewer.tsx`).** The header shows "Fight n / N", the
  party's levels going into the fight, and that fight's XP and level-ups.
  `fightHeader(record, index, total, names)` returns `{ title, levelsIn, row }`, where `row` is
  that fight's `fightRows` row, so the header and the fight list read one helper.

## Names and labels

- **Label slot (`labelCreatures`; amends ASSUMPTION 6).** A repeated name's number is
  `creature.slot + 1`, read from the creature, not its array position. Side words are "ally" and
  "foe".
- **Name table (`names.ts`).** `buildNameTable` reads the standalone creatures, every biome's
  species pool and every biome's `boss.creature`; no `boss.adds` rows (every add is a pool member,
  which `generateFloor` enforces). `names.test`'s "fails when" is the `boss.creature` row removed.

## Tests

- **Presence test (ASSUMPTION 12).** It names its spec: the first of `SPEC_CHOICES`, at a pinned
  seed whose floor 1 clears with that spec.
- **Perk points (`perkPoints.test`).** Each spec is entered with `setSpec` before its sweep. The
  "`canSetPerkLevel(perk, level + 1).ok` exactly when cost ≤ free" sweep covers only
  `level + 1 ≤ maxLevel` (above it the reason is `invalid-level`).

## Confirmed as planned

ASSUMPTIONs 8, 9, 10, 11, 13, 14 and 15. Skip to end of floor and the speed buttons stay live
during the wait. Golden policy otherwise as planned: no file under `src/engine`, `src/state` or
`src/data` changes; no new golden.
