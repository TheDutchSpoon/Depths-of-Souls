// Golden: Stun's condition-status suppress-action, applied via a trait's apply-status response
// (REELING: on-damage-taken -> self-stun for 1 round). Proves the empty-bracket skip: VICTIM's
// very next turn (same round it was hit, since STRIKER acts first) has NO AttackDeclared between
// its TurnStarted/TurnEnded. Also exercises death pre-empting on-damage-taken (no re-stun, no new
// StatusApplied, on the killing blow) -- reusing Slice B's pinned hook order.
//
// Hand-derived (independent `node -e` calculator). Neutral affinity, no pools/mods.
//   STRIKER->VICTIM (off 20, def 5): core 15, chip 0.01*20=0.2 -> raw 15.2 -> final 15.
//   VICTIM (health 25): R1 25->10 (survives, stunned for its own R1 turn). R2 10->10-15 clamped
//   to 0 (dies) -- death pre-empts on-damage-taken, so no re-stun this time.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 9009 // No RNG consumed; seed is inert.

const STRIKER = createCreatureId('striker')
const VICTIM = createCreatureId('victim')

export const playerParty = makeParty('player', [
  { id: 'striker', attack: 20, speed: 20, scriptId: 'always-attack' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'victim',
    health: 25,
    defence: 5,
    speed: 5,
    scriptId: 'always-attack',
    innateTraitIds: ['reeling'],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

function strikerHit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: VICTIM,
    rawDamage: 15.2,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: VICTIM },
  strikerHit(10),
  {
    type: 'TriggerFired',
    sourceId: VICTIM,
    hook: 'on-damage-taken',
    effectId: 'reeling',
  },
  {
    type: 'StatusApplied',
    targetId: VICTIM,
    statusId: 'stun',
    stacks: 1,
    duration: 1,
    sourceId: VICTIM,
  },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'TurnStarted', creatureId: VICTIM },
  { type: 'TriggerFired', sourceId: VICTIM, hook: 'on-turn-start', effectId: 'stun' },
  // No AttackDeclared here -- the empty bracket IS the skip.
  { type: 'TurnEnded', creatureId: VICTIM },
  { type: 'StatusExpired', creatureId: VICTIM, statusId: 'stun' },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: VICTIM },
  strikerHit(0),
  // No re-stun here: the hit killed VICTIM, and death pre-empts on-damage-taken.
  { type: 'CreatureDied', creatureId: VICTIM },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
