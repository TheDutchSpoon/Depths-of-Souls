// Golden: a GRANTED Attack (`perform-action`) stays DIRECT damage and gets the Additional (Phase
// 4.1-H2a, ASSUMPTIONS 112, 135). Hand-derived. A response only enqueues a grant; the granted
// action runs afterwards through the same Attack executor as a scripted one.
//
// ATTACKER (level 1, Attack 20, speed 10, `always-attack`) carries a fixture trait: on-turn-end ->
// perform-action(self, Attack at the lowest-HP enemy). DEFENDER: health 100, defence 5,
// always-wait. All vitality, neutral x1.0. Each Attack: off 20, def 5 -> core 15, chip 0.2 -> raw
// 15.2 -> 15; additional min(floor(20), 10) = 10 -> 25.
//   Scripted Attack: 25.  100 -> 75.
//   Turn end: the grant is queued by the on-turn-end hook and runs after it (ActionGranted, then
//   a real AttackDeclared + hit): 25. 75 -> 50.
// (As INDIRECT damage the granted hit would be 20 - 0.2 x 5 = 19; the golden's 25 proves it is not.)
// TURN_STEPS = 1.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8106 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const GRANT_ATTACK: Trait = {
  id: 'h2a-grant-attack',
  name: 'Grant Attack (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'perform-action',
        actor: 'self',
        intent: { action: { kind: 'attack' }, targeting: { kind: 'lowest-hp-enemy' } },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    level: 1,
    attack: 20,
    speed: 10,
    scriptId: 'always-attack',
    innateTraitIds: [GRANT_ATTACK.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'defender', health: 100, defence: 5, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [GRANT_ATTACK.id, GRANT_ATTACK],
])

function hit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 15.2,
    finalDamage: 25,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  hit(75),
  {
    type: 'TriggerFired',
    sourceId: ATTACKER,
    hook: 'on-turn-end',
    effectId: GRANT_ATTACK.id,
  },
  {
    type: 'ActionGranted',
    sourceId: ATTACKER,
    actorId: ATTACKER,
    effectId: GRANT_ATTACK.id,
  },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  hit(50),
  { type: 'TurnEnded', creatureId: ATTACKER },
]
