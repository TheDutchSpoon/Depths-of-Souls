# PR review r1 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Branch `4.5-c` at `2f11823` (`2f11823d6879`), against `main` at `dd703a4`. Reviews `report-r1.md`,
built to `plan.md` as `plan-handout-r1.md` corrects it (D1: `FloorOutcome.fightEnemyIds`; D2: the
full party).

## Verdict

**Fixes: one test pin and cleanup** (`handout-r1.md`). The engine change is right and matches the
brief: the guard is the first statement and reads only `state.result`; one loop dequeues past dead
entries and crosses the boundary once per boundary with the round-end pass, its win check and the
cap gate inside it; the frozen queue keeps its dead entries; the "dead at dequeue" gates are gone
and the fresh mid-turn re-checks stay; the Web roll is unconditional at cleanup. Every changed
golden is the listed kind and nothing else moved; brackets plus the dead slots' Web draws are the
whole corpus change, which I reproduced with my own stage builds. What's left: the brief's "no
turn-clock bump" has no test that fails without it, the corpus split is labeled with the looser of
two readings, and a handful of comment, title and evidence lines.

## Real fixes

1. **"No turn-clock bump" is unpinned.** With a dead slot bumping `turnClock` again, all 85 tests in
   the slice's files pass, the corpus digest included. That is expected (every born-this-turn read
   runs after the actor's own bump, so the bump is invisible to behaviour), but the brief states
   it as part of the rule and `golden-dead-slot-skip`'s header claims it. `turnClock` is plain
   state, so one assertion pins it: 2 after HERO's and E's turns, 3 with the bump. Hand-out item 1.

## Scope and labeling (all in `handout-r1.md`)

2. **The corpus split is 318 / 75, not 319 / 74.** The kickoff defines "brackets only" as stage 1
   does: `main`'s log with the empty brackets removed and any Web `StatusExpired` inside them kept
   in place. By that definition fight 126 is not brackets-only. In it the dead slots of
   `lullpollen-reaper-enemy-2`, `-5` and `swarmhive-striker-enemy-4` drew three Web rolls on
   `main`, and the third broke `treant-sapling-enemy-0`'s Web. On the branch the treant's own
   cleanup gets the first of those draws and the Web holds. The fight then ends on the next turn,
   so the dropped `StatusExpired` is the only visible change. That is a removed Web draw. So: 318
   brackets only, 75 at a removed Web draw (74 diverge in later events; in 126 only the
   `StatusExpired` goes). The report and `evidence/corpus-table.md` give both numbers but headline
   319 / 74, and `record.md` carries only 319 / 74. The 319 / 74 in my kickoff came from the probe's
   looser reading. That was my error, not the build's.
3. **The evidence names `main` as `e8d0ffd`.** That is the branch's plan-review commit. Its `src/`
   equals `main`'s `dd703a4` (I diffed them), so the runs are right, but `corpus-table.md`,
   `guard-alone.md` and `balance-and-roster.md` should name `dd703a4`.
4. **Stale "every creature's turn" / "dequeued turn" text the sweep finds in `src/`:**
   `combat.test.ts:1030`'s title ("one roll per dequeued turn": a dead slot is dequeued and doesn't
   roll), `golden-spider-broodwarden.fixture.ts:17` ("at EVERY creature's turn end") and
   `golden-rot-sovereign.fixture.ts:109` ("now-empty, skipped-since-dead" slots: "now-empty" names the
   old empty bracket).
5. **Comment wraps the edits left behind:** `data/statuses.ts:126` (136 columns),
   `golden-broodmother.fixture.ts:134` and `golden-provoke-stun-cleanup.fixture.ts:33–36` and
   `:138` (over 100, and a broken line "not / the fight's eventual outcome"), `combat.ts:186–189`
   (`rollWebBreakFree`'s doc, a short line mid-sentence) and `combat.ts:389` (the turn-start hooks
   comment). Not in the hand-out: the dedent also expanded `main`'s one-line
   `{ stopWhen: fightOver }` argument at `combat.ts:401` into three lines. Prettier accepts both
   forms, and putting it back would make `combat.ts` fail `comment-proof` for this round, which
   costs more than it fixes.

## Decide-points

