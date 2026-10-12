# Kickoff — Phase 4.5 — Slice B2: every pass over the living creatures in turn order

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/effects.md` (the `## Engine rules` half, closely: `spec/effects.md#hooks`,
  `spec/effects.md#hook-execution`, `spec/effects.md#dead-creatures`,
  `spec/effects.md#action-reactions-actor-self-hooks-or-observation`,
  `spec/effects.md#damage-observation`, `spec/effects.md#chancepercent`,
  `spec/effects.md#stacks-false`), `spec/combat.md` (`spec/combat.md#rounds-and-turns`,
  `spec/combat.md#turn-queue`, and `spec/combat.md#aoe-cast` for an order that does **not**
  change), `spec/statuses.md` (`spec/statuses.md#turn-order`, `spec/statuses.md#born-this-turn`,
  `spec/statuses.md#turn-end-cleanup`) and `spec/scripting.md#target-selectors-in-the-engine` (the
  tie-break that stays). The spec still describes `main` (side → slot → id) until this slice's PR
  review; build against the brief.
- The brief: `phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`,
  `phases/4.5/brief.md#balance-verdicts`, `phases/4.5/B2/brief.md`, and the open
  ASSUMPTION (B2) in `phases/4.5/brief.md#assumptions`.
- Content docs: `content/overgrowth.md#web`, `content/glimmerdark.md#grant-act-first` (the two
  turn-order statuses) and `content/glimmerdark.md#resonant-overtone` (the only shipped
  `stacks: false` trigger).
- Code, before planning: `engine/turn-order.ts` (`buildTurnQueue`, `turnOrderPosition`,
  `sortBySpeed`), `engine/creature-lookup.ts` (`livingIdsOf`), `engine/tie-break.ts`,
  `engine/combat.ts` (`rollWebBreakFree`, `resolveRoundEnd`, the fight-start pass in
  `resolveTurn`), `engine/actions.ts` (the five `on-action-observed` calls: attack, single cast,
  AOE cast, defend, provoke), `engine/resolution.ts` (`applyDamageAndEmit`'s
  `on-damage-observed` call, `fireDeathObservers`, and `fireHook`'s loop and
  `claimedNonStacking`).
- Goldens: `golden-turn-order-status`, `golden-web-break-free`,
  `golden-status-timing-web-turn-end-roll`, `golden-death-observed`, `golden-resonant-overtone`,
  and `engine/corpus-digest.test.ts`.
- `phases/4.5/B2/evidence/kickoff-probe.md`: what the plainest version of this change moves on
  `main`. Your build should reproduce its numbers; any difference is explained in the report.

## Scope

The nine multi-creature hook calls (the five `on-action-observed` sites, `on-damage-observed`,
`on-death-observed`, `on-fight-start`, `on-round-end`) and the Web break-free roll take their
creatures in **turn order**: act-first pole, normal group, act-last pole, each by descending
effective Speed, ties side → slot → id. The order comes from **one** helper that shares
`buildTurnQueue`'s ordering (not a second copy of it), reads the state live at the moment the pass
starts, and is taken once per pass. `on-death-observed` keeps leaving the dead creature out by id.

ASSUMPTION (B2) is confirmed: turn order covers all five hooks, `on-fight-start` and
`on-round-end` included, not just the three observation hooks. Leaving those two on side → slot →
id would keep two orders in the engine, and the player side would still react first on them.

**Not in this slice:** the dead-creature turn skip (4.5-C); AOE hit order, Splashing adjacency,
the extremum picks and every random-pick pool (they keep side → slot → id or slot order); a
hook-type index or any cache of the order; any content number; any living-doc edit (they go under
**Spec questions**).

## Golden policy

Deliberate, listed, and narrower than the brief allows. On `main` the probe changes **no**
hand-derived golden and no unit test. No existing golden has two creatures firing on one call in an
order that turn order changes, nor two Web bearers out of turn order.

