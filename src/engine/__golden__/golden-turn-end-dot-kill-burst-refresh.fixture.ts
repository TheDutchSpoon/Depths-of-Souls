// Golden: the REFRESH path of the turn-end DoT-kill burst -- golden-turn-end-dot-kill-burst's
// twin. E1 already carries Poison (1 stack) before the fight; ROTCORE's on-death burst REFRESHES it
// (2 stacks, duration 3, same instance and id) during ROTCORE's turn. A refresh stamps the
// instance as born in THAT turn, which for E1 is another creature's turn, so E1 ticks at its own
// next turn end at the NEW stack count. Re-derived in 4.1-F2 (it was the PR #64 fix 2 refresh-path
// golden for the deleted round-end sweep).
//
// Hand-derived (independent `node -e` calculator, verified via Bash). ROTCORE starts already
// carrying Poison and wounded to 1 HP; E1 starts carrying 1 stack (both applied via direct
// `applyStatus` calls before any turn, into a throwaway events array). TANK keeps the player side
// from being wiped. Turn order: ROTCORE(20) > TANK(15) > E1(10); TANK > E1 afterwards.
//
//   ROTCORE's turn end (round 1): tick 3 -> dies; on-death Death Bloom ->
//     apply-status(all-enemies, poison) -> E1 already carries 1 stack -> newStacks = min(cap 5,
//     1 + 1) = 2 -> StatusApplied(E1, poison, 2 stacks, duration 3 [Poison's defaultDuration:
//     Death Bloom's StatusSpec carries no explicit duration], source ROTCORE).
//   E1's turn end (round 1): not born for E1 -> ticks at 2 stacks: 3% of 100 * 2 = 6, E1 100 -> 94;
//     countdown 3 -> 2. Round 2: tick 94 -> 88, countdown 2 -> 1.
//   TANK's turns: nothing.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
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
  // Pre-apply Poison to both ROTCORE and E1, and wound ROTCORE to 1 HP, all before any turn
  // resolves -- into a throwaway events array, mirroring the PR #64 repro's own setup idiom.
  let state = applyStatus(
    ROTCORE,
    ROTCORE,
    { statusId: 'poison' },
    created,
    createResolutionContext([], newCascade()),
  )
  state = applyStatus(
    ROTCORE,
    E1,
    { statusId: 'poison' },
    state,
    createResolutionContext([], newCascade()),
  )
  state = updateCreature(state, ROTCORE, { currentHp: ROTCORE_STARTING_HP })
  return state
}
