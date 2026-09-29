// Golden: B5 + rule 4 (Phase 4.1-C2c) -- a Brute-style two-instance attacker whose first hit's
// target dies to an `on-attack` trait: that hit FIZZLES (no damage on the corpse), and the second
// instance re-targets by rule 4 (side-aware default = LOWEST-HP enemy, then Provoke -- none here),
// not first-by-slot. Hand-derived.
//
// ATTACKER (player, speed 20, Attack 20, HP 40, script `always-attack` = lowest-hp-enemy): one
// trait `b5-fixture` with three effects:
//   (1) action-instance attack 30% -> the instance list is [100, 30];
//   (2) on-fight-start deal-damage 15 (flat) to the `lowest-hp-enemy` -- the wound that makes a
//       "low-HP target" exist (createCombat resets every HP to full);
//   (3) on-attack, condition hp-percent subject 'target' <= 30, deal-damage 99 (flat) to the
//       triggering source (the attack's target).
// Enemies (defence 0, always-wait): A slot 0 HP 30, B slot 1 HP 25, C slot 2 HP 20 (speeds 3,2,1).
//
// Fight start: lowest-hp-enemy over {A 30, B 25, C 20} = C (20 is the UNIQUE minimum -- no tie
// to break). C 20 - 15 = 5 (rawDamage 15, flat).
// Instance 1 (100%): script target lowest-hp-enemy over {A 30, B 25, C 5} = C. AttackDeclared(C).
//   on-attack condition on C: hp-percent by integer cross-multiplication: currentHp*100 <=
//   thresholdPercent*maxHp  ->  5*100 = 500 <= 30*20 = 600 TRUE -> the trait fires: 99 flat on C:
//   C 5 -> 0, CreatureDied(C). B5: the target died in its own pre-hit hooks, so the main hit
//   FIZZLES: no DamageDealt for the 100% hit.
// Instance 2 (30%): previous target C is dead -> rule 4: default lowest-hp-enemy over survivors
//   {A 30, B 25} = B (25 < 30); first-by-slot would pick A (slot 0). No provoker -> no draw.
//   AttackDeclared(B). The lethal trait's condition against B: 25*100 = 2500 <= 30*25 = 750 FALSE
//   -> it does NOT fire. Hit: off 20 x 0.3 = 6, def 0 -> core 6, chip 0.06 -> raw 6.06 -> final 6.
//   B 25 - 6 = 19 (no clamp). Fight continues (A, B alive). No RNG anywhere; SEED is inert.
// With B5's guard removed the log gains a DamageDealt on C (dead) after CreatureDied; with
// first-by-slot restored for rule 4 instance 2 hits A (remainingHp 24) instead of B.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9240 // No RNG consumed (no provoker, no random selector); seed is inert.
export const TURN_STEPS = 1 // ATTACKER's turn: both instances

const ATTACKER = createCreatureId('attacker')
const B = createCreatureId('b')
const C = createCreatureId('c')

export const B5_FIXTURE: Trait = {
  id: 'b5-fixture',
  name: 'B5 (fixture)',
  effects: [
    { category: 'action-instance', actionKind: 'attack', powerPercent: 30 },
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
        flatAmount: 15,
        damageSource: 'attack',
      },
    },
    {
      category: 'triggered',
      hook: 'on-attack',
      condition: {
        kind: 'hp-percent',
        subject: 'target',
        qualifier: 'any',
        comparator: '<=',
        thresholdPercent: 30,
      },
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 99,
        damageSource: 'attack',
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    health: 40,
    attack: 20,
    defence: 0,
    speed: 20,
    scriptId: 'always-attack',
    innateTraitIds: [B5_FIXTURE.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'a', health: 30, defence: 0, speed: 3, scriptId: 'always-wait' },
  { id: 'b', health: 25, defence: 0, speed: 2, scriptId: 'always-wait' },
  { id: 'c', health: 20, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([[B5_FIXTURE.id, B5_FIXTURE]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: ATTACKER,
    hook: 'on-fight-start',
    effectId: B5_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: C,
    rawDamage: 15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 5,
    damageSource: 'attack',
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  // Instance 1 (100%): declared on C, the lethal trait kills it, the hit itself fizzles.
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: C },
  {
    type: 'TriggerFired',
    sourceId: ATTACKER,
    hook: 'on-attack',
    effectId: B5_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: C,
    rawDamage: 99,
    finalDamage: 99,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: C },
  // (no DamageDealt for the fizzled 100% hit)
  // Instance 2 (30%): rule 4 -> lowest-HP survivor B (25 < A's 30); the trait's condition is false.
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: B },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: B,
    rawDamage: 6.06,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 19,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
]
