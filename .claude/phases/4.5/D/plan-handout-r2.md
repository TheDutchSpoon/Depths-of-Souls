# Plan hand-out, round 2 — 4.5-D

**Verdict: approved.** Build `plan.md` with the four items below; where they disagree with
`plan.md`, this hand-out wins. No kickoff, brief or living-doc line was edited this round.

1. **The two tick-fizzle goldens are deleted at the step** (Golden policy; "Report items", **To
   delete**). Once the retaliation change is in, run the full suite and record in `evidence/` that
   exactly `golden-hollowkin-wretch-self-dot` and `golden-status-snapshot-tick-no-retaliation`
   fail, each diff being only the fizzled retaliator `TriggerFired`s (Madness Touch in the first;
   Snapback and Madness Touch in the second, Sleep's wake unchanged), as
   `phases/4.5/D/evidence/kickoff-probe.md#full-suite-under-all` found. Then stop and ask Duncan to
   delete their four files (fixture and test each), and continue once he has. The report says they
   were deleted at the step; **To delete** lists only the scratch clones.
2. **The deleted goldens' evidence names every rule they pinned** (Golden policy, the `evidence/`
   bullet). For each, the test that fails with it removed now, shown by applying the mutant in a
   scratch clone:
   - a tick offers its applier as the source → test 2's tick row;
   - `triggering-source` resolves to the firing creature → test 2's cost row;
   - `on-damage-taken` is skipped on a tick → test 2's tick row (the no-field and `'indirect'`
     variants' `TriggerFired`) and the Sleep tick case;
   - the self-applied Poison tick's arithmetic and its minimum-1 floor → the existing golden that
     fails with each removed, found by applying the mutant.
3. **Test 2's own-cost row runs through a real trigger** (Test 2, the own-cost row; A6). Not a
   direct `executeResponse` call. A trait local to `damage-channel.test.ts` on `B`:
   `on-turn-start` → `deal-damage` at `self` with a `flatAmount`, fired by `resolveTurn` on `B`'s
   turn. That route runs the response with `channel: 'indirect'`, so the self-damage is a cost
   (`applyCostDamage`), not a hit. The header derives the cost's exact magnitude (no Defence), and
   the row asserts the exact event slice from its `DamageDealt` on, for every variant.
4. **Test 5 reads Sleep from the collector's output** (Test 5, A8). Besides containing the four
   retaliators, the collector's unfiltered `on-damage-taken` set holds Sleep's wake-up trigger (found
   by its `statusId`), and that trigger carries no `damageChannel`. Not asserted on `SLEEP` directly:
   that passes with a collector that never reads `STATUS_REGISTRY`.
