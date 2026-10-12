# Plan review — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Reviewed against `kickoff.md`, `phases/4.5/brief.md#a-dead-creatures-turn-is-skipped-entirely`,
`phases/4.5/brief.md#resolveturn-refuses-a-finished-fight`, `phases/4.5/C/brief.md`,
`evidence/kickoff-probe.md` and the code on `4.5-c` (`engine/combat.ts`, `state/balance-sim.ts`,
`state/store.ts`, `golden-6v6-scripted`, `golden-revive`, `golden-actor-dies-attack`).

## Round 1

**Verdict:** approved once Duncan answers the two decide-points; the corrections below ride in the
round's hand-out (none needs a re-plan). The engine design (guard first, one loop over the
boundary and the dequeue, the frozen queue untouched, the Web roll left unconditional at cleanup)
matches the brief and the kickoff's traps. The golden policy matches the kickoff line for line.

### Plan fixes

1. **The empty-queue fallback moves next to the rebuild.** In the loop, `next === undefined` *is*
   the boundary. The existing defensive `finalize(checkWinLoss ?? 'draw')` sits on that same
   condition today, so carried over as is it would never run: an empty rebuilt queue would take
   the boundary again (a second round-end pass, a new round) up to the round cap. Check the rebuilt
   queue right after `buildTurnQueue` (`queue.length === 0` → `finalize(checkWinLoss ?? 'draw')`).
   Still unreachable, still no iteration cap.
2. **Test 3's setup is impossible as written.** A creature dead before the round starts is not in
   the queue (`buildTurnQueue` skips the dead), so "queue [R, D] with D dead" can't happen. D must
   die earlier in the same round: queue [K, R, D, …] where K kills D and R revives D, then D acts in
   its own slot. `golden-revive` is that shape already (FOE kills ALLY, UNICORN revives ALLY,
   ALLY's slot comes after); add one living enemy so the fight doesn't end before ALLY's slot. Its
   revive draws one number (pool of one): the derivation counts it.
3. **Test 5's setup is impossible as written.** In queue [HERO, D1, D2], if HERO kills D1 and D2 and
   they are the enemy side, the fight ends as a win; "or `setup`" puts them outside the queue. Each
   side needs a survivor whose slot comes before the dead ones, e.g. [E, HERO, D1, D2] with E an
   always-wait enemy and HERO killing D1 and D2 in its turn (an AoE, or a lethal reaction: whichever
   the derivation keeps simplest), plus an `on-round-end` trait so the pass shows as an event.
   The same constraint holds for tests 6 and 7.
4. **Test 1's "RNG advanced by exactly 2"** is a claim, so the fixture comments list every draw in
   the window (target selection, revive, reaction chances), not only the Web rolls. With plain
   `always-attack` against a lowest-HP target nothing else should draw, but the comment shows it.
5. **Test 2 keeps a living ally on the actor's side** (as `golden-actor-dies-attack`'s ALLY does).
   If the actor's death wipes its side, `closeIfWiped` returns before cleanup and there is no Web
   roll to observe, so the alive-at-cleanup mutant would survive.
6. **`golden-6v6-scripted` has no stored log** (A12): its test checks checkpoints in the fixture
   (`expectedEventTypeCounts`, `expectedRound1TurnOrder`, result, round, spot checks). The
   re-checkpoint is: `TurnStarted` and `TurnEnded` each −3; `expectedRound1TurnOrder` loses an id
   only if a dead slot falls in round 1; every other count, the result, the round and the spot
   checks unchanged. Those unchanged counts are the "brackets only" proof; the header shows this
   arithmetic.
7. **A guard test for the roster argument** (A5). With `enemyIds` optional, a production caller that
   forgets it silently yields an empty roster: the very drop-out the kickoff warns about. Add a test
   over a `playFloorRun` that every `FightMetrics.enemyTemplateIds` is non-empty (every fight has an
   enemy). Name it in the mechanism table.
8. **One more stale comment:** `data/statuses.ts`, `WEB`'s doc ("rolled at every creature's turn-end
   cleanup", "~72% free within one round"). It becomes every living creature's turn.

### Assumptions

