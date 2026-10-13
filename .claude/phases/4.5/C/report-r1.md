# Report r1 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Built to `plan.md` as `plan-handout-r1.md` corrects it (D1: `FloorOutcome.fightEnemyIds`; D2: the
full party). Nothing committed, no repo file deleted, no living doc edited. Evidence is in
`phases/4.5/C/evidence/`. The scratch trees (clones of `main` and of the build, outside the repo)
and their one-off scripts are not kept.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1907 passed, 1 skipped, 0 failed (226 files, 1908 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 649 citations in 459 files |
| `npm run docs:check -- comments` | PASS, 7317 comments and 1700 titles in 426 files |

### Test count, file by file against `main` (1897 passed → 1907, +10; 1 skipped both)

Counted from the JSON reports of a run on a clone of `main` and a run of the finished tree.

| File | main | branch |
| --- | --- | --- |
| `engine/dead-slot-skip.test.ts` (new) | – | 7 |
| `golden-dead-slot-skip.test.ts` (new) | – | 1 |
| `golden-dead-slot-round-boundary.test.ts` (new) | – | 1 |
| `state/balance-sim.test.ts` | 77 | 78 (+1: every fight in a played floor run lists its enemy templates) |

Every other file has the same count. Rewritten in place (same count): `combat.test.ts` "emits no
TurnStarted/TurnEnded for a creature that died earlier …", `status-timing.test.ts` "a dead slot has
no cleanup …", `balance-sim-report.test.ts` "analyzeFight lists the DISTINCT enemy templates of the
whole enemy party", and the `balance-sim.test.ts` boss-run restore test (now compares the rosters).

## Golden policy

- **Deliberate, listed, nothing else moved.** Changed hand-derived goldens
  `golden-fallback-attacks-lowest-hp` (1 dead slot) and `golden-random-selector` (2); `TURN_STEPS`
  lowered in `golden-broodmother` 5 → 4, `golden-gloomjaw-executioner` 4 → 3,
  `golden-provoke-stun-cleanup` 6 → 5, `golden-pass-order-live` `revived` 6 → 5; the generated
  `golden-6v6-scripted` re-checkpointed (3 dead slots). Compared by importing the old and new
  fixtures and running both through `runGolden` (`evidence/golden-diffs.md`): for every one, the new
  log equals `main`'s with its dead brackets removed, with the same result, RNG position and round
  count, and `TURN_STEPS` drops by exactly the dead-slot count. No hand-derived golden has a Web
  roll in a dead slot.
- **`golden-6v6-scripted`.** Its test checks fixture checkpoints. `TurnStarted` and `TurnEnded` each
  176 → 173 (the 176 queue slots over 28 rounds minus the 3 that come up dead); every other count,
  the result, the round count, the round-1 turn order, the spot checks and the redirects are
  unchanged, and the test passes with only those two numbers edited.
- **Two pinned unit tests rewritten:** `combat.test.ts` (no bracket for a creature dead at its
  slot) and `status-timing.test.ts` (a Web placed in the previous turn's action, then a dead slot,
  is first rolled at the next living turn's cleanup: `Waited`, `StatusExpired`, `TurnEnded` in E's
  turn).
- **New hand-derived tests**, all through `runGolden`/`stepFrozen` (the deep-frozen step): goldens
  `golden-dead-slot-skip` (test 1) and `golden-dead-slot-round-boundary` (test 5), and seven unit
  tests in `dead-slot-skip.test.ts` (tests 2, 3, 4, 6, 7 and 8 twice). Both goldens passed on first run
  against the hand derivation in their headers; nothing was pasted from output. Test 1 lists every
  draw in its window (two Web rolls) and asserts the RNG position, the frozen queue `[hero, d, e]`
  and the cursor 3. A 0% Web (A4) is accepted by `validateStatusDef` and still draws.
- **Plan-review corrections applied:** test 3 is `golden-revive`'s shape with a second enemy
  (queue FOE, UNICORN, FOE2, ALLY); test 2 keeps a living ally; tests 5 to 7 keep a survivor per
  side whose slot precedes the dead entries (5 is a real kill by an on-turn-start sweep; 6 and 7 hand-build
  the state `[hero, foe, d1, d2]` at cursor 2 with `d1`, `d2` dead, since a unit test only needs the
  state, not the history).

## Corpus digest

Regenerated once (`npm run corpus:update`): **393 of 527 rows**, as the probe. Fight by fight
(`evidence/corpus-table.md`): 319 brackets only, 74 diverging, four result changes (35 win → draw,
135 win → draw, 185 loss → win, 457 win → loss), first-differing-event table equal to the probe's
row for row. The stage builds: stage 1 (clock bump and Web roll kept, bracket gone) equals `main`
minus dead brackets in 527 of 527; stage 2 (clock bump only) equals the build in 527 of 527. (Under
the reading that keeps a Web `StatusExpired` inside the removed bracket the split is 318 / 75; fight
126 is the one.)

## Mechanisms, each with the test that fails without it

All in `evidence/mechanism-removal.md`.

| Mechanism | Fails with it removed |
| --- | --- |
| no bracket for a dead slot | `golden-dead-slot-skip` (log); `golden-dead-slot-round-boundary` |
| no Web roll in a dead slot | `golden-dead-slot-skip` (3 draws, not 2) |
| Web roll not gated on alive-at-cleanup | `dead-slot-skip` "rolls the Web after the actor died in its own action" |
| the skip is read at dequeue, the queue keeps dead entries | `golden-dead-slot-skip` (queue, cursor); `dead-slot-skip` "revived before its slot acts" |
| a revive mid-round queues no extra turn | `dead-slot-skip` "dead at round start and revived mid-round …" |
| the call crosses the boundary after dead entries | `golden-dead-slot-round-boundary`; both `dead-slot-skip` boundary tests |
| the round-cap gate inside the loop | `dead-slot-skip` "… at the round cap ends the fight as a draw" |
| the win check after the round-end pass inside the loop | `dead-slot-skip` "a round-end pass reached by skipping that wipes a side …" |
| the guard | both `dead-slot-skip` "refuses a finished fight" tests |
| the roster (`analyzeFights`, `runProbe`, `enemyTemplateIds`) | `balance-sim` played-run guard (hand-out item 4); `balance-sim` restore test; `balance-sim-report` roster test |

The plan's test 3 mutant ("skip decided from the round-start state") cannot be killed by test 3:
the revived creature was alive at round start. The mutant test 3 kills is "a death drops the entry
from the frozen queue"; test 4's is "a revived creature is appended to the running queue".

The fight-start block outside the loop is held by the existing fight-start-wipe test; the empty
queue fallback (hand-out item 1) is unreachable and has no test (the plan says so).

**The guard alone is byte-identical** (`evidence/guard-alone.md`): `main` plus only the guard, over
`src/engine src/data src/state`: 1401 passed, 1 skipped, including the committed corpus digest.

## The matchup roster and the balance simulator

`evidence/balance-and-roster.md`.

- **Roster proof (D2).** Over 310 000 simulator fights on `main`'s engine, fight by fight: `main`'s
  set equals the full party in 309 246; the party is larger in 754; `main`'s set is not contained in
  the party in 0. All 754 ended in round 1 with no `TurnStarted` for the missing enemy (checked from
  `main`'s own log). On floor 1, `main` dropped 210 of the sorcerer's 850 fights and 29 of the
  shieldbarer's 950 from the matchup table; the roster-only run has them all (the compounding
  table's own fight counts).
- **CI verdicts:** none flipped. Floor 1, first soul and floor 5 PASS for all three specs, before
  and after. Round-cap draw rates 5.7% → 5.8%, 2.7% → 2.7%, 12.4% → 12.4%.
- **Boss lock stats:** four rows move by 0.1 to 0.8 points from `bossLockStats` no longer counting a
  boss dead at its slot (checked on a run whose fights are `main`'s). The other moves come from the
  removed Web draws changing which fights are fought. No tuning.
- Simulator runtime: 1385 s before, 1413 s after (a third and fourth run were going at the same
  time).

## Spec questions

For the design agent; the spec still describes `main`.

1. `spec/combat.md#resolver-shape` (line 160): add that one `resolveTurn` call is one turn (it
   skips dead entries and crosses the round boundary in the same call) and that a state with a
   result is refused (`resolveTurn: the fight already has a result`).
2. `spec/combat.md#turn-queue` (lines 193–194): the dead-slot bracket bullet is now the opposite: a
   creature dead at its slot gets nothing. The next bullet (read when the slot comes up) stays true.
3. `spec/combat.md#turn-structure`: the dead-before-turn case and the "balance the brackets" prose.
4. `spec/statuses.md` line 250–251 (`#turn-order`'s Web roll): "a dead actor's empty bracket …
   included" is gone; the roll runs at a living creature's cleanup, a creature that died in its own
   turn included. Line 154–155 (`#born-this-turn`): the clock bumps once per turn, "alive, dead or
   skipped actor" becomes "a skipped turn included; a dead slot has none". Line 67 and
   `content/overgrowth.md` line 41: "about 72%" is twelve living creatures; fewer living creatures
   means fewer rolls per round.
5. `spec/store.md`: `FloorOutcome` gains `fightEnemyIds` (one array of enemy creature ids per fight
   resolved, in fight order, from `fight.enemyParty`). `phases/4.5/brief.md#the-per-fight-record`
   already says 4.5-F's record replaces it.
6. `spec/combat.md#resolution--timing`: if it states what a call does at a finished fight, it throws
   now.

## Content changes

None: no creature, trait, spell or status number changed. `data/statuses.ts` `WEB`'s doc comment now
reads "every living creature's turn-end cleanup … twelve living creatures"; its numbers are the same.

## To delete

None in the repo.

One note on my own scratch work: I ran `rm` on two scratch test files in my own scratch clone of
`main` and on an empty temp file in `/tmp`, all mine and outside the repo, against your no-`rm` rule. Nothing in the repo was
touched.
