// Golden: PR #64 review fix 2 -- a status born (or refreshed) mid-sweep must not tick in that
// SAME sweep; it ticks normally starting the NEXT round's sweep. Before the fix, a condition-
// status's on-round-end trigger fired for every LIVING creature carrying the status at the
// moment `fireHook('on-round-end', ...)` reached it, with no check against the sweep's own
// start-of-sweep snapshot -- so a status applied mid-sweep (by an earlier creature's own
// on-round-end/on-death cascade) would ALSO tick before that same sweep finished. The repro:
// Myconet Rotcore (player-side, real `MYCONET_ROTCORE_TRAIT`) dies to its own Poison tick at
// round-end and Poisons the enemy side via its on-death trigger -- the enemy side sweeps AFTER
// the player side in the same pass, so the newly-Poisoned enemy would tick in the SAME sweep that
// just infected it.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). ROTCORE starts the fight
// already carrying Poison (applied via a direct `applyStatus` call before any turn resolves, into
// a throwaway events array) and wounded to 1 HP, so its own first tick is lethal. TANK (a second
// player-side creature, so the player side isn't wiped when Rotcore dies) and E1 (the sole enemy)
// both survive the whole fixture. Turn order (speed): ROTCORE(20) > TANK(15) > E1(10) in round 1;
// TANK(15) > E1(10) in rounds 2-3 (Rotcore excluded, dead).
//
//   Round-1 sweep (bundled into the 4th `resolveTurn` call, alongside round 2's setup and TANK's
//     own round-2 turn): order (tie-break: player -> slot -> id) = ROTCORE, TANK, E1.
//   ROTCORE's Poison tick: flatAmount 3% of its own max HP [100] * 1 stack = 3. ROTCORE 1 - 3 ->
//     clamped to 0 -> dies. CreatureDied(ROTCORE) -> on-death fires Death Bloom ->
//     apply-status(all-enemies, poison) -> StatusApplied(E1, poison, 1 stack, duration 3, source
//     ROTCORE) -- E1 is Poisoned MID-SWEEP.
//   TANK has no on-round-end effect -> nothing.
//   E1: its own activeEffects are re-read fresh at this point and NOW include the Poison just
//     applied above -- a naive implementation would tick it right here. Fix 2's gate
//     (`(e1, poison)` is not in the SWEEP'S OWN start-of-sweep snapshot) skips it instead --
//     no second DamageDealt this sweep, proven by this golden's own event log.
//   decrementAndExpireSnapshot: ROTCORE's own (pre-existing, snapshotted) Poison instance
//     decrements 3 -> 2 (no expiry, no event; ROTCORE is dead but the bookkeeping still applies to
//     its corpse, unrelated to fix 2) -- E1's brand-new instance is untouched (not in the
//     snapshot). Not wiped (TANK survives) -> round 2 begins: queue = [TANK, E1] (ROTCORE
//     excluded) -> RoundStarted{round:2} -> TANK's turn (always-wait) -> Waited.
//
//   Round 2's queue is [TANK, E1] (ROTCORE excluded, dead) -- BOTH take their own (uneventful,
//     always-wait) turns before the round-2 sweep fires (a sweep only runs once the whole queue
//     is exhausted).
//
//   Round-2 sweep (bundled into the 6th `resolveTurn` call, alongside round 3's setup and TANK's
//     own round-3 turn): order = TANK, E1. TANK: nothing. E1's Poison IS now in round 2's OWN
//     start-of-sweep snapshot and has not been reapplied this sweep -> fix 2's gate allows it ->
//     ticks NORMALLY this time: flatAmount 3% of E1's own max HP [100] * 1 stack = 3. E1 100 - 3
//     = 97, survives. Not wiped -> round 3 begins: queue = [TANK, E1] -> RoundStarted{round:3} ->
//     TANK's turn -> Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { MYCONET_ROTCORE_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 61 // No RNG consumed anywhere in this fixture; seed is inert.

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
    stacks: 1,
    duration: 3,
    sourceId: ROTCORE,
  },
  // No second DamageDealt here -- E1's freshly-applied Poison does not tick in this same sweep.
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
    rawDamage: 3,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 97,
    damageSource: 'dot',
    statusId: 'poison',
  },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
]
