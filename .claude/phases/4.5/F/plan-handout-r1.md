# Plan hand-out — 4.5-F, round 1

**Verdict: approved.** Build `plan.md` with the items below; where they disagree, this hand-out
wins. Re-read `kickoff.md`'s Scope ("The per-fight record") and its golden policy ("Store tests
that change"): both now name the record's result and the `splitFights` deletion.

1. **The innate-spell creature is the Sorcerer starter (amends tests 2 and 4 and ASSUMPTION 8).**
   The Unicorn has no innate spell (its trait is one `on-attack` revive). In tests 2 and 4 the
   party is HERO plus the real `SORCERER_STARTER` (its `SORCERER_STARTER_TRAIT` holds Arcane Bolt
   as an `innate-spell` effect): add it to `standaloneCreatures`, and place it in the collection
   and the active party with a hand-built `Instance` (level 1, the test's XP, `scriptId:
   'always-attack'`, empty gems, so no gem roll runs). The default trait and spell registries
   already hold its trait and Arcane Bolt. Test 2's arithmetic is unchanged. Test 4 asserts the
   party holds a creature with an innate spell. The fixture `attack ×2` perk stands: a dropped
   perk changes every player `DamageDealt`'s `rawDamage`. The "parties from `combat.playerParty`"
   variant fails at `createCombat`'s guard against creatures that already carry fight-setup
   output; the report says so.
2. **The record list is `FloorOutcome.fightRecords` (amends ASSUMPTION 1 and "The record").**
   The type is `FightRecord`, with the plan's fields, `result` included. `runProbe` returns
   `{ cleared, events, fightRecords }`; `analyzeFights` takes the records; the probe-run case's
   roster assertions read `fightRecords`. The name `fights` keeps its existing meanings (the
   generated floor in `descend`, the `FightMetrics[]` in the simulator).
3. **`partyLevelsAfter` reads instance ids from the materializer (amends "The record" and
   "`descend`").** `resolvePlayerParty` returns, beside the creatures, the `InstanceId` of each one
   in the same order. `partyLevelsAfter[i]` is the level of the `i`-th id in the fight's updated
   collection. No cast of `origin.ref`.
4. **Test 7 pins floor 2 per fight (amends test 7).** At the file's seed, assert every floor-2
   record's levels going in and its `partyLevelsAfter`, each the value the run gives (expected
   `[2, 2]`). The comment's checkpoint: level 3 needs `xpForNextLevel(2)` = 20 × 2² = 80 at the
   default curve, above floor 2's printed XP total.
5. **`splitFights` is deleted (amends ASSUMPTION 7, "The simulator" and test row 8).** Delete
   `splitFights` from `state/balance-sim.ts`, its import in `state/balance-sim.test.ts`, and the
   test "splits fights at FightStarted". That test is the one further existing test that changes;
   the test-count reconciliation lists it.
6. **ASSUMPTION 12 (new):** a second `runScriptedIntro` call grants the intro's XP again. Calling
   it once, right after `setSpec`, is the caller's job (`spec/run.md#scripted-intro`); no guard,
   no test.
