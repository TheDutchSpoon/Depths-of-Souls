// Golden: a CONDITIONAL trigger (VENGEFUL: on-damage-taken, gated on self HP% < 50, retaliate 30%
// Attack at the attacker). The trigger analogue of golden-conditional-passive: the same incoming
// hit produces no retaliation while X is healthy, then a retaliation once a hit drops X below half.
// Condition is evaluated self-scoped against LIVE state (post-damage currentHp) at fire time.
//
// Hand-derived (independent `node -e` calculator). Both bodies → neutral ×1.0. A (speed 10) first;
// X (speed 5) is scripted always-wait, so it only ever reacts. X max HP 30, so HP% < 50 ⇔
// currentHp < 15 (integer cross-multiply: currentHp*100 < 50*30 = 1500).
//
//   A→X (off 20, def 8):                    core 12, chip 0.20 → raw 12.20 → 12.
//   X retaliate→A (off 16×0.3=4.8, def 6):  core 0 (chip-only), chip 0.048 → raw 0.048 → 1.
//
//   R1: X 30 → 18. 18 ≥ 15 → condition FALSE → no retaliation.
//   R2: X 18 →  6.  6 < 15 → condition TRUE  → retaliation (1 dmg to A).
//   R3: X  6 →  0. killed → on-damage-taken pre-empted by death → no retaliation.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 7007 // No RNG consumed; seed is inert.

const A = createCreatureId('a')
const X = createCreatureId('x')

export const playerParty = makeParty('player', [
  {
    id: 'a',
    health: 40,
    attack: 20,
    defence: 6,
    speed: 10,
    affinity: 'body',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'x',
    health: 30,
    attack: 16,
    defence: 8,
    speed: 5,
    affinity: 'body',
    scriptId: 'always-wait',
    innateTraitIds: ['vengeful'],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

function aHit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: A,
    targetId: X,
    rawDamage: 12.2,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: X },
  aHit(18),
  // No retaliation: X at 18/30 is above the 50% threshold, condition false.
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: X },
  { type: 'Waited', creatureId: X },
  { type: 'TurnEnded', creatureId: X },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: X },
  aHit(6),
  // X now at 6/30 (< 50%) -> condition true -> retaliation.
  { type: 'TriggerFired', sourceId: X, hook: 'on-damage-taken', effectId: 'vengeful' },
  {
    type: 'DamageDealt',
    sourceId: X,
    targetId: A,
    rawDamage: 0.048,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 39,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: X },
  { type: 'Waited', creatureId: X },
  { type: 'TurnEnded', creatureId: X },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: X },
  aHit(0),
  // Killed -> death pre-empts on-damage-taken -> no retaliation.
  { type: 'CreatureDied', creatureId: X },
  { type: 'TurnEnded', creatureId: A },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
