// Golden: PR #64 review fix 2's REFRESH path -- the SECOND half of the gate's own AND condition
// (`(creatureId, statusId)` existed at the sweep's own start AND has not been (re)applied earlier
// in this same sweep). `golden-round-end-mid-sweep-poison.fixture.ts` only covers a status BORN
// mid-sweep (absent from the snapshot entirely); this golden covers a status that WAS present in
// the snapshot but gets REFRESHED (re-applied, stacks/duration updated) earlier in the same
// sweep -- it must not tick THIS sweep either, exactly like the newborn case, then ticks normally
// (at its new, refreshed stack count) starting the next round.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). E1 already carries Poison
// at 1 stack before the fight starts (applied via a direct `applyStatus` call, into a throwaway
// events array). ROTCORE (player-side, real `MYCONET_ROTCORE_TRAIT`) also starts already carrying
// Poison and wounded to 1 HP, so its own first tick is lethal. TANK (a second player-side
// creature, so the player side isn't wiped when Rotcore dies) survives the whole fixture. Turn
// order (speed): ROTCORE(20) > TANK(15) > E1(10) in round 1; TANK(15) > E1(10) in rounds 2-3
// (Rotcore excluded, dead).
//
//   Round-1 sweep (bundled into the 4th `resolveTurn` call, alongside round 2's setup and TANK's
//     own round-2 turn): order (tie-break: player -> slot -> id) = ROTCORE, TANK, E1.
//   ROTCORE's Poison tick: flatAmount 3% of its own max HP [100] * 1 stack = 3. ROTCORE 1 - 3 ->
//     clamped to 0 -> dies. CreatureDied(ROTCORE) -> on-death fires Death Bloom ->
//     apply-status(all-enemies, poison) -> E1 already carries 1 Poison stack -> newStacks =
//     min(cap 5, 1 + 1) = 2 -> StatusApplied(E1, poison, 2 stacks, duration 3 [Poison's own
//     defaultDuration, since Death Bloom's own StatusSpec carries no explicit duration], source
//     ROTCORE) -- E1's EXISTING Poison is REFRESHED mid-sweep, not newly born.
//   TANK has no on-round-end effect -> nothing.
//   E1: its own Poison tick candidate exists (it already had Poison, so this isn't the "born
//     mid-sweep" case) -- fix 2's gate checks the SECOND clause: has (E1, poison) been
//     (re)applied earlier in THIS sweep? Yes (the StatusApplied above, from ROTCORE's on-death,
//     already fired earlier in this same pass) -> gate skips it -> no second DamageDealt this
//     sweep, proven by this golden's own event log.
//   decrementAndExpireSnapshot: ROTCORE's own (pre-existing, snapshotted) Poison instance
//     decrements 3 -> 2 (no expiry, no event; ROTCORE is dead but the bookkeeping still applies
//     to its corpse) -- E1's entry IS in `reappliedThisSweep` (refreshed above), so it is SKIPPED
//     here too, per the SAME unification rule that already governed the newborn case (a refresh
//     mid-sweep is treated identically to a birth mid-sweep for decrement purposes) -- E1's
//     duration stays at the fresh 3 just applied, not decremented to 2. Not wiped (TANK survives)
//     -> round 2 begins: queue = [TANK, E1] (ROTCORE excluded) -> RoundStarted{round:2} -> TANK's
//     turn (always-wait) -> Waited.
//
//   Round 2's queue is [TANK, E1] -- BOTH take their own (uneventful, always-wait) turns before
//     the round-2 sweep fires.
//
//   Round-2 sweep (bundled into the 6th `resolveTurn` call, alongside round 3's setup and TANK's
//     own round-3 turn): order = TANK, E1. TANK: nothing. E1's Poison IS now in round 2's OWN
//     start-of-sweep snapshot and has not been reapplied this sweep -> fix 2's gate allows it ->
//     ticks NORMALLY this time, at its NEW refreshed stack count: flatAmount 3% of E1's own max
//     HP [100] * 2 stacks = 6 (2 x 3% x 100 = 6, per the review's own worked number). E1 100 - 6 =
//     94, survives. Not wiped -> round 3 begins: queue = [TANK, E1] -> RoundStarted{round:3} ->
//     TANK's turn -> Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { MYCONET_ROTCORE_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 62 // No RNG consumed anywhere in this fixture; seed is inert.

export const ROTCORE = createCreatureId('myconet-rotcore')
export const TANK = createCreatureId('tank')
export const E1 = createCreatureId('e1')

/** Applied post-createCombat by the test -- see the header comment above. */
export const ROTCORE_STARTING_HP = 1

export const playerParty = makeParty('player', [
  {
    id: 'myconet-rotcore',
    health: 100,
    speed: 20,
    scriptId: 'always-wait',
    innateTraitIds: [MYCONET_ROTCORE_TRAIT.id],
  },
  { id: 'tank', health: 100, speed: 15, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e1', health: 100, speed: 10, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 6 // ROTCORE/TANK/E1's round-1 turns, then the round-1 sweep (bundled
// with round 2's setup and TANK's round-2 turn), then E1's round-2 turn, then the round-2 sweep
// (bundled with round 3's setup and TANK's round-3 turn).

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ROTCORE },
  { type: 'Waited', creatureId: ROTCORE },
  { type: 'TurnEnded', creatureId: ROTCORE },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'Waited', creatureId: E1 },
  { type: 'TurnEnded', creatureId: E1 },
  {
    type: 'DamageDealt',
    sourceId: ROTCORE,
    targetId: ROTCORE,
    rawDamage: 3,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'dot',
    statusId: 'poison',
  },
  { type: 'CreatureDied', creatureId: ROTCORE },
  {
    type: 'TriggerFired',
    sourceId: ROTCORE,
    hook: 'on-death',
    effectId: MYCONET_ROTCORE_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: E1,
    statusId: 'poison',
    stacks: 2,
    duration: 3,
    sourceId: ROTCORE,
  },
  // No second DamageDealt here -- E1's freshly-refreshed Poison does not tick in this same sweep.
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'Waited', creatureId: E1 },
  { type: 'TurnEnded', creatureId: E1 },
  {
    type: 'DamageDealt',
    sourceId: E1,
    targetId: E1,
    rawDamage: 6,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 94,
    damageSource: 'dot',
    statusId: 'poison',
  },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
]
