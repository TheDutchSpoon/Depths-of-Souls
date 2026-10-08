// Golden: the Additional on EVERY attack instance (Phase 4.1-H2a, ASSUMPTION 135), not just the
// first. Hand-derived. ATTACKER (level 1, Attack 20, speed 10) carries the instance-list passive
// [100, 30] (Brute-starter-shaped "attack again for 30%"). DEFENDER: health 100, defence 5,
// always-wait. All vitality, neutral x1.0. The Additional is min(floor(20% x 100) = 20, cap 10) =
// 10 on both instances (it reads the target's MAX Health, which does not fall as it is hit).
//
//   Instance 1 (100%): off 20, def 5 -> core 15, chip 0.2 -> raw 15.2 -> 15; + 10 = 25. 100 -> 75.
//   Instance 2 (30%):  off 20 x 0.3 = 6, def 5 -> core 1, chip 0.06 -> raw 1.06 -> 1;  + 10 = 11.
//                      75 -> 64.
// TURN_STEPS = 1 (ATTACKER's single turn).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8103 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const TWO_INSTANCE: Trait = {
  id: 'h2a-two-instance',
  name: 'Two-Instance Striker (fixture)',
  effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 30 }],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    level: 1,
    attack: 20,
    speed: 10,
    scriptId: 'always-attack',
    innateTraitIds: [TWO_INSTANCE.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'defender', health: 100, defence: 5, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [TWO_INSTANCE.id, TWO_INSTANCE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 15.2,
    finalDamage: 25,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 75,
    damageSource: 'attack',
  },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 1.06,
    finalDamage: 11,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 64,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
]
