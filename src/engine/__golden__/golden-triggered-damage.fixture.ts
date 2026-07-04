// Golden: a triggered effect (RETALIATE: on-damage-taken → deal 30% Attack to the attacker).
// Proves the trigger path: TriggerFired precedes the retaliation's DamageDealt, the retaliation
// uses the real damage formula, and — critically — the lethal hit does NOT trigger a retaliation
// (death pre-empts the victim's on-damage-taken, per the pinned damage-path hook order).
//
// Hand-derived (independent `node -e` calculator). Both bodies → neutral affinity ×1.0. HERO
// (speed 10) acts before FOE (speed 5, scripted always-wait — it only ever reacts, never attacks).
//
//   HERO→FOE (off 20, def 8):        core 12, chip 0.20 → raw 12.20 → 12.
//   FOE retaliate→HERO (off 16×0.3=4.8, def 6): core 0 (chip-only), chip 0.048 → raw 0.048 → 1.
//
// FOE 30 → 18 → 6 → 0 over three HERO hits; it retaliates after the first two (1 dmg each) but
// NOT the third (that hit kills it). HERO wins in round 3 before FOE's turn.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 5005 // No RNG consumed (deterministic targeting, no provokers); seed is inert.

const HERO = createCreatureId('hero')
const FOE = createCreatureId('foe')

export const playerParty = makeParty('player', [
  {
    id: 'hero',
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
    id: 'foe',
    health: 30,
    attack: 16,
    defence: 8,
    speed: 5,
    affinity: 'body',
    scriptId: 'always-wait',
    innateTraitIds: ['retaliate'],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

function heroHit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: FOE,
    rawDamage: 12.2,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

function retaliation(remainingHp: number): readonly CombatEvent[] {
  return [
    {
      type: 'TriggerFired',
      sourceId: FOE,
      hook: 'on-damage-taken',
      effectId: 'retaliate',
    },
    {
      type: 'DamageDealt',
      sourceId: FOE,
      targetId: HERO,
      rawDamage: 0.048,
      finalDamage: 1,
      affinityMultiplier: 1,
      wasChipOnly: true,
      remainingHp,
      damageSource: 'attack',
    },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: FOE },
  heroHit(18),
  ...retaliation(39),
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: FOE },
  heroHit(6),
  ...retaliation(38),
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: FOE },
  heroHit(0),
  // No retaliation here: the hit killed FOE, and death pre-empts on-damage-taken.
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
