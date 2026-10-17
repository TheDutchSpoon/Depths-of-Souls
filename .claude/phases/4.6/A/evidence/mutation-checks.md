# Mutation checks, 4.6-A

Each row deletes or reverts ONE mechanism in a scratch edit (the file restored byte-for-byte after
the run) and runs the named test files. "Red" is the number of tests that fail with the mutation;
no mutation survived. The mutation specs were a throwaway script, not kept.

| Mechanism removed or reverted | Red | Test files | First red test |
| --- | --- | --- | --- |
| unknown scriptId: validateScriptIds call removed | 3 | create-combat-input.test.ts | createCombat: scriptId throws on a scriptId missing from the script registry |
| freshness: alive unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with alive: false |
| freshness: defending unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with defending |
| freshness: provoking unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with provoking |
| freshness: defendCount unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with a non-zero defendCount |
| freshness: baselineEffects unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with non-empty baselineEffects |
| freshness: activeEffects unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with non-empty activeEffects |
| slots: out-of-range check removed | 5 | create-combat-input.test.ts | createCombat: slots throws on slot -1, outside 0..5 |
| slots: duplicate check removed | 2 | create-combat-input.test.ts | createCombat: slots throws on two creatures with one slot on a side |
| slots: out-of-order check removed | 2 | create-combat-input.test.ts | createCombat: slots throws on a party array not in slot order |
| slots: enemy side not checked | 1 | create-combat-input.test.ts | createCombat: slots runs the same checks on the enemy side |
| ids: validateUniqueIds call removed | 2 | create-combat-input.test.ts | createCombat: ids throws on one id on both sides |
| side effects: player.effects not validated | 9 | create-combat-input.test.ts, load-time-checks.test.ts | createCombat: side effects are validated throws on a bad player side effect |
| side effects: enemy.effects not validated | 9 | create-combat-input.test.ts, load-time-checks.test.ts | createCombat: side effects are validated throws on a bad enemy side effect |
| carrier: validateTrait does not call validateEffectList | 16 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 trait taken-reduction: no cap throws |
| carrier: validateStatusDef does not call validateEffectList | 17 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 status taken-reduction: no cap throws |
| carrier: validateSpecialization does not call validateEffectList (perk, all levels) | 9 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 perk taken-reduction: no cap throws |
| carrier: createCombat does not validate its trait registry | 8 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 trait in the createCombat registry taken-reduction: no cap throws |
| carrier: createCombat does not validate its status registry | 8 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 status in the createCombat registry taken-reduction: no cap throws |
| check: additive-cap check removed from validateEffectList | 43 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 trait taken-reduction: no cap throws |
| check: emitTriggerFired check removed from validateEffectList | 15 | load-time-checks.test.ts | emitTriggerFired: false is legal only on a status tick trait a deal-damage trigger with the flag off throws |
| check: additive cap accepts 1 (cap < 1 becomes cap <= 1) | 14 | load-time-checks.test.ts | additive taken-pool reduction needs a reductionCap below 1 trait taken-reduction: a cap of 1 throws |
| check: perk sweep stops at level 1 | 1 | load-time-checks.test.ts | a perk is validated at every level it can be bought at throws at import when a level above 1 is bad |
| resolver: takenFactorFor falls back to an uncapped reduction | 1 | effects.test.ts | gatherDealtMods / gatherTakenFactors accumulation: 'additive' (real Bulwark shape) throws a resolver-invariant error on an additive source with no reductionCap (a hand-built state past the load-time check) |
| floor: effectiveMaxHp has no floor | 6 | effective-stats.test.ts, resolution.test.ts | effectiveMaxHp never drops below 1 floors a Health modifier of x0 at 1, while the raw stat stays 0 |
| floor: revive has no floor | 1 | resolution.test.ts | revive response restores at least 1 HP a pct that rounds to 0 (0.01 of 20) revives at 1 HP |
| zero count: apply-stat-modifier guard removed | 2 | resolution.test.ts | apply-stat-modifier magnitudeSource (Swarmhive Striker-shaped: freeze-at-application) a zero count is a no-op: TriggerFired stays, nothing follows no dead ally: TriggerFired, no StatModifierApplied, the stat unchanged |
| web roll: removal filters the stale snapshot again | 1 | combat.test.ts | Web break-free two break-free statuses on one bearer both breaking in one cleanup are both gone, and draw exactly twice |
| web roll: re-reads the effect list each iteration (draw-count / order change) | 1 | combat.test.ts | Web break-free two break-free statuses on one bearer both breaking in one cleanup are both gone, and draw exactly twice |
| on-action-observed: actor lookup moved back inside the filter branch (unfiltered fires) | 2 | resolution.test.ts | on-action-observed filter (general action-observation system) fails closed on an actor that cannot be found an unfiltered observer stays silent |
| on-action-observed: fail-closed removed (filtered one fires too) | 3 | resolution.test.ts | on-action-observed filter (general action-observation system) fails closed on an actor that cannot be found a filtered observer stays silent |
| stacks: claim keyed on sourceTraitId | 3 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition two stacks:false triggers in one trait are two claims: both fire |
| stacks: claim keyed on the instance id (per carrier) | 5 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition one trait trigger carried by two creatures on opposite sides is one claim: the first in turn order fires, the second never rolls |
| stacks: trait key counts the entry ordinal instead of the trigger position | 1 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition a creature carrying one trait twice makes one claim |
| stacks: status key drops the trigger position | 1 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition two stacks:false triggers in one status are two claims: both fire |
| stacks: trait key drops the carrier kind | 2 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition a trait id equal to a status id does not share a claim: both fire |
| stacks: claimKey dropped when a baseline entry is re-instantiated (revive) | 9 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition two stacks:false triggers in one trait are two claims: both fire |
| stacks: a missing claimKey falls back to sourceTraitId instead of throwing | 1 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition a stacks:false effect with no claimKey is a resolver-invariant error |
| stacks: side-effect keys not stamped (sideEffects entries) | 2 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition a side-effect trigger carried by two party members is one claim |
| stacks: claim moved above the condition check | 2 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition a stacks:false effect with no claimKey is a resolver-invariant error |
| stacks: claim moved above the observation filter | 3 | stacks-false-claims.test.ts | stacks: false claims are per trigger definition a stacks:false effect with no claimKey is a resolver-invariant error |
| deep-freeze: no lock installed on Map/Set | 7 | test-utils/deep-freeze.test.ts | deepFreeze: Map makes set, delete and clear throw |
| deep-freeze: a pre-frozen Map/Set is skipped silently | 1 | test-utils/deep-freeze.test.ts | deepFreeze: a collection frozen without the lock throws instead of skipping it, since its writes can no longer be locked |
| freshness: revivesUsed unchecked | 2 | create-combat-input.test.ts | createCombat: freshness throws on a creature with a non-zero revivesUsed |
