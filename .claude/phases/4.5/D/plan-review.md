# Plan review — 4.5-D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

## Round 1

**Verdict:** changes needed; a second plan round folds this round's hand-out (`plan-handout-r1.md`)
into `plan.md`. None of the fixes changes the scope, the three mechanisms' design or anything in
the brief. The golden policy changes by Duncan's call (decision 1): the two tick-fizzle goldens
are deleted, not moved.

Checked against `kickoff.md`, `brief.md`, `phases/4.5/brief.md#hp-qualifiers-pick-by-hp`,
`phases/4.5/brief.md#retaliation-answers-only-attacks-and-spells`,
`phases/4.5/brief.md#last-stand-never-rolls-at-1-hp`, the living docs and the code on the branch
(`3774cfa`). The channel plumbing the plan describes is complete: `on-damage-taken` is fired from
one place (`applyDamageAndEmit`), which has three callers (`dealDamageCore`, `applyTickDamage`,
`applyCostDamage`), and every `dealDamageCore` caller already receives its channel from the branch
that chose it (`executeAttack` and the spell loop pass `'direct'`, `fireHook` `'indirect'`, the flat
branch `'indirect'`). A spell can't carry a flat `deal-damage` (`validateSpellEffects`), so "direct"
and "an attack or a spell" are the same set in content. The phase brief's Assumptions checklist has
no D item, and the plan changes nothing the brief decided.

### Plan fixes

1. **The `stacks: false` placement case can't be built as written** (test 2). `on-damage-taken`
   fires for one creature per call (`fireHook('on-damage-taken', [target.id], …)`), and a claim is
   keyed by `sourceTraitId` within that call: two carriers on different creatures never share a
   claim, and two different traits never collide. The case: one trait with two `on-damage-taken`
   effects, both `stacks: false`, the first `damageChannel: 'direct'`, the second `'indirect'`. An
   indirect hit: the first is skipped, the second answers. With the skip after the claim, the first
   claims the slot and the second is blocked, so nothing answers.
2. **Test 2's indirect hit comes from `RETALIATE`, not a new striker.** `A` carries `RETALIATE`
   (the existing fixture, no field) and waits; `B` carries the row's variant and attacks `A`.
   `A`'s answer is the indirect hit on `B`. A `'direct'` variant skips it; a variant without the
   field, or with `'indirect'`, answers it, and `A`'s `RETALIATE`, still unwinding, is held by the
   self-re-entry guard, so the chain ends there. `B`'s own attack damages `A`, not `B`, so `B`
   takes exactly one hit. The chance and `stacks` cases use the same source. Each other row has
   only its own damage: in the tick and cost rows nobody attacks.
3. **Test 2's tick and cost rows assert the exact event slice** from the `DamageDealt` on
   (`toEqual`), not only the presence of a `TriggerFired`. With the two old goldens deleted
   (decision 1) these rows are what pin the tick and cost fizzle, so they carry a golden's
   strength over that span.
4. **The Sleep case is a tick only.** A Poison tick from a living applier wakes a sleeping bearer:
   `TriggerFired` `'sleep'`, then `StatusExpired`, the third thing the deleted no-retaliation
   golden pinned. The indirect-hit Sleep case is dropped: the without-the-field row shows a
   trigger without the field fires on an indirect hit, and test 5 asserts Sleep carries no field.
5. **Drop the HP% tie-pair unit case.** Two creatures with equal HP% give the same answer under any
   pick, the current-HP pick included, so the case can't fail with the mechanism removed. The
   tie-break stays for determinism, unpinned (kickoff trap 2).
6. **Test 3 is all real content.** `P` (player, `always-attack`, large Health) carries the four
   real retaliators: Snapback, Retaliating Shell and Madness Touch as `innateTraitIds`, Thorns as
   the real perk through `playerEffects`. `A` (enemy, faster, `always-attack`, large Health)
   carries the real Snapback; Poison from living `A` is on `P` from `setup`. `TURN_STEPS = 2`:
   - `A` attacks `P`: the four answer (three hits and Confusion on `A`); `A`'s Snapback skips each
     of the three answering hits, so two retaliators don't answer each other;
   - `P` attacks `A`: `A`'s Snapback answers, an indirect hit on `P`; `P`'s four skip it;
   - `P`'s turn end: the Poison tick; `P`'s four skip it.
   The header lists every RNG draw in the window (none expected: each side has one target, `A`
   acts before Madness Touch confuses it, no retaliator rolls a chance) and derives every number
   by hand. Each retaliator's `effectId` shows in the log, so dropping any one field shows that
   retaliator answering the indirect hit and firing on the tick.
