# Plan — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Read: `CLAUDE.md`, `coding-rules.md`, the kickoff, `phases/4.5/brief.md` (the two C items, balance
verdicts), `phases/4.5/C/brief.md`, `evidence/kickoff-probe.md`, `spec/combat.md` (resolver shape,
turn queue, turn structure), `engine/combat.ts` whole, `engine/types.ts` lifecycle comment,
`golden-runner.ts`, `state/balance-sim.ts` (`splitFights`, `bossLockStats`, `firstRoundEnemyIds`,
`analyzeFight`, `playFloorRun`, `runProbe`), `state/store.ts` `descend`, and the tests the kickoff
lists. The spec still describes `main`; I build against the brief. No spec file beyond the
kickoff's list is reached, except `spec/store.md` if assumption A1 holds (see below).

## Approach

Three changes in the engine's one function, one in the simulator, and the fallout in goldens/tests.

### `src/engine/combat.ts` — `resolveTurn`

1. **Guard first.** The first statement: `if (state.result !== null) throw new Error('resolveTurn:
   the fight already has a result')`. Before the working copy, the fight-start block and the
   boundary; reads only `state.result`. No provenance in the message.
2. **Fight-start block unchanged** (`round === 0`, outside the loop).
3. **Dequeue loop.** The boundary block and the dequeue move into one `for (;;)`:
   - `next = working.turnQueue[working.turnCursor]`.
   - `next === undefined` (cursor at or past the end, or the very first call's empty queue) is the
     boundary, run exactly as today and once per boundary: `round > 0` → `resolveRoundEnd`, then
     `checkWinLoss` → `finalize`; then `nextRound > ROUND_CAP` → `finalize(..., 'draw')`; then
     `buildTurnQueue`, cursor 0, `round = nextRound`, `RoundStarted`. If the rebuilt queue is empty
     (unreachable: a win check passed), the existing defensive `finalize(checkWinLoss ?? 'draw')`
     stays, so the loop cannot spin. No iteration cap.
   - otherwise advance `turnCursor` past `next`; if the creature is alive, it is the actor and the
     loop exits; a dead one is skipped (nothing emitted, no clock bump, no Web roll) and the loop
     continues, crossing the boundary in the same call when the dead entries end the round.
   - The frozen `turnQueue` is never edited; only `turnCursor` moves.
4. **Turn body.** The actor is alive at dequeue by construction, so the "dead at dequeue" gates
   go: the outer `if (actor.alive)` around the turn-start block (dedented), and the Web roll's
   "dead actor's empty bracket included" case. The *fresh* alive re-checks stay (`afterHooks`,
   `afterStartHooks`, `actorAfterStart.alive`, the `getCreature(...).alive` before turn-end hooks and
   before `countDownStatuses`): the actor can die mid-turn. `rollWebBreakFree` stays unconditional
   at cleanup, which is "gated on alive at dequeue" because every dequeued actor was; it is not
   gated on alive at cleanup, so a creature that died in its own turn still rolls.
5. **Comments rewritten** (no provenance): the "bracket is ALWAYS emitted" block, the clock-bump
   comment ("whether the actor is alive, dead or skipped"), the `creatureId === undefined` note
   (becomes the empty-queue note), `rollWebBreakFree`'s doc, the turn-end cleanup comment, and the
   unreachable-case comment.

### `src/engine/types.ts`

`TurnStarted`/`TurnEnded` comment: drop "no-op/skipped turns" (a `TurnSkipped` turn still has a
bracket; a dead creature's slot has none).

### `src/state/balance-sim.ts` (and the one store hook it needs, assumption A1)

- `FightMetrics.enemyTemplateIds` comes from the fight's enemy party ids, not from round-1
  `TurnStarted`. `firstRoundEnemyIds` is deleted (its only callers are `analyzeFight` and the
  "boss-run restore" test).
- The events carry no roster, and `descend` builds `fight.enemyParty` internally. **A1:** add
  `fightEnemyIds: readonly (readonly CreatureId-strings[])[]` (one array per fight resolved, in
  fight order) to `FloorOutcome` in `state/store.ts`, filled from `fight.enemyParty.map(c => c.id)`
  in the existing fight loop. `runProbe` returns it with its events. `analyzeFight(events, ctx,
  enemyIds = [])` takes the roster as an optional third argument (A5) and sets
  `enemyTemplateIds: [...new Set(enemyIds.map(templateIdOf))]`. `playFloorRun` zips
  `splitFights(outcome.events)` with `outcome.fightEnemyIds` (equal length by construction; a
  mismatch throws). The probe's boss-fight metrics pass the probe's roster likewise.
- `bossLockStats` is untouched. It counts `TurnStarted`, so a boss dead at its slot stops counting
  as an unlocked turn; the sim report's lock rates are attributed in the PR (before/after `npm run
  sim`).
- `attributeStatModifiers` is untouched (losing an empty bracket changes nothing: the previous
  `TurnEnded` already cleared the marker). Grep of `src/` outside goldens shows the other readers:
  `CombatDemo.tsx` (lines 44 and 170: playback grouping and rendering of `TurnStarted`) reads
  events as they come, so a missing dead bracket only removes a row; I check it at build (A7).

### Goldens and unit tests

- **Brackets (hand-derived):** `golden-fallback-attacks-lowest-hp` (remove `B`'s empty pair, 1 slot;
  fix header line 14) and `golden-random-selector` (2 dead slots; fix the comment at line ~90).
- **`TURN_STEPS`:** `golden-broodmother` 5 → 4, `golden-gloomjaw-executioner` 4 → 3,
  `golden-provoke-stun-cleanup` 6 → 5, `golden-pass-order-live` `revived` 6 → 5. Header comments
  fixed to count only turns that happen. Each log differs only by its removed pair.
- **`golden-6v6-scripted`** (generated, checkpoint-verified): regenerated through its own
  generation path for the 3 dead slots; the `TurnStarted: 176` count (and the `TurnEnded` count) drop
  by 3. Re-checkpoint the structural properties in its header and show the arithmetic.
- **Rewritten unit tests:** `combat.test.ts` "emits an empty … bracket" → "a creature dead at its
  slot gets no TurnStarted/TurnEnded" ; `status-timing.test.ts` "a dead actor's empty bracket …" →
  "a Web placed in the previous turn's action, followed by a dead slot, is first rolled at the
  next living turn's cleanup".
- **Corpus digest regenerated once** (`npm run corpus:update`), expecting 393/527 changed (319
  brackets only, 74 diverging, four result changes: 35, 135, 185, 457) and attributed in the report.
- **Balance-sim tests:** the "boss-run restore" test compares `outcome.fightEnemyIds` between
  probe and policy runs; the report test "analyzeFight lists the DISTINCT enemy templates that start
  the fight" passes a roster that includes an enemy with no bracket (killed before its slot) and a
  duplicate template.

## Golden policy (restated from the kickoff)

Deliberate, listed. (1) Brackets: the dead slot's empty pair leaves every fight that has one;
changed hand-derived goldens `golden-fallback-attacks-lowest-hp`, `golden-random-selector`, diff =
removed pair(s) only. (2) `TURN_STEPS` lowered by exactly the dead-slot count in the four stepped
goldens above, same result and RNG position. (3) `golden-6v6-scripted`: 3 dead slots, brackets only.
(4) Web draws: no hand-derived golden has a roll in a dead slot; corpus fights that do diverge after
the first removed draw. (5) The two pinned unit tests rewritten. (6) Corpus digest regenerated once.
Everything else byte-identical (comment-only edits allowed). The guard alone is byte-identical.
New goldens replay through `runGolden`/`stepFrozen`; no run-then-pasted values.

## New hand-derived tests and what each kills

Fixtures use `makeParty`, scripted `always-attack`/`always-wait`. For RNG-sensitive ones I use a
fixture Web (the `golden-web-break-free` pattern) with `breakChancePercent: 0` where I only need to
know that a draw happened, so the expectation is a draw count and not a random value (A4).
Goldens (event-log) are `golden-dead-slot-skip`, `golden-dead-slot-round-boundary`; the rest are unit
tests in a new `engine/dead-slot-skip.test.ts` using `stepFrozen`.

| # | Test | Setup (derivation in the file's comments) | Fails with … removed |
| --- | --- | --- | --- |
| 1 | `golden-dead-slot-skip`: a dead creature's slot emits nothing and draws nothing, Web present | HERO (spd 30) kills D (spd 20, 1 HP) in its turn; E (spd 10) bears a fight-start Web (not born in any turn); queue [HERO, D, E] frozen. Expected log has no D bracket; RNG advanced by exactly 2 (HERO's cleanup roll, E's own turn's roll), none for D | bracket back (the log gains D's pair); a Web roll in the dead slot (draw count 3 and rng position differs). Also asserts `turnQueue` still lists D and `turnCursor` passed it (the skip never removes) |
| 2 | a creature that dies in its own turn keeps cleanup and Web roll | A attacks and dies to its own Thorns-style reaction (reuse the lethal-reaction fixture shape in `golden-actor-dies-attack`) while a Web is present; the Web roll still draws at A's cleanup | gating the roll on alive-at-cleanup (draw count 0). Unit test |
| 3 | revived before its slot acts in it | queue [R(reviver), D, ...]; R's cast revives dead D before D's slot; D takes its turn (bracket + action) | skip decided from the round-start state instead of at dequeue. Unit test |
| 4 | dead at round start, revived mid-round: no turn that round, one the next | D dead before round 1 via `setup`; revived in R's turn; D absent from the queue, no bracket in round 1, has one in round 2 | skip logic that appends/queues revived creatures. Unit test |
| 5 | `golden-dead-slot-round-boundary`: dead entries end the round; one call runs through round end, `RoundStarted` and the next living turn | queue [HERO, D1, D2] with D1, D2 dead by HERO's kills in turn 1 (or `setup`); call 2 emits: `on-round-end` trigger, `RoundStarted 2`, HERO's turn; no D brackets | a dead-slot call that returns without crossing (call 2 would be empty, so the log/`TURN_STEPS` accounting fails). The round-end trigger line is the proof the pass ran exactly once |
| 6 | the same at the round cap | state at `round = ROUND_CAP` with queue ending in dead entries; the one call that skips them ends `FightEnded draw`, no `RoundStarted` | the cap gate left outside the loop, or crossing without the gate (a 51st round starts). Unit test |
| 7 | a round-end pass that wipes a side, reached by skipping, ends with `FightEnded` | last dead entries, round-end trigger kills the last enemy (or player); the call's events end with the round-end events then `FightEnded win` | skipping that bypasses `checkWinLoss` after `resolveRoundEnd`. Unit test |
| 8 | `resolveTurn` throws on a state with a result: (a) fight ended mid-queue (next entry is a living creature), (b) ended at a round boundary; the input is untouched | build both states with `stepFrozen` to the result; assert `toThrow`; the input is deep-frozen and `toEqual` a pre-call structuredClone | removing the guard (neither throws; (a) would emit a bracket). Unit test |

Additional per-mechanism tests that exist already and keep covering their site: the existing
fight-start-wipe test (the `round === 0` block stays outside the loop: a fight-start wipe still
ends `FightStarted … FightEnded` with no `RoundStarted`), `combat.test.ts` "round cap" (the gate
still fires on an empty queue), `corpus-coverage.test.ts` (Web's roll-driven `StatusExpired`).
For the roster: the rewritten report test fails if `enemyTemplateIds` reads brackets again (the
roster contains an enemy with no bracket), and the rewritten restore test fails if the roster
is not threaded through `runProbe`.

## The PR must prove — evidence plan (in `phases/4.5/C/evidence/`)

- **Attribution by stages**, two throwaway builds in a scratch clone outside the repo (not committed,
  A9): (1) dead slot keeps clock bump and Web roll, loses bracket — every corpus fight equals
  `main`'s log with empty brackets removed; (2) dead slot keeps only the clock bump — every corpus
  fight equals the final build. Then the table (brackets only vs diverging, first differing event,
  the four result changes on their own lines) against the probe's table.
- **Per changed golden:** dead-slot count and diff = removed pair(s) + `TURN_STEPS` delta.
- **Mechanism removal:** each row above run with its mechanism removed, output captured.
- **Guard alone:** `main` plus only the guard passes every existing test and the committed digest.
- **Roster:** over the simulator's fights, new roster vs `main`'s `firstRoundEnemyIds`-derived set,
  fight by fight (see A2).
- **Balance:** `npm run sim` before and after: floor 1, first soul, floor 5 verdicts, round-cap draw
  rate, any boss lock stat move attributed. A flipped verdict stops and asks; no tuning.
- Test count reconciled file by file against `main` (1401 passed, 1 skipped on `main` for the three
  suites; the whole-repo count taken at build).
- Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`
  and `-- comments`.

## Spec questions to carry into the report (I do not edit living docs)

`spec/combat.md#resolver-shape` (add the refusal and "one call is one turn"),
`spec/combat.md#turn-queue` (the dead-slot bracket bullet, lines ~193–194),
`spec/combat.md#turn-structure`, `spec/statuses.md#self-clearing-statuses` (72%),
`#born-this-turn`, `#turn-order`, `content/overgrowth.md#web`, and `spec/store.md` if A1 changes
`FloorOutcome`. **To delete:** none expected.

## Assumptions checklist

- [ ] **A1.** The simulator's roster needs the enemy party, which only `descend` holds, so I add
  `fightEnemyIds` to `FloorOutcome` (a store/state change the kickoff does not name; additive,
  `integration.test.ts` replay comparisons stay equal). Alternative if you refuse a store change:
  re-derive the party in the sim by calling `generateFloor` with the store's inputs (duplicates
  store logic). Confirm which.
- [ ] **A2.** "Exactly the enemies it counts on `main`": `main` counts enemies whose round-1 slot was
  *dequeued* before the fight ended, so a fight that ends in round 1 (e.g. fast player wins) omits
  enemies whose slots were never reached, while the full party includes them. The two rosters can
  differ for such fights. I will measure fight by fight; if they differ I stop and report rather than
  choose, since the kickoff states both "from the fight's enemy party" and "equals main's set".
- [ ] **A3.** The outer `if (actor.alive)` is removed and its body dedented (a dead condition would
  misstate the rule); the fresh mid-turn alive re-checks stay.
- [ ] **A4.** A fixture Web with `breakChancePercent: 0` passes `validateStatusDef` and still draws
  (`nextRandom` is called before the compare). If it is rejected I use 1% and a hand-traced seed
  whose draws stay ≥ 0.01.
- [ ] **A5.** `analyzeFight`'s roster argument is optional (default `[]`) so the ~12 existing
  hand-built-event tests stay byte-identical; every production caller passes it.
- [ ] **A6.** The loop keeps the defensive empty-queue `finalize` (unreachable), with no iteration cap.
- [ ] **A7.** `CombatDemo.tsx` (and any other `TurnStarted`/`TurnEnded` reader found by grep) needs no
  change; checked at build.
- [ ] **A8.** Tests 1 and 5 are goldens (new fixture + test files through `runGolden`); 2, 3, 4, 6, 7, 8
  are unit tests in a new `engine/dead-slot-skip.test.ts` (state-construction and draw-count
  assertions, not event-log goldens).
- [ ] **A9.** The two stage builds and the guard-only build run in a scratch clone outside the repo;
  only their printed tables go in `evidence/`.
- [ ] **A10.** The error message is `resolveTurn: the fight already has a result`.
- [ ] **A11.** Test 8(a)'s mid-queue state is built by stepping with `stepFrozen` on a fixture whose
  last kill happens before the queue is exhausted (next entry living); 8(b) uses a round-end wipe.
- [ ] **A12.** `golden-6v6-scripted`'s generation path and header checkpoints are read at build time;
  if it has no regenerate script, I derive the new log by deleting the 3 pairs and re-verify its
  structural counts by importing the fixture.
