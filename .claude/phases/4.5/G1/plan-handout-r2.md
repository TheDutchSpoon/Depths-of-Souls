# Plan hand-out — 4.5-G1, round 2

**Verdict: approved.** Build `plan.md` as it stands with the items below; where they disagree, this
hand-out wins. Re-read the edited line first: the header bullet in
`phases/4.5/brief.md#descent-result-and-viewer-g1`.

## Playback

- **One timer action (`playback.ts`, Approach).** The reducer has a single `timer-elapsed` action
  in place of `tick` and `wait-elapsed`, read by phase: waiting → `playing` at fight 0, beat 0;
  playing → the plan's tick rule (next beat, else next fight at beat 0, `done` on the floor's last
  beat); done → the identical state object. The timer effect reads only `pendingDelayMs(state)`
  and `dispatch`, never the phase or the state object:
  `const delay = pendingDelayMs(state); if (delay === null) return; const id = setTimeout(() =>
  dispatch({ type: 'timer-elapsed' }), delay); return () => clearTimeout(id)`, with dependencies
  `timerKey(state)` and `delay`. No `eslint-disable` comment. `playback.test`'s wait → play and
  tick rows dispatch `timer-elapsed`, and `timer-elapsed` while `done` returns the identical object.
- **One owner for playback (`DescentResult.tsx`, `DescentViewer.tsx`, `RunScreen.tsx`).** A single
  component, rendered by `RunScreen` with `key` = the latest descent's id, owns the `useReducer`
  and the timer effect, and renders both the descent result (floor line, boss line, fight list with
  each row's jump button) and the viewer (header, line-up, log, speed and skip buttons, Copy fight
  as JSON). The fight list's jump buttons dispatch to that reducer. `RunScreen` holds only the
  latest descent and its counter, never the playback state, so a new descent remounts the whole
  result-and-viewer and its cleanup clears the last timeout. This can be `DescentViewer` rendering
  `DescentResult` as a child with `dispatch` passed down, or a wrapper component owning both;
  either way, `useReducer` is never in `RunScreen`.

## Viewer header

- **"Fight n / N" (`fightHeader`, `fightList.ts`).** N is the floor's fight count: the same
  `fights` from `floorInfo` for the descended floor that `floorResultLine` takes, never the number
  of records. `fightHeader(record, index, fights, names)` returns `{ title: 'Fight <index + 1> /
  <fights>', levelsIn, row }`. `fightList.test`'s header row adds a lost floor: two records on a
  floor of 5 fights gives `Fight 2 / 5`. Fails with N taken from the record count.

## Tests

- **Perk points (`perkPoints.test`).** Per spec, after `setSpec`, and with a budget of at least 100
  (`recordBossKill`), first buy one or more perk levels with `setPerkLevel` so `spent > 0`. Then
  sweep every perk of the spec with `level + 1 ≤ maxLevel` (level from `perkSpend`):
  `canSetPerkLevel(perk, level + 1).ok` equals `costPerLevel ≤ perkPointSummary(...).free`, and the
  test asserts the sweep saw at least one allowed answer and at least one `over-budget` answer.
  Choose the purchase so free lands between the spec's cheapest and dearest per-level cost. Fails
  with `spent` dropped to 0 or summed without `costPerLevel`.
- **Seed bound against the store (`startRun.test`).** On a real `createGameStore()`:
  `startRun(store, specId, '4294967295')` returns `ok` and the store's `runSeed` is 4294967295; and
  `store.getState().newGame({ seed: 4294967296 })` throws. Together with the helper's refusal of
  `"4294967296"`, this pins `startRun.ts`'s restated bound to the store's. Fails with the constant
  off by one either way.

## Labeling

- **Spec order (`startRun.ts`).** `SPEC_CHOICES` follows `SPECIALIZATIONS`' data order: Sorcerer,
  Brute, Shieldbarer. The start screen lists them in that order, and the presence test's spec (the
  first of `SPEC_CHOICES`) is the Sorcerer.

## Confirmed as planned

All 15 ASSUMPTIONs. Golden policy as planned: no file under `src/engine`, `src/state` or `src/data`
changes; no new golden; `newGame.test.ts` changes only by moving its `startNewGame` cases to
`startRun.test`.
