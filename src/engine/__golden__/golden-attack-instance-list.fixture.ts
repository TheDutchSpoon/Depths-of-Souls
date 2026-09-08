// Golden: the action instance-list model (Phase 4 Slice B, locked). ATTACKER carries a
// Brute-starter-shaped "attack again for 30%" passive (TWO_INSTANCE: an action-instance effect,
// [100, 30]) plus an on-attack trigger (PING: flat 3 dmg to the target) fired EACH instance --
// proving on-attack fires per instance, not once per action, and that instance damage composes
// LINEARLY ([100, 30], never a re-multiplied entry).
//
// Hand-derived (independent `node -e` calculator). Both vitality -> identical affinity -> neutral
// x1.0. ATTACKER (speed 20) acts before DEFENDER (speed 1, scripted always-wait -- never acts).
//
//   Instance 1 (100%): off 10x1=10, def 0 -> core 10, chip 0.01*10=0.1 -> raw 10.1 -> final 10.
//   Instance 2 (30%):  off 10x0.3=3, def 0 -> core 3,  chip 0.01*3=0.03 -> raw 3.03 -> final 3.
//   Ping (flat, each instance): rawDamage 3, finalDamage max(1,floor(3))=3.
//
// DEFENDER health 19, all hits landing on the SAME frozen target (ASSUMPTION 31 -- alive
// throughout, so the selector is never re-run):
//   19 -(ping 3)-> 16 -(instance1 10)-> 6 -(ping 3)-> 3 -(instance2 3)-> 0 -- dies on the very
// last hit of ATTACKER's single turn. One round, one turn, fight over.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 7007 // No RNG consumed (single enemy, no provokers); seed is inert.

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const TWO_INSTANCE_STRIKER: Trait = {
  id: 'two-instance-striker',
  name: 'Two-Instance Striker',
  effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 30 }],
}

export const PING_ON_ATTACK: Trait = {
  id: 'ping-on-attack',
  name: 'Ping',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 3,
        damageSource: 'attack',
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 10,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['two-instance-striker', 'ping-on-attack'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'defender',
    health: 19,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [TWO_INSTANCE_STRIKER.id, TWO_INSTANCE_STRIKER],
  [PING_ON_ATTACK.id, PING_ON_ATTACK],
])

function ping(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 3,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

// Note: the ping trait's own effect instance is added/removed from cascade.activeInstances
// around EACH firing (fireHook's self-re-entry guard), so instance 2's ping is never blocked by
// instance 1's already-completed firing -- see resolution.ts's fireHook doc comment.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'TriggerFired',
    sourceId: ATTACKER,
    hook: 'on-attack',
    effectId: 'ping-on-attack',
  },
  ping(16),
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 6,
    damageSource: 'attack',
  },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'TriggerFired',
    sourceId: ATTACKER,
    hook: 'on-attack',
    effectId: 'ping-on-attack',
  },
  ping(3),
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 3.03,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: DEFENDER },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