- **A1** (store field for the roster): **decide-point D1** below.
- **A2** (party vs `main`'s roster): **decide-point D2** below. Don't leave it as a build-time stop.
- **A3** (drop the outer `if (actor.alive)`, keep the fresh re-checks): **confirm.** `actor` is
  alive at dequeue by construction; the comment says so instead.
- **A4** (`breakChancePercent: 0` passes and still draws): **confirm.** No validator bounds it
  (`effect-types.ts` checks only that it sits inside a status), and `rollWebBreakFree` calls
  `nextRandom` before the compare.
- **A5** (optional `enemyIds` on `analyzeFight`): **correct**: keep it optional so the hand-built
  report tests stay byte-identical, and add the guard test in plan fix 7.
- **A6** (keep the defensive finalize, no cap): **correct**: placement per plan fix 1.
- **A7** (`CombatDemo.tsx` unchanged): **confirm.** It is unmounted (`App.tsx` renders the stub;
  `phases/4.5/A/brief.md` keeps the file), and it reads events as they come. The only other
  bracket readers in `src/` are `combat.ts`, `types.ts` and `balance-sim.ts`, all in the plan.
- **A8** (tests 1 and 5 goldens, the rest unit tests in `dead-slot-skip.test.ts`): **confirm.**
- **A9** (stage builds in a scratch clone, tables only in `evidence/`): **confirm.**
- **A10** (the error message): **confirm.**
- **A11** (test 8's two states built by stepping): **confirm.**
- **A12** (`golden-6v6-scripted`): **correct** per plan fix 6.

### Mechanism coverage

Every mechanism the kickoff lists has a killing test, at its site: bracket and dead-slot Web roll
(test 1), alive-at-cleanup gate (test 2), skip decided at dequeue (tests 3, 4), crossing the
boundary (test 5), the cap gate and the win check inside the loop (tests 6, 7), the guard (test 8),
the frozen queue keeping dead entries (test 1's queue assertion), the roster (the report test, the
restore test, and plan fix 7). The fight-start block outside the loop is held by the existing
fight-start-wipe test.

### Decide-points

**D1 — Where the simulator gets each fight's enemy party (A1).** The events carry no roster and
only `descend` holds `fight.enemyParty`. Options: (a) the plan's `FloorOutcome.fightEnemyIds`,
additive; (b) the sim re-runs `generateFloor` with the store's seed derivation (duplicates store
logic that must stay in lockstep); (c) pull 4.5-F's per-fight record forward (scope creep into
another slice's ASSUMPTION). **Recommend (a)**, because it is the smallest correct change, and
because 4.5-F's per-fight record already carries "both parties as they entered the fight". So I'd
also add one line to `phases/4.5/brief.md#the-per-fight-record`: the record replaces
`fightEnemyIds`. F then deletes the field rather than keeping two copies of the roster.

**D2 — The matchup roster: the full party, or exactly `main`'s set (A2).** The plan is right that
these differ, and the difference is a bug on `main`, not a detail. `main` counts an enemy only if
its round-1 slot was dequeued before the fight ended. Floor 1 has **one** enemy
(`balance-sim.ts`, `MatchupRow`'s doc), so every floor-1 fight the player wins before that enemy's
first slot has no enemy bracket at all and **drops out of the matchup table entirely** today. My
kickoff line "must count exactly the enemies it counts on `main`" would freeze that bug.
**Recommend: the full party.** The proof becomes: per fight, the new roster ⊇ `main`'s, and every
fight where they differ ended in round 1 before the missing enemy's first slot (checked from
`main`'s log). Report the matchup table before/after with that delta attributed. The table is
report-only; no CI verdict reads it. I'd rewrite the kickoff's roster line to match.

### Decisions

- **D1:** (a), as recommended. `FloorOutcome.fightEnemyIds` is added in this slice; 4.5-F's
  per-fight record replaces it.
- **D2:** the full party, as recommended. The roster proof is containment plus attribution of
  each difference, and the matchup table is reported before and after.
- Verdict: **approved**, with `plan-handout-r1.md`.

### Docs edited

- `.claude/phases/4.5/C/kickoff.md`: the roster paragraph in Scope (full party, from
  `FloorOutcome.fightEnemyIds`) and the "matchup roster" proof line (containment, each difference
  attributed, table before and after) (D1, D2).
- `.claude/phases/4.5/brief.md#the-per-fight-record`: the record replaces
  `FloorOutcome.fightEnemyIds` (D1).
