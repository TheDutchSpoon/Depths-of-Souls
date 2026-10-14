# Plan hand-out, round 1 — 4.5-D

**Verdict: changes needed.** Fold the items below into `plan.md`, each replacing the section it
names, and list what changed at the plan's top; round 2 reviews that plan. Re-read `kickoff.md`'s golden policy (the two tick-fizzle goldens), its stale-text trap and
"The PR must prove" (each deleted golden), and `brief.md`'s golden-policy line: all were edited.

1. **One `effectiveMaxHp`** (`effective-stats.ts`, A1). `effectiveMaxHp(creature)`
   (`Math.floor(getEffectiveStat(creature, 'health'))`) is defined once, in `effective-stats.ts`.
   `effects.ts` re-exports it, so `combat.ts`, `resolution.ts` and `targeting.ts` keep their
   imports (`effects.ts` already imports `effective-stats.ts`: no cycle). `hpPercentSatisfied` and
   `compareHpPercent` call it. No private `flooredMaxHp`. `hpPercentSatisfied`'s doc comment points
   at the one definition instead of saying the value is "computed HERE".
2. **One picker** (`tie-break.ts`, A2). `pickExtremumBy(pool, order, direction)` sorts a copy by
   `order` (negated for `'desc'`), falling back to `compareBySideSlotId`, and returns the first.
   `pickExtremum(pool, keyOf, direction)` is `pickExtremumBy(pool, (a, b) => keyOf(a) - keyOf(b),
   direction)`. `compareByKey` and `tie-break.test.ts` are unchanged; every selector golden stays
   byte-identical. `conditions.ts` calls `pickExtremumBy(pool, compareHpPercent, …)`.
3. **`DamageChannel` lives in `effect-types.ts`** (A4). The type and its doc comment are declared
   there; `resolution-types.ts` imports it from `effect-types.ts`, and `resolution.ts`'s re-export
   names it from there. `effect-types.ts` imports nothing new.
4. **No new fixture file** (A6, "New test fixtures"). There is no `__fixtures__/retaliators.ts`, no
   `INDIRECT_STRIKER` and no Madness Touch fixture. `__fixtures__/traits.ts`, `FIXTURE_TRAITS` and
   `traits.test.ts` stay byte-identical. Test 2's variants (`RETALIATE`'s shape with
   `damageChannel: 'direct'` and with `'indirect'`, the chance variant, the two-effect `stacks`
   trait, the one-effect damage spell) are local to `damage-channel.test.ts`. The existing
   `RETALIATE` is the trigger without the field.
5. **Two goldens are deleted** (Golden policy). `golden-hollowkin-wretch-self-dot` and
   `golden-status-snapshot-tick-no-retaliation`, fixture and test files both. `evidence/` names,
   for each mutant they killed, the test that kills it now: "a tick offers its applier as the
   source" → test 2's tick row; "`triggering-source` resolves to the firing creature" → test 2's
   cost row (a tick offers no source, so a tick never reaches that guard). Each mutant is applied
   in the scratch clone and the named test is shown failing. `golden-status-snapshot-tick-kill-on-death`'s
   header cites test 2's tick row as the first tick site instead of the deleted golden. The test
   count shows the two golden files gone.
6. **Test 2's indirect hit** (Test 2, the indirect-response row). `A` carries `RETALIATE` and
   waits; `B` carries the row's variant and attacks `A`; `A`'s answer is the indirect hit on `B`.
   The `'direct'` variant skips it. The variant without the field, and the `'indirect'` one,
   answer it; `A`'s `RETALIATE`, still unwinding, is then held by the self-re-entry guard. `B`
   takes exactly that one hit. The tick and cost rows have no attack in them.
7. **Test 2's tick and cost rows assert the exact event slice** from the `DamageDealt` on
   (`toEqual`), for every variant.
8. **Test 2's `stacks: false` case** (Test 2). One trait on `B` with two `on-damage-taken`
   effects, both `stacks: false`: the first `damageChannel: 'direct'`, the second `'indirect'`.
   `A`'s `RETALIATE` answer hits `B`: the first is skipped and the second answers. (Two carriers
   can't test it: `on-damage-taken` fires for one creature per call, and a claim is keyed by
   `sourceTraitId` within that call.) The chance case uses the same indirect source.
9. **Test 2's Sleep case is a tick only.** A Poison tick from a living applier wakes a sleeping
   bearer: `TriggerFired` `'sleep'`, then `StatusExpired`. No indirect-hit Sleep case.
10. **Test 3 is all real content** (Test 3, A8). `P` (player, `always-attack`, large Health)
    carries Snapback, Retaliating Shell and Madness Touch as `innateTraitIds` and Thorns as the real
    perk through `playerEffects`. `A` (enemy, faster than `P`, `always-attack`, large Health)
    carries the real Snapback. `setup` puts Poison from living `A` on `P`. `TURN_STEPS = 2`:
    - `A` attacks `P`: the four answer (three hits and Confusion on `A`); `A`'s Snapback skips
      each of the three answering hits;
    - `P` attacks `A`: `A`'s Snapback answers with an indirect hit on `P`; `P`'s four skip it;
    - `P`'s turn end: the Poison tick; `P`'s four skip it.
    The header lists every RNG draw in the window (none expected) and derives every number by hand;
    it is a content golden, re-derived on a tuning change.
11. **No HP% tie-pair case** (Test 1). The unit tests are the `highest` and `lowest` pairs whose
    current-HP and HP% orders disagree; there is no tie case.
12. **The data test asserts containment** (Test 5, A12): the collected set contains the four
    retaliators, and Sleep's trigger carries no field. It does not assert the set equals the four.
13. **The staged builds** (A9, "Corpus, balance, evidence") are each a `git clone` of the branch
    base outside the repo with one change applied, not a copy of the working tree.
