# Record — Phase 4.5 — Slice C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

**Status: built.** Golden policy deliberate, listed: brackets, `TURN_STEPS` and the pinned unit
tests change; every other golden and unit test is unchanged in expectation. Corpus digest
regenerated once (393 of 527 rows). 1907 tests passed, 1 skipped (net +10 against `main`).

## What was built

- **A dead slot is skipped inside the call that reaches it.** `resolveTurn` dequeues in one loop:
  an exhausted queue is the round boundary (round-end pass, win check, round-cap gate, new queue,
  `RoundStarted`, once per boundary), a dead entry advances `turnCursor` and nothing else, the first
  living entry is the actor. A dead slot emits no `TurnStarted`/`TurnEnded`, bumps no turn clock and
  rolls no Web; a creature that dies during its own turn keeps that turn's cleanup and Web roll.
  The frozen queue keeps its dead entries.
- **`resolveTurn` refuses a finished fight.** The first statement throws when `state.result` is
  set (`resolveTurn: the fight already has a result`).
- **The matchup roster is the enemy party.** `FloorOutcome.fightEnemyIds` (state/store.ts) holds one
  array of enemy creature ids per fight resolved, filled by `descend` from `fight.enemyParty`.
  `runProbe` returns it with its events; `analyzeFight` takes it as an optional third argument
  (`enemyIds`, default empty) and `playFloorRun` pairs each fight with its roster. `firstRoundEnemyIds`
  is deleted.
- **Stale text** in `resolveTurn`, `rollWebBreakFree`, the `TurnStarted` comment and the
  `turnClock` comment in `types.ts`, `data/statuses.ts` (`WEB`), and the headers of the changed
  goldens.

## Tests and goldens

- New: `engine/dead-slot-skip.test.ts` (7), goldens `golden-dead-slot-skip` (nothing emitted,
  nothing drawn, queue and cursor) and `golden-dead-slot-round-boundary` (one call across the round
  end), a `playFloorRun` roster guard and a rewritten matchup-roster test.
- Changed goldens: `golden-fallback-attacks-lowest-hp`, `-random-selector`, `-6v6-scripted` (the
  dead brackets); `TURN_STEPS` lowered in `-broodmother`, `-gloomjaw-executioner`,
  `-provoke-stun-cleanup`, `-pass-order-live` `revived`. Pinned unit tests rewritten in
  `combat.test.ts` and `status-timing.test.ts`.
- Corpus: 393 rows changed (318 brackets only, 75 at a removed Web draw: 74 diverge in later
  events, and in fight 126 only the dead slot's `StatusExpired` goes); four result changes (35,
  135, 185, 457). Attribution in `evidence/corpus-table.md`.
- Balance: no CI verdict flipped; matchup and boss lock moves attributed in
  `evidence/balance-and-roster.md`.

## Files changed

Edited: `engine/combat.ts`, `engine/types.ts`, `data/statuses.ts`, `state/store.ts`,
`state/balance-sim.ts`, the corpus digest fixture, `combat.test.ts`, `status-timing.test.ts`,
`balance-sim.test.ts`, `balance-sim-report.test.ts`, seven golden fixtures. New: `dead-slot-skip.test.ts`,
the two golden pairs, and the evidence files. No living or content doc edited.
