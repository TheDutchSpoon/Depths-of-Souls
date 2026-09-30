// Golden: "An action ends when its actor dies" (Phase 4.1-C2c, PR #73 review), the main case: a
// two-instance attacker whose FIRST hit is retaliated against (on-damage-taken -> a lethal flat hit
// on the triggering source) dies inside its own action, so instance 2 emits NOTHING (no
// AttackDeclared, no hit). Events already emitted stay. Hand-derived; no RNG (seed inert).
//
// ATTACKER (player, speed 20, Attack 20, HP 10, defence 0, `always-attack` = lowest-hp-enemy):
// trait `actor-dies-striker-fixture` = action-instance attack 30% -> instances [100, 30].
// ALLY (player, speed 1, HP 40, always-wait) keeps the fight going after the attacker dies.
// TARGET (enemy, speed 1, HP 100, defence 0, always-wait): trait `retaliate-fixture` =
// on-damage-taken -> deal-damage 99 (flat) to the triggering source.
//
// Instance 1 (100%): off 20 x 1 = 20, def 0 -> core 20, chip 0.2 -> raw 20.2 -> final 20.
//   TARGET 100 - 20 = 80 (survives, so on-damage-taken fires -- "only if the target survived").
//   Retaliation: TriggerFired(TARGET), flat 99 on ATTACKER: raw 99, final 99 (overkill precedent:
//   finalDamage is not clamped), ATTACKER 10 -> 0, CreatureDied(ATTACKER).
// Instance 2 (30%) would have been AttackDeclared + a 6-damage hit (20 x 0.3 = 6, raw 6.06); the
//   actor re-check at the start of the instance drops it. Then TurnEnded; ALLY survives, so no
//   FightEnded.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9250 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1 // ATTACKER's turn

const ATTACKER = createCreatureId('attacker')
const TARGET = createCreatureId('target')

export const STRIKER_FIXTURE: Trait = {
  id: 'actor-dies-striker-fixture',
  name: 'Two-Instance Striker (fixture)',
  effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 30 }],
}

export const RETALIATE_FIXTURE: Trait = {
  id: 'retaliate-fixture',
  name: 'Retaliate (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
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
    health: 10,
    attack: 20,
    defence: 0,
    speed: 20,
    scriptId: 'always-attack',
    innateTraitIds: [STRIKER_FIXTURE.id],
  },
  { id: 'ally', health: 40, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 0,
    speed: 1,
    scriptId: 'always-wait',
    innateTraitIds: [RETALIATE_FIXTURE.id],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [STRIKER_FIXTURE.id, STRIKER_FIXTURE],
  [RETALIATE_FIXTURE.id, RETALIATE_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: TARGET,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 80,
    damageSource: 'attack',
  },
  {
    type: 'TriggerFired',
    sourceId: TARGET,
    hook: 'on-damage-taken',
    effectId: RETALIATE_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: TARGET,
    targetId: ATTACKER,
    rawDamage: 99,
    finalDamage: 99,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: ATTACKER },
  // Instance 2 (30%) never starts: the actor is dead.
  { type: 'TurnEnded', creatureId: ATTACKER },
]
