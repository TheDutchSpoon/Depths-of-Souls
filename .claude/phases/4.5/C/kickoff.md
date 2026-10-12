# Kickoff — Phase 4.5 — Slice C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/combat.md` (`spec/combat.md#resolver-shape`, `spec/combat.md#rounds-and-turns`,
  `spec/combat.md#turn-queue`, `spec/combat.md#turn-structure`,
  `spec/combat.md#resolution--timing`), `spec/statuses.md` (`spec/statuses.md#self-clearing-statuses`,
  `spec/statuses.md#timing`, `spec/statuses.md#turn-end-cleanup`, `spec/statuses.md#born-this-turn`,
  `spec/statuses.md#turn-order`), `spec/effects.md#pass-order` and `spec/responses.md#revive`. The
  spec still describes `main` (the dead slot's empty bracket, clock bump and Web roll) until this
  slice's PR review; build against the brief.
- The brief: `phases/4.5/brief.md#a-dead-creatures-turn-is-skipped-entirely` (including its "one
  `resolveTurn` call is one turn" rule, decided at this kickoff),
  `phases/4.5/brief.md#resolveturn-refuses-a-finished-fight` (also added at this kickoff),
  `phases/4.5/brief.md#balance-verdicts` and `phases/4.5/C/brief.md`.
- Content docs: `content/overgrowth.md#web`.
- Code, before planning: `engine/combat.ts` (`resolveTurn` whole, `rollWebBreakFree`,
  `countDownStatuses`, `isBornThisTurn`), `engine/turn-order.ts` (`buildTurnQueue`),
  `engine/conditions.ts` (`acted-before-target`), `engine/types.ts` (the `TurnStarted`/`TurnEnded`
  comment), `engine/test-utils/golden-runner.ts` (`TURN_STEPS`), and in `state/balance-sim.ts`
  `firstRoundEnemyIds`, its use for `enemyTemplateIds`, and `bossLockStats`' `TurnStarted` count.
- Goldens and tests: `golden-broodmother`, `golden-gloomjaw-executioner`,
  `golden-provoke-stun-cleanup`, `golden-pass-order-live` (`revived`), `golden-6v6-scripted`,
  `golden-fallback-attacks-lowest-hp`, `golden-random-selector`, `golden-revive`,
  `combat.test.ts` "death-mid-round skip", `status-timing.test.ts` "the Web roll",
  `balance-sim.test.ts` "boss-run restore …", and `engine/corpus-digest.test.ts`.
- `phases/4.5/C/evidence/kickoff-probe.md`: what the plainest version of this change moves on
  `main`. Your build should reproduce its numbers; any difference is explained in the report.

## Scope

A creature that is dead when its slot comes up gets nothing: no `TurnStarted`/`TurnEnded`
bracket, no turn-clock bump, no Web roll. `resolveTurn` dequeues past dead entries to the next
living creature and resolves its turn. When the dead entries end the round it crosses the
boundary in the same call (round-end pass, win check, round-cap gate, the new queue,
`RoundStarted`), or it ends the fight. So the Web roll runs only on a turn whose actor was alive
when dequeued. A creature that dies during its own turn keeps that turn's cleanup and Web roll, as
today. The frozen queue keeps its dead entries.

The balance simulator's matchup roster (`enemyTemplateIds`) comes from the fight's enemy party,
not from the round-1 `TurnStarted` brackets. Today an enemy killed before its first turn still
has a bracket, and without one it would silently drop out of the matchup table.
`firstRoundEnemyIds` and the "boss-run restore" test that uses it change to match. The matchup
table must count exactly the enemies it counts on `main`.

`resolveTurn` throws when the state it is given already has a result, before it does anything
else. Today a call on a finished fight plays on (`phases/4.5/C/evidence/kickoff-probe.md#stepping-past-the-end`).
This part is byte-identical: no existing golden or test steps past the end.

**Not in this slice:** any change to queue building, turn order or the alive gates inside a
turn; any change to `resolveFight` (it already stops at the result); any content number; any
living-doc edit (they go under **Spec questions**).

## Golden policy

Deliberate, listed:

- **Brackets.** Every fight where a creature is dead at its slot loses that slot's empty
  `TurnStarted`/`TurnEnded` pair. Changed hand-derived goldens: `golden-fallback-attacks-lowest-hp`
  and `golden-random-selector`. Each one's diff is the removed pair(s) only.
- **`TURN_STEPS`.** A stepped golden's `TURN_STEPS` drops by the dead slots in its window:
  `golden-broodmother` 5 → 4, `golden-gloomjaw-executioner` 4 → 3, `golden-provoke-stun-cleanup`
  6 → 5, `golden-pass-order-live` `revived` 6 → 5. With that change each one's log differs only
  by its removed pair, with the same result and RNG position. Fix their header comments to
  match.
- **`golden-6v6-scripted`** (generated, checkpoint-verified): 3 dead slots, brackets only.
  Re-checkpoint its structural properties, and show the arithmetic.
- **Web draws.** No hand-derived golden has a Web roll in a dead slot. Corpus fights that do
  diverge after the first removed draw.
- **Two unit tests pin the old rule and are rewritten to the new one:** `combat.test.ts` "emits
  an empty TurnStarted/TurnEnded bracket …" and `status-timing.test.ts` "a dead actor's empty
  bracket still bumps the clock and rolls …". The latter becomes: a Web placed in the previous
  turn's action, followed by a dead slot, is first rolled at the next living turn's cleanup.
- **The corpus digest is regenerated once** (`npm run corpus:update`). Expect 393 of 527 fights:
  319 brackets only, 74 diverging at a removed Web draw, and four result changes (fight 35 win →
  draw, 135 win → draw, 185 loss → win, 457 win → loss).
- Every other golden and unit test stays byte-identical. Comment-only edits are allowed where a
  comment narrates an empty bracket (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`).

**New hand-derived tests**, through the shared runner where they are goldens:

1. a creature dead at its slot emits nothing and draws nothing, on a board with a Web present
   (the RNG position shows no draw for the dead slot);
2. a creature that dies during its own turn keeps its cleanup and Web roll;
3. a creature revived before its slot acts in that slot;
4. a creature dead at round start and revived during the round gets no turn that round, and one
   the next;
5. dead entries that end the round: one call runs past them, the round-end pass, `RoundStarted`
   and the next living turn;
6. the same at the round cap: the call that skips the last dead entries ends the fight as a draw;
7. a round-end pass that wipes a side, reached by skipping: that call ends with `FightEnded`;
8. `resolveTurn` on a state with a result throws, for a fight ended mid-queue (the next queue
   entry is a living creature) and one ended at a round boundary, and the input state is
   untouched (deep-frozen).

## Traps

- **The round boundary moves into the loop, once per boundary.** The round-end pass, its win
  check and the round-cap gate run before each rebuild, exactly as today. The fight-start block
  (`round === 0`) is not in the loop. The loop terminates: a fresh queue's first entry is alive,
  since nothing runs between building it and dequeuing it. Don't add an iteration cap that would
  hide a bug.
- **Keep the dead entries in the frozen queue.** `acted-before-target` reads queue positions.
  Skipping advances `turnCursor` past an entry; it never removes one.
- **The alive gates inside a turn stay.** A turn-start hook or the action can kill the actor, and
  those paths keep their gates. Only the "dead at dequeue" case goes away. The Web roll still runs
  when the actor died mid-turn: gate it on the actor being alive *at dequeue*, never at cleanup.
- **Don't compensate for the missing clock bumps.** The probe shows they change nothing on the
  corpus (`evidence/kickoff-probe.md`, variant E). The rewritten status-timing test is where a
  Web's first roll moves to the next living turn.
- **The guard comes first and reads only `state.result`.** Put it before the working copy, the
  fight-start block and the round boundary, so a finished state never reaches the loop. Don't
  gate on anything else: a mid-queue cursor, a dead next entry or an exhausted queue on an
  unfinished fight are all legal. `golden-gloomjaw-executioner` left at `TURN_STEPS` 4 now
  throws: lower it, never catch the error. The error message carries no provenance
  (`CONVENTIONS.md#comment-why-not-what`).
- **Readers of the bracket outside the engine.** `firstRoundEnemyIds` reads the roster from
  brackets (scope above). `bossLockStats` counts boss `TurnStarted`s, so a boss dead at its slot
  stops counting as an unlocked turn. That is correct, but its lock rates in the simulator report
  can move: attribute any change. `attributeStatModifiers` clears its marker on `TurnStarted`, and
  losing an empty bracket changes nothing there (the previous `TurnEnded` already cleared it).
  Grep `src/` for any other `TurnStarted`/`TurnEnded` reader.
- **Stale text outside the type checker:** `resolveTurn`'s comments ("the bracket is ALWAYS
  emitted for a dequeued slot", the clock bumps "whether the actor is alive, dead or skipped",
  the `creatureId === undefined` note), `rollWebBreakFree`'s ("a dead actor's empty bracket
  included"), the turn-end cleanup comment, `types.ts`'s `TurnStarted` comment ("no-op/skipped
  turns"), `firstRoundEnemyIds`' doc ("every living creature gets a TurnStarted"), and golden
  headers that count an empty bracket as a turn.

## Must stay green

All gates in `coding-rules.md`. Every golden and unit test not listed above stays byte-identical
(comments aside). `corpus-coverage.test.ts` (Web's roll-driven `StatusExpired` still covered), the
three `balance-ci-*` threshold tests (green in the probe), and the corpus digest after its one
regeneration.

## The PR must prove

- **Attribution by stages** (`evidence/`). Two throwaway intermediate builds, not committed:
  - **(1)** the dead slot keeps its clock bump and Web roll but loses its bracket. Every corpus
    fight equals `main`'s log with its empty brackets removed (any Web `StatusExpired` inside
    kept in place).
  - **(2)** the dead slot keeps only its clock bump. Every corpus fight equals the final build's.

  Together these show the brackets and the Web draws are the whole change. Then the table: changed
  fights split into brackets-only and diverging, by first differing event, against the probe's
  table, with each result change on its own line.
- **Each changed golden:** its diff is the removed pair(s), plus `TURN_STEPS` lowered by exactly
  its dead-slot count. Show the count per golden.
- **Each mechanism fails with it removed:** putting the bracket back fails test 1; rolling the Web
  in a dead slot fails test 1; gating the Web roll on alive-at-cleanup fails test 2; a dead-slot
  call returning without crossing the boundary fails test 5; removing the guard fails test 8.
- **The guard is byte-identical on its own:** `main` plus only the guard passes every existing
  test and the committed corpus digest.
- **The matchup roster:** over the simulator's fights, the new roster equals `main`'s
  `firstRoundEnemyIds`-derived set fight by fight.
- **Balance** (`phases/4.5/brief.md#balance-verdicts`): `npm run sim` before and after, per spec:
  the CI verdicts (floor 1, first soul, floor 5), the round-cap draw rate, and any move in the
  boss lock stats, attributed. A flipped verdict stops and asks; no tuning.
- The test count, reconciled file by file against `main`.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md#a-dead-creatures-turn-is-skipped-entirely`: one `resolveTurn` call
  is one turn (it skips dead entries and crosses the round boundary itself; Duncan's call at
  kickoff). The golden-change line now names the brackets, the Web draws and `TURN_STEPS`, not the
  turn clock, which appears in no event. `spec/combat.md#resolver-shape` and
  `spec/combat.md#turn-structure` are added to the PR review's rewrite list.
- `.claude/phases/4.5/brief.md#resolveturn-refuses-a-finished-fight`: new item, riding in 4.5-C,
  and the slice table's C row (Duncan's call at kickoff).
- `.claude/phases/4.5/C/brief.md`: the golden-policy line, the scope and "done when", to match.
- Added `phases/4.5/C/evidence/kickoff-probe.md`, the probe this kickoff cites.
