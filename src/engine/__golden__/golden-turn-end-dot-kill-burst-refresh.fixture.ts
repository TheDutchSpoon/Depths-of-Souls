// Golden: the REFRESH path of the turn-end DoT-kill burst -- golden-turn-end-dot-kill-burst's
// twin (4.1-H2b2: single instance + the applier snapshot). E1 already carries a WEAK Poison applied
// by TANK before the fight; ROTCORE's on-death burst RE-APPLIES Poison to E1 with a STRONGER
// snapshot during ROTCORE's turn: the same instance (and id) is kept, the timer is refreshed and
// stamped born in THAT turn (for E1 another creature's turn, so E1 ticks at its own next turn
// end), and the snapshot is replaced because the new potency is strictly greater.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). ROTCORE (Attack 50) starts
// carrying its own Poison and wounded to 1 HP; E1 starts carrying a Poison applied by TANK (Attack
// 20): snapshot applier TANK, vitality, potency floor(20 x 20 / 100) = 4 (both applied via direct
// `applyStatus` calls before any turn, into a throwaway events array). TANK keeps the player side
// from being wiped. Every bearer has Defence 20, vitality (neutral). Turn order: ROTCORE(20) >
// TANK(15) > E1(10); TANK > E1 afterwards.
//
//   ROTCORE's turn end (round 1): self-applied tick potency floor(50 x 20 / 100) = 10, 10 - 4 = 6,
//     ROTCORE 1 -> 0, dies; on-death Death Bloom -> apply-status(all-enemies, poison) -> E1
//     already carries Poison: the instance is kept, its timer is reset to Poison's defaultDuration
//     3 (Death Bloom's StatusSpec carries no explicit duration), and since the candidate snapshot
//     (applier ROTCORE read from its corpse, potency 10) is strictly stronger than TANK's (4) it
//     REPLACES it. StatusApplied(E1, poison, duration 3, source ROTCORE).
//   E1's turn end (round 1): not born for E1 -> ticks the replaced snapshot: 10 - 4 = 6, E1 100 ->
//     94, sourced from E1 (the applier ROTCORE is dead -> the bearer is the logged source). Were the
//     weaker snapshot kept, the tick would be 4 - 4 = 0 -> min 1, sourced from TANK. Countdown 3 -> 2.
//     Round 2: tick 94 -> 88, countdown 2 -> 1.
//   TANK's turns: nothing.

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
  // Pre-apply Poison to ROTCORE (its own) and to E1 (TANK's, the weak one), and wound ROTCORE to
  // 1 HP, all before any turn resolves -- into a throwaway events array, mirroring the PR #64
  // repro's own setup idiom.
  let state = applyStatus(
    ROTCORE,
    ROTCORE,
    { statusId: 'poison' },
    created,
    createResolutionContext([], newCascade()),
  )
  state = applyStatus(
    TANK,
    E1,
    { statusId: 'poison' },
    state,
    createResolutionContext([], newCascade()),
  )
  state = updateCreature(state, ROTCORE, { currentHp: ROTCORE_STARTING_HP })
  return state
}
