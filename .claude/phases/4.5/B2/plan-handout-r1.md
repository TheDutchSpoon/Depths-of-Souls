# Plan hand-out — 4.5-B2, round 1

**Verdict: approved.** Build `plan.md` with the items below; where they disagree, this hand-out
wins. No kickoff or living-doc line was edited this round.

1. **Golden 3 (`golden-pass-order-speed-change`; amends "New goldens" 3).** Three observers on one
   call: A fastest, then B, then C slowest. A's response raises C's Speed above B's. That call fires
   A, B, C; the next call fires C before B. The header names the mutant it kills: re-reading the
   order during the pass.
2. **Golden 7a (`golden-pass-order-live`; amends "New goldens" 7a).** The player creature is faster
   at round start, so the round-start queue and side → slot → id are both player, enemy. During
   the round the enemy's Speed is raised above the player's, so the `on-round-end` pass fires
   enemy, player. The header names both mutants it kills: the helper reading `state.turnQueue`, and
   the `on-round-end` site put back on side → slot → id.
3. **Golden 7b (amends "New goldens" 7b and ASSUMPTION 4).** A creature killed in round 1, so
   absent from round 2's queue, is revived during round 2 by an ally's fixture trigger on
   `on-attack` with response `{ kind: 'revive', target: { kind: 'random-dead-ally' }, pct }` (the
   Unicorn's shape), and fires in its live place in round 2's `on-round-end` pass. Derive the
   revive pick's draw if a one-member pool consumes one. No fallback to a creature that dies and
   revives within one round: it stays in the frozen queue, so the `state.turnQueue` mutant would
   still fire it. If this path can't be built, drop 7b and say so in the report; goldens 6 and 7a
   carry the `state.turnQueue` mutant.
4. **Golden 2 (`golden-pass-order-poles`; amends "New goldens" 2).** The act-last bearer carries a
   fixture status with a `turn-order` effect, `position: 'last'` and no `breakChancePercent`, so no
   cleanup draws a break-free roll and the golden pins only the poles.
5. **Web roll order (amends "Mechanism → test", "Other mechanisms").** No unit test for "the Web
   roll's order is taken once at cleanup start": a roll that breaks free changes only the bearer
   that just rolled, so re-reading the order gives the same sequence and the test can't fail. It is
   held by construction: one `const bearerIds = turnOrderIdsOf(state)` before the loop, shown in
   the one-helper grep, listed beside "Speed/pole read once per creature".
6. **Reversal proof (amends "PR proofs", order alone).** The reversal patch reproduces `main`'s two
   orders: the helper body returns party-array order
   (`[...playerParty, ...enemyParty].filter((c) => c.alive).map((c) => c.id)`), and
   `rollWebBreakFree` sorts the helper's list by `compareBySideSlotId`. With it applied, every
   golden passes and the corpus digest equals `main`'s committed fixture. The patch, as a diff, and
   that run's result go in `phases/4.5/B2/evidence/reversal.md`; the patch is reverted and never
   committed to `src/`.
7. **One-helper grep (amends "PR proofs", one helper).** The grep also shows, for each of the nine
   hook calls, `turnOrderIdsOf(<state>)` inline as `fireHook`'s second argument, its result neither
   filtered nor mapped except by `fireDeathObservers`' by-id filter, and the Web roll's single
   `const bearerIds = turnOrderIdsOf(state)` before its loop.
8. **Paths (amends "PR proofs" and every evidence path).** The slice folder is
   `.claude/phases/4.5/B2/` (capital `B`), as git tracks it. Every path the plan, report and
   evidence write or cite uses `B2`.
9. **Spec questions (amends "Report items to carry").** The report lists as stale:
   `spec/effects.md#hook-execution` (global points "in the standard tie-break order"),
   `spec/effects.md#damage-observation` (the `on-death-observed` pass "in the standard tie-break
   order"), `spec/effects.md#action-reactions-actor-self-hooks-or-observation`,
   `spec/effects.md#stacks-false` (which carrier gets the chance), `spec/combat.md#turn-queue` (the
   ordering is shared and also read per pass) and `spec/statuses.md#turn-order` (the Web roll "over
   living bearers in side → slot → id order"), plus anything the stale-text grep finds.
   `spec/scripting.md#target-selectors-in-the-engine` is the extremum tie-break, which stays.

ASSUMPTIONS 1–3 and 5–9 stand as the plan wrote them; ASSUMPTION 4 is item 3 above.