7. **One `effectiveMaxHp`** (A1, corrected below).
8. **One picker** (A2, corrected below).
9. **`DamageChannel` is declared in `effect-types.ts`** (A4, corrected below).
10. **The data test asserts containment** (A12, corrected below).
11. **The two tick-fizzle goldens are deleted** (decision 1): `golden-hollowkin-wretch-self-dot`
    and `golden-status-snapshot-tick-no-retaliation`, fixture and test files both. The mechanism
    evidence names, for each mutant they killed, the test that kills it now: "a tick offers its
    applier as the source", test 2's tick row; "`triggering-source` resolves to the firing
    creature", test 2's cost row (a tick offers no source, so a tick never reached that guard).
    `golden-status-snapshot-tick-kill-on-death`'s header cites the no-retaliation golden as the
    first tick site; it cites test 2's tick row instead. The test count shows −2 golden files.
12. **No new shared fixture** (decision 2). `__fixtures__/traits.ts`, `FIXTURE_TRAITS` and
    `traits.test.ts` stay byte-identical. Test 2's variants (`RETALIATE` with `'direct'` and with
    `'indirect'`, the chance variant, the two-effect `stacks` trait, the one-effect damage spell)
    are local to `damage-channel.test.ts`, as `resolution.test.ts` keeps its own Last Stand
    fixture. No `__fixtures__/retaliators.ts`, no `INDIRECT_STRIKER`, no Madness Touch fixture.
13. **The staged builds clone, as the probe did** (A9). Each throwaway build is a `git clone` of the
    branch base with one change applied, outside the repo, not a copy of the working tree (which
    carries `node_modules`, `dist` and untracked files).

### Assumptions

