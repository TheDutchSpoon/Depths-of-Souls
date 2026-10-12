# Plan review — 4.5-B2: every pass over the living creatures in turn order

## Round 1

**Verdict:** approved, with this round's hand-out (`plan-handout-r1.md`). Every fix below is local and precise; none changes the scope, the
helper design, the golden policy or anything in the brief's Assumptions checklist. Recommended
handling: approve with this round's hand-out (decide-point 1); Duncan approved.

Checked against `kickoff.md`, `brief.md`,
`phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`, the living docs and
the code on the branch. Every `fireHook(` call in `src/engine` was listed: the nine multi-creature
calls are exactly the nine that read `livingIdsOf` (five in `actions.ts`, two in `combat.ts`, two
in `resolution.ts`); every other call passes `[actor.id]`, `[target.id]` or `dealerIds`.
`rollWebBreakFree` is the only other sort over both parties. The plan's site list is complete.

The helper design is right: one private `orderedLiving` behind both `buildTurnQueue` and
`turnOrderIdsOf`, a total comparator (so party-array order can't leak), live state, evaluated as
`fireHook`'s argument at the call. Reading the pole and Speed once per creature is the "cheaper
computation of the same order" the kickoff allows: both reads are pure, so the order is identical.

### Plan fixes

1. **Golden 3 needs a creature for C to pass.** With observers A and C only, A then C is the order
   whether the pass is taken once or re-read per creature, so the golden kills nothing. Use three
   observers on one call: A fastest, then B, then C. A's response raises C's Speed above B's. That
   call fires A, B, C; the next call fires C before B. The header names the mutant it kills
   (re-reading the order during the pass).
2. **Golden 7a states both orders it differs from.** It carries two mutants: the helper reading
   `state.turnQueue` (needs the live order ≠ the round-start queue) and the `on-round-end` site put
   back on side → slot → id (needs the live order ≠ side → slot → id). With two creatures: the
   player creature faster at round start (queue = side → slot → id = player, enemy), the enemy's
   Speed raised above it during the round, so the round-end pass fires enemy, player, against both.
   The header names both mutants.
3. **The Web roll's "taken once" unit test can't fail; drop it.** A roll that breaks free changes
   only the bearer that just rolled; the remaining bearers' poles and Speeds don't move (nothing
   scales Speed on another creature's Web), so re-reading the order after each roll gives the same
   sequence. List it beside "Speed/pole read once" as held by construction: one
   `const bearerIds = turnOrderIdsOf(state)` before the loop, shown in the grep proof.
4. **The reversal reproduces `main`'s two orders.** One helper feeds both the hooks and the Web
   roll, but `main` uses party-array order for the hooks and `compareBySideSlotId` for the Web roll,
   so swapping the helper body alone gives only one of them. The reversal patch: the helper body
   returns party-array order (`[...playerParty, ...enemyParty].filter(alive).map(id)`), and the Web
   roll sorts the helper's list by `compareBySideSlotId`. Keep the patch as a diff in
   `phases/4.5/B2/evidence/reversal.md` with its run's result (every golden passes, the corpus
   digest equals `main`'s committed fixture), so the PR review can re-apply it. It is never
   committed to `src/`.
5. **The grep proof covers placement and membership at every site.** The unit tests pin "not
   hoisted to the action's start" and "not prefiltered to carriers" at one site each; the grep
   holds the rest: each of the nine calls has `turnOrderIdsOf(<state>)` inline as `fireHook`'s
   second argument, unfiltered except `fireDeathObservers`' by-id filter.
6. **Golden 7b uses the real revive path; no fallback.** See ASSUMPTION 4 below.
7. **Golden 2 says how its act-last bearer avoids extra draws.** Web carries `breakChancePercent`,
   so a Webbed fast creature makes every cleanup draw. Either a fixture `turn-order: last` status
   with no break chance (preferred: the golden then pins only the poles), or Web with each
   break-free draw derived in the header. The plan says which.
8. **Mailbox path casing.** Git tracks the folder as `phases/4.5/B2/` (the kickoff cites
   `phases/4.5/B2/evidence/kickoff-probe.md`). The plan's `phases/4.5/b2/evidence/` resolves only
   on a case-insensitive disk; CI runs on Linux. Use `B2` in every path the plan, report and
   evidence write.
9. **The report's Spec questions carry the full stale list:** `spec/effects.md#hook-execution`
   (global points "in the standard tie-break order"), `spec/effects.md#damage-observation` (the
   `on-death-observed` pass "in the standard tie-break order"),
   `spec/effects.md#action-reactions-actor-self-hooks-or-observation`,
   `spec/effects.md#stacks-false` (which carrier gets the chance), `spec/combat.md#turn-queue` (the
   ordering is shared and also read per pass) and `spec/statuses.md#turn-order` (the Web roll "over
   living bearers in side → slot → id order"). `spec/scripting.md#target-selectors-in-the-engine`
   is the extremum tie-break, which stays: not stale.

### Assumptions

1. **Confirm.** `turn-order.ts` already imports `Creature` from `./types`; `CombatState` comes from
   the same file, type-only. Its runtime imports (`effective-stats`, `effects`, `tie-break`) don't
   reach `actions`, `resolution` or `combat`, so no cycle.
2. **Confirm.** No test and no doc cites `livingIdsOf`, and deleting it makes `tsc` find every
   site. The grep proof shows the helper feeds no random pool.
3. **Confirm.** `apply-status` takes a full `ResponseTarget` (`triggering-source`, `all-allies`,
   `selector`), and `golden-damage-observed-lethal` already declares a fixture Speed stat modifier.
4. **Correct.** The path exists: `revive` with `random-dead-ally`, the Unicorn's shape on
   `on-attack`. Golden 7b: a creature killed in round 1 (so absent from round 2's queue) is revived
   during round 2 by an ally's `on-attack` revive, then fires in its live place in a later pass of
   round 2 (`on-round-end`). The fallback (dies and revives within one round) would not test the
   claim: that creature is in the frozen queue, so the `state.turnQueue` mutant still fires it. If
   the real path can't be built, drop 7b and say so: goldens 6 and 7a already kill that mutant.
   Derive the revive pick's draw if a one-member pool consumes one.
5. **Confirm.** `stacks: false` is a plain field on any trigger; `golden-echo-chain-truncated` and
   `golden-echo-provoke-redirects` already declare fixture ones. A fixture trigger on
   `on-action-observed` with `relationship: 'any'`, `chancePercent` and `stacks: false`, carried by
   a fast enemy and a slow player observing one action. The seed makes the single roll succeed, as
   the plan says: with a failed roll neither carrier fires and the golden shows nothing.
6. **Confirm.** Precedent: `death-observed.test.ts` is a cross-site test file with no module of its
   name.
7. **Confirm.** The kickoff probe did exactly that in a scratch clone. Nothing scratch goes into
   `src/` or the mailbox; only the classified table goes to `evidence/`
   (`WORKFLOWS.md#what-a-mailbox-keeps`).
8. **Confirm.** The simulator is deterministic (`CONVENTIONS.md#balance-simulator`). "Before" runs
   on this branch's start: `main` plus the kickoff and plan commits, no code change.
9. **Confirm**, with fix 9's list for the spec side.

### Mechanism coverage and golden policy

With fixes 1 to 5, every site the kickoff names (the nine hook calls and the Web roll) fails a
named test when put back on side → slot → id, the `state.turnQueue` mutant fails goldens 6 and 7,
and the out-of-slot party array is pinned in `turn-order.test.ts`
(`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`). The golden policy
matches the kickoff: every old golden and unit test byte-identical (comment edits aside), one
corpus regeneration matching the probe's 97 fights and fight 185, seven new hand-derived goldens
through the shared runner.

### Decide-points

1. **Approve with this hand-out, or run another plan round?** Recommendation: approve. The fixes
   sharpen two golden designs, drop one test that can't fail, specify the reversal patch and fix a
   path and a list; none changes scope, the helper or the golden policy. Approved, the build reads
   `plan.md` plus this round's hand-out, and the hand-out wins where they disagree. A second round
   would re-review the same plan with these folded in, for little new information.

### Decisions

1. Approved with this round's hand-out (`phases/4.5/B2/plan-handout-r1.md`); no second plan
   round. The build reads `plan.md` and the hand-out; where they disagree, the hand-out wins.

### Docs edited

None: no decision this round changes a living doc.
