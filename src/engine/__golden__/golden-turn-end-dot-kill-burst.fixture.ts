// Golden: a status applied during ANOTHER creature's turn ticks at its bearer's own next turn
// end (4.1-F2; the born-this-turn rule only protects a status from the turn it was applied in,
// for its bearer). Re-derived from the PR #64 fix 2 round-end-sweep golden (the sweep, its
// snapshot and its gate are deleted). The repro: Myconet Rotcore (player-side, real
// `MYCONET_ROTCORE_TRAIT`) dies to its own Poison tick in its own turn-end hooks and Poisons the
// enemy side via its on-death trigger.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). ROTCORE starts the fight
// already carrying Poison (applied via a direct `applyStatus` call before any turn resolves, into
// a throwaway events array) and wounded to 1 HP, so its own first tick is lethal. TANK (a second
// player-side creature, so the player side isn't wiped when Rotcore dies) and E1 (the sole enemy)
// both survive the whole fixture. Turn order (speed): ROTCORE(20) > TANK(15) > E1(10) in round 1;
// TANK(15) > E1(10) in rounds 2-3 (Rotcore excluded, dead).
//
// (4.1-H2b2) Poison's potency is 20% of the APPLIER's effective Attack at application. ROTCORE has
// Attack 50; every bearer has Defence 20 and is vitality (neutral), so every tick here is
// potency 10 - 0.2 x 20 = 6.
//
//   ROTCORE's turn end (round 1): ROTCORE applied its own Poison (alive applier = bearer, a
//     self-applied tick): potency floor(50 x 20 / 100) = 10, tick 6, sourced from ROTCORE.
//     ROTCORE 1 - 6 -> clamped to 0 -> dies. CreatureDied(ROTCORE) -> on-death fires Death
//     Bloom -> apply-status(all-enemies, poison) -> StatusApplied(E1, poison, duration 3, source
//     ROTCORE). ROTCORE is DEAD at that application: the snapshot reads the corpse's effective
//     Attack then (50): applier ROTCORE, potency 10 -- and, the applier being dead, E1's ticks have
//     E1 itself as their source from the first. Not wiped (TANK, E1 live). ROTCORE's cleanup is skipped (a corpse's
//     statuses are inert, no StatusExpired). TurnEnded.
//   TANK: nothing.
//   E1's turn end (round 1): the Poison was applied in ROTCORE's turn, so for E1 it is NOT born
//     this turn: it ticks (6, source E1, E1 100 -> 94) and counts down 3 -> 2. (Under the old
//     sweep it waited a full round.)
//   Round 2: TANK waits; E1's turn end: tick 94 -> 88, countdown 2 -> 1. Round 3 begins: TANK's
//     turn (always-wait) -> Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { MYCONET_ROTCORE_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'
import { updateCreature } from '../creature-lookup'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatState } from '../types'

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
    attack: 50,
    speed: 20,
    scriptId: 'always-wait',
    innateTraitIds: [MYCONET_ROTCORE_TRAIT.id],
  },
  { id: 'tank', health: 100, speed: 15, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e1', health: 100, speed: 10, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 6 // ROTCORE, TANK and E1's round-1 turns, then TANK's round-2 turn (with
// round 2's setup), E1's round-2 turn, then TANK's round-3 turn (with round 3's setup).

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ROTCORE },
  { type: 'Waited', creatureId: ROTCORE },
  {
    type: 'DamageDealt',
    sourceId: ROTCORE,
    targetId: ROTCORE,
    rawDamage: 6,
    finalDamage: 6,
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
    duration: 3,
    sourceId: ROTCORE,
  },
  { type: 'TurnEnded', creatureId: ROTCORE },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'Waited', creatureId: E1 },
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
  { type: 'TurnEnded', creatureId: E1 },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'Waited', creatureId: E1 },
  {
    type: 'DamageDealt',
    sourceId: E1,
    targetId: E1,
    rawDamage: 6,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 88,
    damageSource: 'dot',
    statusId: 'poison',
  },
  { type: 'TurnEnded', creatureId: E1 },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: TANK },
  { type: 'Waited', creatureId: TANK },
  { type: 'TurnEnded', creatureId: TANK },
]

/** Post-`createCombat` step (createCombat resets HP/statuses at fight setup); runs before the first
 * frozen turn (see test-utils/golden-runner.ts). */
export const setup = (created: CombatState): CombatState => {
  // Pre-apply Poison to ROTCORE and wound it to 1 HP, both before any turn resolves -- into a
  // throwaway events array, mirroring the PR #64 repro's own setup idiom.
  let state = applyStatus(
    ROTCORE,
    ROTCORE,
    { statusId: 'poison' },
    created,
    createResolutionContext([], newCascade()),
  )
  state = updateCreature(state, ROTCORE, { currentHp: ROTCORE_STARTING_HP })
  return state
}