- **A1 — correct.** The cycle the plan worries about doesn't exist: `effects.ts` already imports
  `getEffectiveStat` from `effective-stats.ts`. The plan's private `flooredMaxHp` would be the
  second copy of `Math.floor(getEffectiveStat(c, 'health'))` (the first is `effects.ts`'s
  `effectiveMaxHp`, which `hpPercentSatisfied`'s doc comment names as the value it must match).
  End state: `effectiveMaxHp` is defined once, in `effective-stats.ts`; `effects.ts` re-exports it,
  so `combat.ts`, `resolution.ts` and `targeting.ts` keep their imports; `hpPercentSatisfied` and
  `compareHpPercent` call it. `hpPercentSatisfied`'s doc comment loses "computed HERE" and points at
  the one definition. Behaviour identical; `effects.test.ts` still pins it.
- **A2 — correct.** One sort-and-tie-break site, not two. `tie-break.ts` gains the order-based picker
  (`pickExtremumBy(pool, order, direction)`, `'desc'` negating `order`, falling back to
  `compareBySideSlotId`), and `pickExtremum` becomes `pickExtremumBy(pool, (a, b) => keyOf(a) -
  keyOf(b), direction)`. That is the same comparison `compareByKey` makes (`keyB - keyA` for
  `'desc'`), so every selector golden stays byte-identical, and the selector goldens are what prove
  it. `compareByKey` and `tie-break.test.ts` stay as they are. The plan's reason for a sibling ("the
  numeric-key path untouched") protects the text, not the behaviour; the goldens protect the
  behaviour. If Duncan prefers the sibling, it costs a second copy of the tie-break fallback.
- **A3 — confirm.** Fail closed matches the observation hooks; the one call site always passes
  `incomingChannel`.
- **A4 — correct.** `tsc -b` accepts a type-only cycle, so "whichever `tsc -b` accepts" lands on
  the cycle, and `resolution-types.ts`'s header states it is a leaf with no cycle in either
  direction. End state: `DamageChannel` and its doc comment are declared in `effect-types.ts` (it is
  now a data field's type); `resolution-types.ts` imports it from there (it already imports
  `EffectInstanceId` from that file), and `resolution.ts`'s re-export names it from `effect-types`.
  No file in `effect-types.ts`'s imports changes.
- **A5 — confirm.** The channel interacts with `condition` and `chancePercent` only through
  the skip's placement, which test 2 pins.
- **A6 — correct** (decision 2): no new fixture file; fix 12.
- **A7 — confirm.** `CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`: a fixture-local copy
  of rule 1 holds the threshold. The real `warden`/`support` picks are covered by their
  byte-identical goldens and the six corpus fights.
- **A8 — confirm, with fix 6.** All four on one bearer is right; the indirect hit now comes from
  the real Snapback on `A` instead of a fixture striker. No RNG expected: none of the five
  carries `chancePercent`, Confusion redirects only an action's offensive target (`targeting.ts`),
  never a response, and `A` acts before Madness Touch lands. The header says it is a content
  golden: re-derived by hand on a tuning change.
- **A9 — confirm**, with fix 13.
- **A10 — confirm.** Kickoff test 2 isn't named as a golden; driving real routes is what makes the
  `effectsForHook` and placement mutants visible.
- **A11 — confirm.** The existing helper rigs `rng.position`; a 100% fixture makes the
  draw-or-no-draw visible in the position alone.
- **A12 — correct.** Assert the collected set **contains** the four retaliators (and that Sleep's
  trigger carries no field), not that it **equals** them. Containment already makes the test
  non-vacuous and proves the collector reached all three carrier kinds (Thorns is a perk, the
  other three are traits, Sleep is a status). An exact set fails the next correctly authored
  retaliator for no reason.

### Mechanism coverage and golden policy

With fixes 1 to 6, every mutant the kickoff lists fails a named test: the current-HP pick (test 1's
golden and the `highest` unit case), ignoring `damageChannel` (tests 2 and 3), every `hit` as direct
(test 2's indirect-response row and the two-direct case), the field left out of `effectsForHook`
(test 2, built through real creatures), the validator rule removed at any of the three carriers
(test 4, one case each), a field dropped from any retaliator (test 5, which names it), no 1-HP gate
and a gate on post-hit HP (test 6). The channel has one skip site and is carried from three
callers; the attack, spell, response, tick and cost rows cover each route
(`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`). The golden policy
matches the kickoff as edited by decision 1: one corpus regeneration against the probe's 49
fights, the two listed goldens deleted with their mutants re-pinned in test 2, everything else
byte-identical, `traits.test.ts` included.

### Decide-points

1. **The two tick-fizzle goldens: move or delete?** The kickoff moves them to fixture retaliators
   without the field. Duncan asked why keep them. Recommendation, changed from the kickoff's:
   delete them. Test 2's rows without the field are the same rule on the same kind of fixture:
   the tick row is the no-retaliation golden's subject, and the Sleep tick case its third pin.
   The self-dot golden's title claims "`triggering-source` never resolves to the firing creature",
   but a tick offers no source at all, so that guard is never reached through a tick; it is
   reached through a cost, which test 2's cost row covers. The self-applied tick arithmetic is
   `golden-status-snapshot-tick-self-applied`'s. What a deletion would lose, the whole-log
   strength, is kept by fix 3. The kickoff chose moving because it disturbs least, which is not a
   reason to keep a duplicate.
2. **Where new fixture traits live (A6).** The plan adds `__fixtures__/retaliators.ts` to keep
   `traits.test.ts` ("exactly the nine") byte-identical; this review first recommended putting the
   shared ones into `traits.ts`. With decision 1 the Madness Touch fixture is gone, and Duncan
   asked whether `INDIRECT_STRIKER` could go too. Recommendation, changed: no new shared fixture.
   An indirect hit from another creature is what any retaliator's answer is (every trait, status
   or perk response runs `'indirect'` through `fireHook`), so `RETALIATE` supplies it in test 2 and
   the real Snapback in test 3 (fix 6). Test 2 still needs fixtures: a trigger without the field,
   or with `'indirect'`, exists in no game data (test 5 forbids it for a retaliator), so only a
   fixture can show what the engine does with one; and its `'direct'` variant stays a fixture so
   a mechanism test never moves with Snapback's tuning or redesign
   (`CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`). Those variants are local to the one
   file that uses them.
3. **Approve with this hand-out, or run another plan round?** Recommendation: a second round,
   changed from "approve". "Approve" was given when the fixes were local tightening. Decisions 1
   and 2 make the hand-out replace whole sections of `plan.md` (the new-fixtures section, the
   moved goldens, test 3's design, test 2's indirect source), so an approved build would reconcile
   two conflicting documents while coding, and a misreading would surface only at the PR, after
   test 3's numbers were derived against the wrong setup. A second round has the coding agent fold
   the hand-out into one coherent plan, checked before any code; the content is settled, so that
   check is cheap.

### Decisions

1. Delete `golden-hollowkin-wretch-self-dot` and `golden-status-snapshot-tick-no-retaliation`; test
   2's tick and cost rows, asserting exact event slices, pin their mutants (fixes 3 and 11).
2. No new shared fixture: `RETALIATE` supplies test 2's indirect hit, the real Snapback test 3's;
   test 2's variants are local to its file (fixes 2, 6 and 12).
3. A second plan round: the coding agent folds `phases/4.5/D/plan-handout-r1.md` into `plan.md`,
   with what changed at its top, and round 2 reviews that, the fold-in included.

### Docs edited

- `phases/4.5/D/kickoff.md`: the golden-policy bullet (the two goldens are deleted, test 2 re-pins
  their mutants), the stale-text trap (the kill-on-death golden's header instead of the moved
  goldens' headers) and "The PR must prove" (each deleted golden's mutants named) — decision 1.
- `phases/4.5/D/brief.md`: the golden-policy line — decision 1.

## Round 2

**Verdict:** approved, with this round's hand-out (`plan-handout-r2.md`). The fold-in of
`plan-handout-r1.md` is complete and faithful: items 1 to 13 each land in the section they name,
and nothing outside them moved. The four fixes below are local: none changes a mechanism, a test's
subject or the golden policy, so no third round.

Checked against `kickoff.md` (as edited in round 1), `brief.md`, the three brief sections, the
living docs and the code on the branch (`9164a98`). Re-verified on the code: `effects.ts` already
imports `effective-stats.ts` and `effective-stats.ts` imports only types, so moving
`effectiveMaxHp` makes no cycle; `pickExtremumBy`'s `'desc'` negation gives the same order as
`compareByKey`'s `keyB - keyA` (IEEE subtraction is sign-symmetric), so the selector goldens hold;
the one `{ kind: 'hit' }` literal is `dealDamageCore`'s; a two-effect trait's effects share one
`sourceTraitId`, so the `stacks: false` case claims one slot as fix 8 of round 1 needs; the
self-re-entry guard is keyed by `instanceId` and skips silently, so the indirect-hit row ends
after one answer.

### Plan fixes

1. **The two deleted goldens fail before they go** (Golden policy, "To delete"; decision pending,
   decide-point 1). The plan lists them under **To delete** for the end, yet its gates run
   `npm run test`, which they fail from the retaliation change on: green gates and the two files
   still present can't both hold. End state: once the retaliation change is in, the agent runs the
   suite, records in `evidence/` that exactly these two fail and that each one's diff is only the
   fizzled retaliator `TriggerFired`s (Madness Touch in the self-dot golden; Snapback and Madness
   Touch in the no-retaliation golden, the Sleep wake unchanged), matching
   `phases/4.5/D/evidence/kickoff-probe.md#full-suite-under-all`; then stops and asks Duncan to
   delete the four files, and continues. The report says they were deleted at the step; **To
   delete** keeps only the scratch clones.
2. **The deleted goldens' evidence covers everything they pinned, not two mutants** (Golden policy).
   The no-retaliation golden also pinned that `on-damage-taken` still fires on a tick (its
   `TriggerFired`s and Sleep's wake). Evidence names, for each, the test that fails with it removed
   now: "a tick offers its applier as the source" → test 2's tick row; "`triggering-source`
   resolves to the firing creature" → test 2's cost row; "`on-damage-taken` skipped on a tick" →
   test 2's tick row (the no-field and `'indirect'` variants' `TriggerFired`) and the Sleep tick
   case. The self-dot golden's self-applied tick and its minimum-1 floor are named against the
   existing golden that fails with each removed, found by applying the mutant, not by reading.
3. **Test 2's cost row runs through a real trigger** (Test 2, the own-cost row; A6). Not a direct
   `executeResponse` call: `executeResponse` reaches `applyCostDamage` only when its `HookContext`
   says `channel: 'indirect'`; a hand-built context with `'direct'` makes the self-hit a `hit`
   origin and the row tests the wrong path. A local trait on `B`, `on-turn-start` → `deal-damage`
   at `self` with a `flatAmount`, fired by `resolveTurn` on `B`'s turn, is the route a real cost
   takes; the header derives the cost's exact magnitude (no Defence), which a `hit` would not give.
4. **Test 5 reads Sleep from the collector, not from `SLEEP`** (Test 5, A8). The containment check
   proves the collector reached traits (the three) and perks (Thorns); Sleep is what proves it read
   statuses. Assert that the collector's unfiltered `on-damage-taken` set holds Sleep's wake-up
   trigger (by `statusId`) and that it carries no field. Asserting on `SLEEP` directly passes with
   a collector that skips `STATUS_REGISTRY`.

### Assumptions

- **A1 — confirm.** Fail closed matches the three observation hooks; the one `on-damage-taken`
  call site always passes `incomingChannel`.
- **A2 — confirm.** `CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`; the real
  `warden`/`support` picks are held by their byte-identical goldens and the six corpus fights.
- **A3 — confirm,** checked on the data: none of the four retaliators carries `chancePercent`;
  Confusion's `friendly-fire` roll is drawn only on its bearer's own harmful action
  (`targeting.ts`), and `A`'s next action falls after the window; each side has one target and no
  provoker, so targeting draws nothing; the Poison tick draws nothing; the only turn-end draw is
  Web's break-free, absent here. The header still lists the draws (none) as the plan says.
- **A4 — confirm.** Outside the repo, listed under **To delete** (fix 1 leaves them as its only
  entries).
- **A5 — confirm.** The validator checks the hook rule only; the field meets `condition` and
  `chancePercent` through the skip's placement, which test 2 pins.
- **A6 — confirm, with fix 3.** Real routes throughout; the cost row now has one too.
- **A7 — confirm.** An optional starting HP on the existing `hit` helper; existing callers
  unchanged.
- **A8 — confirm, with fix 4.** Level 1 matches `validateSpecialization`'s own reading of a
  leveled perk (its shape is level-invariant); containment, not equality.

### Mechanism coverage and golden policy

Unchanged from round 1 and complete in the plan: every mutant the kickoff lists fails a named test,
the channel's skip site and its three carrying routes (`dealDamageCore`'s action and spell
callers, the tick, the cost) each have a row, and the golden policy matches the kickoff: one
corpus regeneration against the probe's 49 fights, the two listed goldens deleted, everything else
byte-identical with `golden-hollowkin-wretch` an explicit stop-and-report if it moves.

### Decide-points

1. **When the two goldens go** (fix 1). Recommendation: at the step, as in
   `phases/4.1/H2b1/report-r1.md` (the agent stops once the retaliation change is in, shows the two
   failing with only the expected `TriggerFired`s gone, you delete them, it continues). The
   alternative, the agent finishing with two red tests and you deleting before CI, means the
   report claims gates it never saw green, and the failures it should have shown are never
   recorded.
2. **Approve with the hand-out, or a third round?** Recommendation: approve. The four fixes are
   tightening inside sections that already exist, the kind round 1 called local; a third round is
   the workflow's signal to pull a slice back into design, and nothing here is a design question.

### Decisions

1. The two goldens are deleted at the step: once the retaliation change is in, the agent records
   that exactly these two fail with only the fizzled retaliator `TriggerFired`s gone, stops, Duncan
   deletes the four files, and the build continues (fix 1).
2. Approved with `plan-handout-r2.md`; no third round.

### Docs edited

None. Both decisions change only how the plan is built; no kickoff, brief or living-doc line moves.