1. **`spec/store.md` and `FloorOutcome.fightEnemyIds` (the report's spec question 5).** I didn't
   add the field to `spec/store.md`. That file doesn't describe `FloorOutcome`'s fields at all,
   only that `descend` returns `{ ok, outcome }`, and `phases/4.5/brief.md#the-per-fight-record`
   already says 4.5-F replaces the field and that F's review writes the record into the spec.
   One line for a field two slices from deletion would be churn. The rule the field serves, that the
   matchup table counts the whole party, is now in `CONVENTIONS.md`. **Recommend: leave
   `store.md` to 4.5-F.** If you'd rather the spec name every `FloorOutcome` field now, I'll add
   one line.
2. **The spec wording, especially two sentences.** The rewrites are in place (Docs edited, below).
   I'd most want you to check two lines. In `spec/combat.md#turn-structure` the lead is now
   "Every turn runs exactly this sequence. A turn is a living creature's: one dead at its slot has
   none". In `spec/statuses.md#self-clearing-statuses`, the 72% now holds "with all twelve
   creatures of a 6v6 fight alive", and a Web "holds longer as the board empties". That second
   line is design intent: it says the stickier late-fight Web is accepted, not a bug. **Recommend:
   keep both.** The brief chose that consequence.

For information, not a decide-point: the report says the coding agent ran `rm` on its own scratch
files outside the repo, against `coding-rules.md`'s "never delete files". Nothing in the repo was
touched, so there is nothing to undo.

### Decisions

- **D1:** as recommended. `spec/store.md` stays as it is; 4.5-F's PR review writes the per-fight
  record, which replaces `FloorOutcome.fightEnemyIds`, into it.
- **D2:** as recommended. Both spec sentences stay as written.
- The verdict stands: **fixes**, with `handout-r1.md`.

## Verified, and how

All in my own clone (`git clone`, worktrees of `2f11823` and `origin/main`, `npm ci` on each;
Vitest 5.0.3 as the lockfile pins).

- **Gates on the branch:** `test` 1908 tests, 1907 passed, 1 skipped, 0 failed (226 files);
  `lint`, `format:check`, `build`, `npx tsc -b` clean; `docs:check` citations PASS (649 in 459
  files), comments PASS (7317 comments, 1700 titles), budgets 0 over. Matches the report.
- **Test count, file by file** (`vitest --reporter=json`, both trees): `main` 1898 in 223 files
  (1897 passed), branch 1908 in 226. Differences: `dead-slot-skip.test.ts` +7, the two new golden
  tests +1 each, `balance-sim.test.ts` 78 → 79 (77 → 78 passed, 1 skipped both). Three titles
  renamed in place (`combat.test.ts`, `status-timing.test.ts`, `balance-sim-report.test.ts`).
  Every other file is equal in count and titles. Matches the report.
- **Old goldens:** every export of all 142 `main` fixtures imported on both trees
  (`import.meta.glob`, Maps serialized) and deep-compared. 135 are identical in every export; the 7
  that differ are exactly the listed ones, in exactly the listed exports (`expectedEvents`,
  `revivedExpected`, `TURN_STEPS`, `revived.TURN_STEPS`, `expectedEventTypeCounts`). For each of the
  six with a stored log, `main`'s log with its dead-slot pairs stripped equals the branch's: 1, 2,
  1, 1, 1, 1 pairs. `TURN_STEPS` drops by exactly that count (5 → 4, 4 → 3, 6 → 5, 6 → 5).
  `golden-6v6-scripted`: only `TurnStarted` and `TurnEnded` change (176 → 173). Replaying it on
  `main` gives 176 dequeued slots over 28 rounds (the last queue fully dequeued, so "queue slots"
  is literal) and 3 dead ones, in rounds 3 (`p3`, `e3`) and 7 (`e1`). None is in round 1, so
  `expectedRound1TurnOrder` holds. Two new fixtures only.
- **New goldens, by hand:** `golden-dead-slot-skip` (HERO 20 vs D Defence 0: core 20 + chip 0.2 =
  20.2 → 20, D dies; the two Web rolls are the only draws, since the lowest-HP pick and the attack
  draw nothing) and `golden-dead-slot-round-boundary` (flat 5 on Defence 0; Intelligence 20 × 2 =
  40) recomputed; both seeds are inert (a 0% Web and no RNG). The unit tests' setups traced: test
  3's queue FOE 10, UNICORN 5, FOE2 2, ALLY 1 with FOE killing ALLY (20.2 → 20 on 20 HP), UNICORN
  killing FOE (10.1 → 10 on 10 HP) and reviving ALLY on its attack; test 4's round-2 queue
  unicorn 40, d 20, foe 10.
- **Corpus digest:** 393 of 527 rows differ from `main`'s fixture; result changes 35 win → draw,
  135 win → draw, 185 loss → win, 457 win → loss, with the report's event counts. Whole logs
  dumped on both trees and compared: all 393 changed fights have a dead slot, and no unchanged
  fight has one. The first-differing-event table under the "contents dropped" reading is the
  report's table, row for row.
- **Attribution by stages, reproduced** (env-flag copies of the branch): a dead slot that bumps the
  clock and rolls the Web, without a bracket, equals `main` minus the empty brackets (contents kept)
  in 527 of 527 fights, RNG position included. A dead slot that only bumps the clock equals the
  final build in 527 of 527, RNG included. A dead-slot Web draw changes 84 fights' RNG position
  and 75 fights' logs.
- **The guard alone:** `main` plus only the guard, full suite (wider than the report's three
  directories): 1898 tests, 1897 passed, 1 skipped, 0 failed, the committed corpus digest included.
  Byte-identical on its own, as the report says.
- **Mutation, each mechanism** (env-flag copy; ran `dead-slot-skip`, the two new goldens,
  `combat.test.ts`, `status-timing.test.ts` and `corpus-digest`, 85 tests; unmutated: 0 fail):

  | Mutant | Fails |
  | --- | --- |
  | the dead slot gets its bracket back | `golden-dead-slot-skip`, `golden-dead-slot-round-boundary`, `dead-slot-skip` round cap, the rewritten `combat.test.ts` and `status-timing.test.ts` tests (+ corpus) |
  | the dead slot rolls the Web | `golden-dead-slot-skip` (+ corpus) |
  | **the dead slot bumps the clock** | **nothing** (real fix 1) |
  | the Web roll gated on alive-at-cleanup | `dead-slot-skip` "rolls the Web after the actor died …" (+ corpus) |
  | the call returns after skipping the last dead entries, without crossing | `golden-dead-slot-round-boundary`, `dead-slot-skip` round cap and round-end wipe |
  | no guard | both `dead-slot-skip` "refuses a finished fight" tests |
  | no cap gate when the boundary is reached by skipping | `dead-slot-skip` round cap |
  | no win check after the round-end pass reached by skipping | `dead-slot-skip` round-end wipe |
  | a skipped entry is dropped from the frozen queue | `golden-dead-slot-skip` (queue, cursor). The corpus stays green: no fight reads a dead entry, which bears out the brief's "nothing else reads a dead slot" |
  | `analyzeFights` passes no roster | `balance-sim` "every fight in a played floor run lists its enemy templates" (1 of 109) |

  I didn't rerun the revive-appended (M7) or `runProbe` (M11) mutants; the report's table
  covers them and they touch code the others bracket.
- **Live behaviour (corpus scan, branch):** 527 fights; no `TurnStarted` for a dead creature, no
  action or non-`on-death` trigger by a dead creature, brackets balanced and never nested, no Web
  `StatusExpired` outside a bracket, no event after `FightEnded`, every fight ends with one.
- **Code against the brief:** read `resolveTurn` whole. The empty-rebuilt-queue finalize sits right
  after `buildTurnQueue` (plan hand-out 1). `getCreature(working, …)` is read at dequeue, after
  any round-end pass in the same call. The only bracket readers outside the engine are
  `bossLockStats`, `attributeStatModifiers` (clears on any boundary, so losing an empty bracket
  changes nothing) and the unmounted `CombatDemo.tsx`. `acted-before-target` compares queue
  indices, which skipping never changes. The roster: `descend` pushes `fight.enemyParty` ids per
  fight beside `allEvents`, `runProbe` returns them, `analyzeFights` pairs them with `splitFights`
  and throws on a count mismatch.
- **Leftover sweep** (`src/`, `.claude/` minus `phases/` and `archive/`): `firstRoundEnemyIds` 0
  hits; "empty bracket" left only in `resolution.test.ts:84` and `status-containers.test.ts:253`,
  both about a living creature's skipped turn, still true; "dequeued turn", "every creature's
  turn", "72%" and "dead actor" in `src/`: items 4 and 5; in the docs: the lines I rewrote below.
- **Balance:** the three `balance-ci-*` threshold tests pass in the gate run. I didn't rerun
  `npm run sim` (about 25 minutes per tree). The report shows no verdict flip and draw rates within
  0.1 points. Its "brackets" tree is `main`'s fights by construction, and I reproduced that
  equivalence above. Its roster proof (754 of 310 000 fights, all ended in round 1 before the
  missing enemy's slot) is consistent with how `main`'s reader works: on `main` every dequeued
  slot got a bracket.
- **Mailbox:** step files plus six `evidence/` files, each cited by the kickoff or the report.
  Nothing to delete.

## Docs edited

- `.claude/spec/combat.md#resolver-shape`: one call is one turn (it dequeues past dead entries and
  crosses the round boundary itself; a stepping caller counts only turns that happen); new bullet,
  a finished fight is refused (`resolveTurn` throws on a state with a result, before anything else).
- `.claude/spec/combat.md#turn-queue`: a creature dead at its slot gets nothing (no bracket, clock
  bump or Web roll); the frozen queue keeps its entry and only the cursor moves (was: an empty
  bracket with the Web roll in it).
- `.claude/spec/combat.md#turn-structure`: the sequence is a living creature's turn; the actor can
  die mid-turn, the hooks, grants and countdown stop with it, the Web roll still runs.
- `.claude/spec/statuses.md#self-clearing-statuses`: Web rolls at every living creature's turn;
  72% holds with all twelve alive, and a Web holds longer as the board empties.
- `.claude/spec/statuses.md#born-this-turn`: the clock bumps once per turn, a skipped turn
  included, never for a dead slot; why the missing bumps change no born-this-turn result (the
  brief's invariant).
- `.claude/spec/statuses.md#turn-order`: the roll is at every living creature's turn and the next
  living creature's cleanup; it runs at every turn's cleanup, a turn whose actor died in it
  included, never at a dead slot.
- `.claude/content/overgrowth.md#web`: every living creature's turn; a Web holds longer as
  creatures fall.
- `.claude/CONVENTIONS.md#balance-simulator` (the matchup-table bullet): a fight counts for
  every enemy in its party, one that never got a turn included (plan-review D2, now built).
