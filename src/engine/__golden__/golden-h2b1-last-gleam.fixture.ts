// Golden: the Flickerling Last Gleam (Phase 4.1-H2b1, ASSUMPTION 116): whenever an ally dies, every
// living ally permanently gains 20% Attack -- and its own death does not trigger itself.
// Hand-derived; the Last Gleam is the REAL species with its real trait. Two cases, each its own
// fixture object in this file.
//
// The attacker K (violence, Attack 40, speed 30, always-attack at the lowest-HP enemy, level 11 ->
// no Additional) and every defender are violence, so every affinity multiplier is x1.0.
//
// CASE 1, `allyDies`: players GLEAM (28 / 24 / 10 / 14 / 18, violence), F (health 20, Defence 10,
//   speed 5), G (health 40, speed 4). TURN_STEPS = 1: K's turn. Lowest HP = F (20 < 28 < 40). Attack
//   40 vs Defence 10: core 30, chip 0.01 x 40 = 0.4 -> raw 30.4 -> 30 >= 20: F dies (remainingHp 0).
//   CreatureDied F; no on-death/on-kill trait; the death observers run over F's living allies in
//   party order: GLEAM fires Last Light -> Attack x1.2 to every LIVING ally: GLEAM 24, G 20 (the dead F
//   gets nothing). K's own side has no on-enemy-death trait.
//
// CASE 2, `gleamDies`: players GLEAM (the lowest HP, 28) and G (40); K's Attack is 100. Attack 100
//   vs Defence 14: core 86, chip 1.0 -> raw 87 -> 87 >= 28: GLEAM dies. CreatureDied GLEAM; the death
//   observers run over its LIVING allies (G, no trait) -- the dead GLEAM does not observe its own
//   death, so there is no TriggerFired and no stat modifier.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { fromSpecies } from '../__fixtures__/flickerlings'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { FLICKERLING_LAST_GLEAM } from '../../data/species/glimmerdark'
import { FLICKERLING_LAST_GLEAM_TRAIT } from '../../data/traits/glimmerdark'
import type { CombatEvent } from '../types'

const K = createCreatureId('k')
const GLEAM = createCreatureId('last-gleam')
const F = createCreatureId('f')
const G = createCreatureId('g')

const killer = (attack: number) =>
  makeParty('enemy', [
    {
      id: 'k',
      health: 100,
      attack,
      speed: 30,
      affinity: 'violence',
      scriptId: 'always-attack',
    },
  ])

export const allyDies = {
  SEED: 8209, // No RNG consumed; seed is inert.
  TURN_STEPS: 1,
  playerParty: [
    fromSpecies(FLICKERLING_LAST_GLEAM, 'player', 0),
    ...makeParty('player', [
      {
        id: 'f',
        health: 20,
        defence: 10,
        speed: 5,
        affinity: 'violence',
        scriptId: 'always-wait',
      },
      { id: 'g', health: 40, speed: 4, affinity: 'violence', scriptId: 'always-wait' },
    ]).map((creature, i) => ({ ...creature, slot: i + 1 })),
  ],
  enemyParty: killer(40),
  scripts: FIXTURE_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
}

export const allyDiesExpected: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: K },
  { type: 'AttackDeclared', attackerId: K, targetId: F },
  {
    type: 'DamageDealt',
    sourceId: K,
    targetId: F,
    rawDamage: 30.4,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: F },
  {
    type: 'TriggerFired',
    sourceId: GLEAM,
    hook: 'on-ally-death',
    effectId: FLICKERLING_LAST_GLEAM_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GLEAM,
    targetId: GLEAM,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 24,
    effectiveAfter: 24 * 1.2,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GLEAM,
    targetId: G,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 20,
    effectiveAfter: 20 * 1.2,
  },
  { type: 'TurnEnded', creatureId: K },
]

export const gleamDies = {
  SEED: 8210, // No RNG consumed; seed is inert.
  TURN_STEPS: 1,
  playerParty: [
    fromSpecies(FLICKERLING_LAST_GLEAM, 'player', 0),
    ...makeParty('player', [
      { id: 'g', health: 40, speed: 4, affinity: 'violence', scriptId: 'always-wait' },
    ]).map((creature) => ({ ...creature, slot: 1 })),
  ],
  enemyParty: killer(100),
  scripts: FIXTURE_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
}

export const gleamDiesExpected: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: K },
  { type: 'AttackDeclared', attackerId: K, targetId: GLEAM },
  {
    type: 'DamageDealt',
    sourceId: K,
    targetId: GLEAM,
    rawDamage: 87,
    finalDamage: 87,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: GLEAM },
  // (no TriggerFired: the dead Last Gleam does not observe its own death, and G has no such trait)
  { type: 'TurnEnded', creatureId: K },
]
