// Golden: the real Snapjaw Jaws ("Snapback") at 30% of Attack (Phase 4.1-H2c, ASSUMPTION 124; it
// was 60%). A content golden: its subject is one named trait's number, on real data. Snapback is a
// trait response (`on-damage-taken` -> `deal-damage` at `triggering-source`, `offStat 'attack'`),
// so its counter is INDIRECT damage (4.1-H2a): raw = magnitude x affinity x (1 + sum dealt) x
// prod(taken) - 0.2 x Defence, then MAX(1, floor(raw)); no chip floor, no Additional.
//
// Hand-derived (independent `node -e` calculator). Everyone is vitality (neutral x1.0) and every
// fixture creature is level 11 (`DEFAULT_FIXTURE_LEVEL`), where the Additional is 0.
//   P (player, health 100, attack 20, defence 10, speed 10) `always-attack`.
//   E (enemy, health 1000, attack 40, defence 0, speed 1) `always-wait`, the real Snapjaw Jaws.
//
//   R1 P attacks E (the only enemy). A direct Attack: core = max(20 - 0, 0) = 20, chip =
//     0.01 x 20 = 0.2, raw 20.2, final floor(20.2) = 20, no Additional. E 1000 -> 980.
//   E takes damage: on-damage-taken -> Snapback fires (TriggerFired), resolving
//     `triggering-source` = P. Magnitude = Attack 40 x spellPower 0.3 = 12; x1 x1 x1;
//     - 0.2 x P's Defence 10 = 2 -> raw 10, final MAX(1, floor(10)) = 10 (above the minimum of 1).
//     P 100 -> 90. (At 60% the magnitude is 24 and the counter 22, P -> 78.)
// TURN_STEPS = 1 (P's turn only).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { SNAPJAW_JAWS_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 8312 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const P = createCreatureId('p')
const E = createCreatureId('e')

export const playerParty = makeParty('player', [
  {
    id: 'p',
    health: 100,
    attack: 20,
    defence: 10,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'e',
    health: 1000,
    attack: 40,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [SNAPJAW_JAWS_TRAIT.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'AttackDeclared', attackerId: P, targetId: E },
  {
    type: 'DamageDealt',
    sourceId: P,
    targetId: E,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 980,
    damageSource: 'attack',
  },
  {
    type: 'TriggerFired',
    sourceId: E,
    hook: 'on-damage-taken',
    effectId: SNAPJAW_JAWS_TRAIT.id,
  },
  {
    type: 'DamageDealt',
    sourceId: E,
    targetId: P,
    rawDamage: 10,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 90,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: P },
]
