# Plan — 4.5-B2: every pass over the living creatures in turn order

Read: `CLAUDE.md`, `coding-rules.md`, `kickoff.md`, the slice brief, `evidence/kickoff-probe.md`,
and the code the kickoff names (`turn-order.ts`, `creature-lookup.ts`, `tie-break.ts`, `combat.ts`,
`actions.ts`, `resolution.ts`, `golden-turn-order-status`, `golden-death-observed`, the golden
runner). The spec files the kickoff names are read against the brief, as it says. No spec file
beyond the kickoff's list is reached.

## Approach

One helper, `turnOrderIdsOf(state)`, in `engine/turn-order.ts`. It returns the living creatures'
ids as act-first pole, normal group, act-last pole, each by descending effective Speed, ties
`compareBySideSlotId`, read from the state passed in. `buildTurnQueue` and the helper share one
private function, so there is one comparator and one partition.

`livingIdsOf` is **deleted** (not repurposed): nothing else may feed a pool from it, and a missing
export makes `tsc` find every site. The nine hook calls and the Web roll call `turnOrderIdsOf`
at the pass, as an argument evaluated where `fireHook` is called. Nothing is hoisted, cached or
read inside `fireHook`'s loop, and the whole living list is passed (no prefilter to carriers).

### By file

- `src/engine/turn-order.ts`
  - New private `orderedLiving(playerParty, enemyParty): Creature[]`: filter `alive`; one loop
    reads `turnOrderPosition` **once** per creature and `getEffectiveStat(speed)` **once** per
    creature, buckets into first/normal/last, sorts each bucket with the existing comparator
    (Speed desc, then `compareBySideSlotId`), concatenates. The comparator is total (id is
    unique), so the result does not depend on input array order.
  - `buildTurnQueue(playerParty, enemyParty)` keeps its signature and becomes
    `orderedLiving(...).map(id)`. `sortBySpeed` is reworked to sort precomputed `{creature, speed}`
    entries. The round-start queue stays byte-identical (every existing golden proves it).
  - New export `turnOrderIdsOf(state: CombatState): CreatureId[]` = `buildTurnQueue(state.playerParty, state.enemyParty)`.
    It reads `playerParty`/`enemyParty`, never `state.turnQueue`.
  - Doc comments: `buildTurnQueue`'s "never called again mid-round … nothing can mid-round in v1"
    is replaced (the queue is built once per round; the passes call the same ordering fresh).
- `src/engine/creature-lookup.ts`: delete `livingIdsOf` and its doc comment.
- `src/engine/resolution.ts`
  - `applyDamageAndEmit`: `on-damage-observed` takes `turnOrderIdsOf(working)`.
  - `fireDeathObservers`: `turnOrderIdsOf(state).filter((id) => id !== deadId)` (still by id);
    doc comment "in tie-break order" becomes turn order.
  - `fireHook`'s doc comment ("or tie-break order for a global point") updated. Its loop and
    `claimedNonStacking` are untouched.
  - Import swap.
- `src/engine/actions.ts`: the five `on-action-observed` calls (attack, single cast, AOE cast,
  defend, provoke) take `turnOrderIdsOf(working)`, each at its call (per action instance, so Speed
  changes between instances are read). "Fires on ALL living creatures" comments updated.
- `src/engine/combat.ts`
  - `resolveRoundEnd` and the fight-start pass take `turnOrderIdsOf(...)`.
  - `rollWebBreakFree`: `const bearerIds = turnOrderIdsOf(state)` once at cleanup start, loop
    `getCreature(working, id)` as today (the born-this-turn skip and only-when-present
    discipline unchanged). The local `.filter(alive).sort(compareBySideSlotId)` goes; the
    `compareBySideSlotId` import goes if now unused. Doc comment "canonical side->slot->id" updated.
