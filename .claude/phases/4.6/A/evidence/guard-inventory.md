# Guard inventory, 4.6-A step 2

`npm run test` with every guard on (the `createCombat` input checks, `validateEffectList` with the
two new checks, `takenFactorFor`'s throw) and **no test adjusted**. Baseline: 257 files, 2236 tests
(2235 passed, 1 skipped). With the guards: 36 failures in 15 files, listed below against the plan's
step-2 list.

One of the 36 (`combat.test.ts` "createCombat throws when re-fed a creature that already carries
fight-setup output") was a message mismatch of mine: the test matches `/fight-setup output/` and my
first message said "setup or fight output". The message keeps the phrase now, so the test passes
unchanged; it is not a guard throw. That leaves 35 real throws: the plan's 34 and one more (below).

## `CATASTROPHIC_COLLAPSE` in the registry (`emitTriggerFired: false` off a tick), 9 + 1 (35 = 10 + 2 + 13 + 10; the plan's 34 without the +1)

Planned (9): `golden-round-end-interaction`, `golden-conditional-passive`,
`golden-conditional-trigger`, `golden-loop-safety`, `golden-stun`, `golden-triggered-damage`;
`resolution.test.ts` "loop safety > the re-entry guard bounds a mutual-retaliation loop (A↔B)",
"loop safety > truncates deterministically at MAX_TRIGGER_CASCADE_DEPTH", "apply-stat-modifier
re-stacking (unique instance ids)". All present.

**Not in the plan's list (1):** `__fixtures__/traits.test.ts` "the nine mechanism-test fixture
traits > every fixture trait passes the load-time trait validators". Same fixture trait, same flag,
cleared by the same listed change (the flag goes). The kickoff says this test "doesn't pin the
flag"; it validates the trait directly, not through a registry. Reported, not a quiet fix.

## Test-inline statuses with the flag off a tick (2)

`resolution.test.ts` "heal response (Regen) > emits HealApplied clamped …" (`test-regen`);
`status-containers.test.ts` "a status's effects carry no count of their own > deal-damage, flat mode
… is a COST" (`single`).

## Non-fresh creatures (13)

Goldens: `golden-defend-count-additive-cap`, `golden-heal-scaling-count`,
`golden-necromoss-reclaim`.

`resolution.test.ts`: "heal scaling … magnitudeSource (count)"; "revive response" ×3 (revives a dead
ally …, clears defending/provoking …, restores a revived PLAYER creature's perks …);
"all-allies ResponseTarget"; "all-allies-of-species ResponseTarget"; "revive cap excludes a dead
ally at the cap …".

`combat.test.ts`: "taken-reduction passive (real Bulwark shape, as a perk) > mitigation improves
round-over-round …"; "Provoke redirects a single-target attack …"; "turn-start cleanup > skips
cleanup entirely for a creature that dies to its own turn-start hook …".

## Unknown `scriptId` (10)

`combat.test.ts` "action instance-list composition" ×5; `data/species/starters.test.ts` "Sorcerer
starter loadout" ×2 (Arcane Surge's innate spell; the fused creature); `state/store.test.ts`
"runScriptedIntro() adds the Unicorn on a win", "… on a loss too …", "the scripted intro grants XP
> every active-party creature gets the grant …".

## Not triggered by anything

No slot, duplicate-id, `revivesUsed`, additive-cap or perk-level throw, and no `makeCreature`
default-slot collision, fired in the existing suite. The corpus-digest, balance and simulator
suites did not throw.