- **Every existing golden and unit test stays byte-identical.** Comment-only edits are allowed
  (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`) where a comment narrates the old order.
  If an expected value changes, stop and explain it before going on: either the build isn't the
  plain order or something else changed.
- **The corpus digest is regenerated once** (`npm run corpus:update`). Expect the probe's 97 of 527
  fights (59 pure reorders, 38 that diverge after a reorder), with one result change: fight 185,
  win → loss, first diverging at a Web roll.
- **New hand-derived goldens**, through the shared runner, one claim each (a golden may carry
  several if each stays readable):
  1. a faster enemy reacts before a slower player creature on one call (an observation hook);
  2. an act-first or act-last status moves a creature's place on a call, against its Speed;
  3. a response early in a call changes a later creature's Speed, and that call's order stays as
     it was taken;
  4. two Webbed bearers whose turn order differs from side → slot → id roll in turn order: the
     draws go to the faster one first;
  5. two carriers of one `stacks: false` trigger on opposite sides: the faster one gets the chance
     and the slower one draws nothing;
  6. `on-fight-start` with two firing creatures out of side → slot → id order (there is no queue
     yet at fight start);
  7. a pass after the round's queue was built reads the live order: a Speed change earlier in the
     round, or a creature revived mid-round, fires in its live place.

## Traps

- **Not the frozen queue.** `state.turnQueue` is empty at fight start, holds dead creatures,
  lacks one revived mid-round, and has round-start Speeds. Goldens 6 and 7 fail against it.
- **Once per pass, at the pass.** Take the order where each `fireHook` call is made, from the
  state at that moment: per action instance for `on-action-observed` (Speed can change between
  instances), per damage event, per death, per cleanup. Don't hoist it to the action's start, and
  don't re-read it inside `fireHook`'s loop.
- **Don't prefilter the pass to today's carriers** to save the sort. `fireHook` reads each
  creature's candidates when its turn in the pass comes, so a creature given an observer status by
  an earlier response in the same pass still fires. Prefiltering would silently drop it. Sorting
  the whole living list and letting `fireHook` skip non-carriers keeps today's membership.
- **One ordering.** The round-start queue and the passes share one comparator. Every existing
  golden proves the round-start queue didn't move. Changing `buildTurnQueue`'s internals to share
  it is in scope; changing its order is not.
- **What stays on side → slot → id.** `pickExtremum`/`compareByKey`, AOE hit order
  (`spec/combat.md#aoe-cast`), `adjacentLivingTargets`, and every pool a random pick draws from.
  Reordering a random pool keeps the draw but changes which creature it lands on. No pool reads
  `livingIdsOf` today; whatever replaces it must not become one's source.
- **The dead creature stays out by id** in `fireDeathObservers`: filter the turn-ordered list, as
  today. A self-revived creature is alive and in turn order, so the by-id filter is still what
  keeps it from observing its own death.
- **The Web roll's order is taken once at cleanup start.** A bearer that breaks free leaves the
  act-last pole, but that doesn't reorder the remaining rolls. The born-this-turn skip and the
  only-when-present discipline don't change.
- **`stacks: false` on a shipped trigger.** The Resonant Overtone observes `ally` casts only, so
  two Overtones on opposite sides never both match one cast. Golden 5 needs a fixture trigger with
  `relationship: 'any'`, or one that fires on a global hook.
- **Showing order needs different Speeds.** With equal Speeds and no turn-order status, turn order
  is side → slot → id and nothing moves. Every new golden needs creatures whose turn order differs
  from side → slot → id.
- **Runtime.** The probe costs about +60% on corpus resolution, and that cost is accepted
  (`phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`). No cache that
  outlives a pass and no hook-type index (`spec/effects.md#hook-execution`). A cheaper computation
  of the same order (each creature's pole read once instead of three times, say) is fine if the
  round-start queue stays byte-identical.
- **Stale text outside the type checker.** `docs:check -- comments` won't catch these:
  `livingIdsOf`'s doc comment ("tie-break order"), `buildTurnQueue`'s ("never called again
  mid-round"), `rollWebBreakFree`'s ("canonical side->slot->id"), `fireDeathObservers`'s,
  `effect-types.ts`'s turn-order comment near `breakChancePercent`, and any golden header or test
  title that narrates the order.

## Must stay green

All gates in `coding-rules.md`. Every existing golden and unit test byte-identical, comments
aside. `turn-order.test.ts`, `death-observed.test.ts`, the three `balance-ci-*` threshold tests
(green in the probe) and the corpus digest after its one regeneration.

## The PR must prove

- **One helper.** Every listed pass takes its creatures from it. No other list of living creatures
  feeds a multi-creature hook call. `combat.ts` no longer sorts Web bearers itself. Show the grep.
- **Order alone, by reversal.** With only the helper swapped back to `main`'s order, every golden
  passes and the corpus digest equals `main`'s committed fixture. `main`'s order is party-array
  order for the hooks and `compareBySideSlotId` for the Web roll, which differ when a hand-built
  array isn't in slot order. This is the attribution; the table below is the explanation.
- **The corpus table** (in `evidence/`): changed fights split into reorders and divergences, by
  first differing event, against the probe's table. Fight 185's result change gets its own line.
- **Each mechanism fails with it removed, at each site** (`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`):
  each of the nine hook calls and the Web roll, put back on side → slot → id one at a time, fails
  a test. The helper reading `state.turnQueue` fails goldens 6 and 7. A party array out of slot
  order still gives slot order on ties.
- **Balance** (`phases/4.5/brief.md#balance-verdicts`): `npm run sim` before and after, per spec:
  the CI verdicts (floor 1, first soul, floor 5) and the round-cap draw rate. A flipped verdict
  stops and asks; no tuning.
- **Runtime:** the simulator's wall time before and after, and the CI threshold tests' and corpus
  test's durations.
- The test count, reconciled file by file against `main`.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`: the order
  is computed fresh per pass, never cached, and its cost is accepted (Duncan's call at kickoff).
- `.claude/phases/4.5/brief.md#assumptions`: ASSUMPTION (B2) ticked, all five hooks (Duncan's call
  at kickoff).
- Added `phases/4.5/B2/evidence/kickoff-probe.md`, the probe this kickoff cites.
