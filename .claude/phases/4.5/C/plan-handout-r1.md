# Plan hand-out, round 1 — 4.5-C

**Verdict: approved.** Build `plan.md` with the items below; where they disagree, this hand-out
wins. Re-read the kickoff's Scope paragraph on the matchup roster and its "matchup roster" line
under "The PR must prove": both were edited.

1. **The empty-queue fallback** (Approach §3, A6). In the loop, `next === undefined` is the round
   boundary. The defensive empty-queue finalize sits right after `buildTurnQueue`: if the rebuilt
   queue is empty, `finalize(checkWinLoss(working) ?? 'draw')`. It is unreachable; there is no
   iteration cap.
2. **The roster** (A1, the `balance-sim.ts` section). `FloorOutcome.fightEnemyIds` holds one array
   of enemy creature ids per fight resolved, in fight order, filled by `descend` from
   `fight.enemyParty`. `runProbe` returns it with its events. The roster is the full enemy party:
   `enemyTemplateIds` is the distinct template ids of every enemy in it, including one whose slot
   never came up.
3. **The roster proof** (A2, evidence plan). Over the simulator's fights, fight by fight: the new
   roster contains `main`'s `firstRoundEnemyIds`-derived set, and every fight where they differ
   ended in round 1 before each missing enemy's first slot, checked from `main`'s log. Report the
   matchup table before and after, with that delta attributed. This is not a stop.
4. **The roster argument** (A5). `analyzeFight`'s `enemyIds` argument stays optional (default `[]`).
   A test over a `playFloorRun` asserts every `FightMetrics.enemyTemplateIds` is non-empty; it fails
   if a production caller omits the roster. Add it to the mechanism table.
5. **Test 1** (`golden-dead-slot-skip`). The fixture comments list every RNG draw in the window
   (target selection, reaction chances and the Web rolls), and the expected RNG position follows
   from that list.
6. **Test 2.** The dying actor has a living ally on its side, so its death is not a wipe and the
   turn reaches cleanup (the `golden-actor-dies-attack` shape, ALLY included).
7. **Test 3.** D dies earlier in the same round, before the reviver's slot: queue [K, R, D, …],
   K kills D, R revives D, D acts in its own slot. Base it on `golden-revive`'s shape (FOE kills
   ALLY, UNICORN revives ALLY) with one more living enemy so the fight doesn't end before ALLY's
   slot. The revive's target pick draws one number; the derivation counts it.
8. **Tests 5, 6 and 7.** Each side keeps a living creature whose slot comes before the dead
   entries, so the deaths don't end the fight, e.g. queue [E, HERO, D1, D2] with E an always-wait
   enemy and HERO killing D1 and D2 in its turn. An `on-round-end` trait makes the round-end pass
   show as an event.
9. **`golden-6v6-scripted`** (A12). Its test checks fixture checkpoints, not a stored log. Update
   them: `TurnStarted` and `TurnEnded` each −3; `expectedRound1TurnOrder` drops an id only for a
   dead slot in round 1; every other count, the result, the round and the spot checks unchanged.
   The header shows this arithmetic.
10. **Stale comments** (Approach §5): add `WEB`'s doc in `data/statuses.ts` ("rolled at every
    creature's turn-end cleanup", "~72% free within one round"): the roll runs at every living
    creature's turn.