- `src/engine/effect-types.ts` (~line 863): turn-order comment near `breakChancePercent` updated.
- Stale text audit (grep `livingIdsOf`, `tie-break order`, `side->slot->id`, `side -> slot`,
  `livingIds order`): any golden header or test title that narrates the old order gets a
  **comment-only** edit (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`). Known candidates:
  `golden-death-observed.fixture.ts` header ("The player side first is the order change") and
  `golden-turn-order-status.fixture.ts` ("livingIds order"). No expected value changes.

### Not touched
`pickExtremum`/`compareByKey`, AOE hit order, `adjacentLivingTargets`, every random-pick pool,
`state.turnQueue` and its consumers, content numbers, the living docs.

## Golden policy (from the kickoff)

- Every existing golden and unit test stays byte-identical, comments aside. If an expected value
  moves, stop and explain before going on.
- Corpus digest regenerated **once** via `npm run corpus:update`. Expect 97 of 527 fights change
  (59 reorders, 38 divergences) and fight 185 win → loss, first diverging at a Web roll. Any
  difference from the probe is explained in the report.
- Seven new hand-derived goldens (below), through `runGolden`/`stepFrozen`, arithmetic and draws
  in header comments. No run-then-pasted values. Random draws are derived with an independent
  mulberry32 trace.

## New goldens (hand-derived, shared runner)

Each fixture has creatures whose turn order differs from side → slot → id (a fast enemy, a slow
player). Observers are fixture traits with `relationship: 'any'` and a distinct stat factor each,
as `golden-death-observed` does.

1. `golden-pass-order-observed`: a fast enemy F (30) and a slow player S (10) both observe an
   attack; `on-action-observed` and `on-damage-observed` both fire F then S (main: S then F).
2. `golden-pass-order-poles`: a fight-start status gives a slow creature act-first and a fast one
   act-last; an observed action fires slow-act-first, normal, then fast-act-last, against Speed.
3. `golden-pass-order-speed-change`: observer A (first in the call) applies a Speed status to
   observer C; C still fires in its old place in that call; the next call (next attack instance
   or next action) has C first.
4. `golden-pass-order-web-rolls`: two Webbed bearers, player slow and enemy fast (turn order is
   enemy, player; side → slot → id is player, enemy); the draws go to the enemy bearer first. Both
   outcomes are derived from the seed so a swap changes which bearer breaks free.
5. `golden-pass-order-non-stacking`: two carriers of one `stacks: false`, `chancePercent` trigger
   (fixture trigger with `relationship: 'any'`) on opposite sides; the faster (enemy) gets the
   roll and the slower draws nothing. Seed chosen so the roll succeeds, making the difference
   visible in who fires.
6. `golden-pass-order-fight-start`: two creatures with `on-fight-start` triggers, fast enemy and
   slow player, `TURN_STEPS` stopping after the fight-start pass; they fire enemy then player.
7. `golden-pass-order-live`: (a) a Speed change in turn 1 of the round reorders the `on-round-end`
   pass against the round-start queue; (b) a creature revived mid-round fires in its live place
   in a later pass (the frozen queue has it dead or missing).

## Mechanism → test that fails with it removed, at every site

New unit file `src/engine/pass-order.test.ts` drives each site on a shared 4-creature fixture
(actor, fast-enemy observer F, slow-player observer S, a target), asserting the `TriggerFired`
sequence is `[F, S]`. Each site is reverted to side → slot → id one at a time (as the PR proof) and
must fail its named test.

| Site | Test |
| --- | --- |
| `on-action-observed`, attack | golden 1 + unit |
| `on-action-observed`, single cast | unit (`always-cast`, single spell) |
| `on-action-observed`, AOE cast | unit (AOE spell) |
| `on-action-observed`, defend | unit (`always-defend`) |
| `on-action-observed`, provoke | unit (`always-provoke`) |
| `on-damage-observed` | golden 1 + unit |
| `on-death-observed` | unit (lethal hit), plus the by-id exclusion still holds with a self-revived creature |
| `on-fight-start` | golden 6 |
| `on-round-end` | golden 7a |
| Web roll | golden 4 (the other bearer breaks free if swapped) |

Other mechanisms:

- Helper reads live state, not `state.turnQueue`: goldens 6 (empty queue at fight start) and 7
  (round-start Speeds, revived creature) fail if the helper reads the queue.
- Once per pass, not in `fireHook`'s loop: golden 3 (the call keeps its order after a Speed change).
- Not prefiltered to carriers: a unit test where an earlier response in the same pass gives a
  later creature an observer status; it still fires.
- Not hoisted to action start: unit test where Speed changes between two attack instances; the
  second instance's pass uses the new order.
- Poles beat Speed: golden 2.
- Party array out of slot order still gives slot order on ties: `turn-order.test.ts` case on
  `turnOrderIdsOf` with a hand-built reversed array, plus the same for `buildTurnQueue`.
- The dead creature stays out by id; Web order taken once at cleanup start (a bearer breaking free
  doesn't reorder the rest): unit tests in `pass-order.test.ts`.
- Speed/pole read once per creature: no assertable behaviour; the round-start queue byte-identity
  (all existing goldens) is the check.

## PR proofs (evidence in `phases/4.5/b2/evidence/`)

- **One helper**: grep output showing no `livingIdsOf`, no `[...playerParty, ...enemyParty]` list
  and no `compareBySideSlotId` sort feeding a hook call or the Web roll.
- **Order alone, by reversal**: temporarily swap the helper body to main's order (party-array order
  for hooks; `compareBySideSlotId` for the Web roll) and show every golden passes and the corpus
  digest equals main's committed fixture. The swap is reverted afterwards; reported as run, not
  committed.
- **Corpus table**: before `corpus:update`, dump main's logs and the new logs to scratch (outside
  the repo), classify reorder vs diverge by first differing event as in the probe, and write
  `evidence/corpus-table.md` with fight 185 on its own line.
- **Balance**: `npm run sim` before (on a clean checkout of the start state) and after; the CI
  verdicts (floor 1, first soul, floor 5) and the round-cap draw rate go in `evidence/`. A flipped
  verdict stops and asks.
- **Runtime**: simulator wall time before/after; durations of the three `balance-ci-*` tests and
  the corpus test.
- **Test count** reconciled file by file against `main`.
- All gates: `test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
  `docs:check -- comments`.

## Report items to carry
Spec questions (living-doc text now stale: `spec/effects.md#hook-execution`,
`spec/combat.md#turn-queue`, `spec/statuses.md#turn-order`, `spec/scripting.md` if it narrates
side → slot → id for hooks), no content changes, and **To delete**: nothing expected (`livingIdsOf`
is removed by edit).

## Assumptions checklist

1. ASSUMPTION: `turn-order.ts` importing `CombatState` (type only) and `resolution.ts`/`actions.ts`
   importing `turn-order.ts` creates no import cycle.
2. ASSUMPTION: deleting `livingIdsOf` (rather than keeping it as an alias) is acceptable, since the
   kickoff says what replaces it must not become a pool's source.
3. ASSUMPTION: a trigger response can change a *different* creature's Speed (apply-status or
   stat-modifier with a non-self target) for goldens 3 and 7a; if only self-targeting exists, the
   fixture uses a status applied by an ally selector instead.
4. ASSUMPTION: a revival path usable in a hand-built fixture exists (the `cheat-death` golden
   suggests so) that revives a creature dead at round start to get "revived mid-round" for
   golden 7b; if not, 7b becomes a creature that dies and revives within the round, observed in a
   later pass.
5. ASSUMPTION: a `stacks: false` fixture trigger with `chancePercent` and `relationship: 'any'`
   on a global observation hook can be declared in the fixture (not the shipped Overtone), per the
   kickoff's trap.
6. ASSUMPTION: per-site unit tests may be one file (`pass-order.test.ts`) rather than spread over
   `combat.test.ts`, `actions.test.ts` and `resolution.test.ts`.
7. ASSUMPTION: the corpus classification and before/after logs can be produced by a scratch script
   outside the repo (e.g. `vite-node` importing the engine by path); if the corpus test can't be
   driven that way, I'll ask before putting a scratch file in `src/`.
8. ASSUMPTION: `npm run sim` is deterministic enough that "before" run on the start state and
   "after" run are comparable verdict-for-verdict.
9. ASSUMPTION: the only golden/test narration of the old order that needs a comment edit is what
   the stale-text grep finds; the list above is a starting point, not exhaustive.
