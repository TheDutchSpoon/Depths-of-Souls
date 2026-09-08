// Golden: the `consume-stacks` response (Phase 4 Slice D, Response vocabulary now EIGHT) --
// Glowflies' Detonator-SHAPED (species-locked.md: "Charger stacks Glow on an ally, Detonator
// consumes all Glow -> burst"; a fixture mechanism demo, not the real per-species content, which
// is H2's job). DETONATOR starts the fight already carrying 3 Glow stacks (an on-fight-start
// apply-status stands in for a separate Charger creature, out of this slice's scope); its very
// first Attack's on-attack hook consumes all 3 stacks and bursts Intelligence-scaled damage at
// the attack's own target, scaled by the CONSUMED count via `magnitudeSource: { kind:
// 'consumed-stacks' }` -- BEFORE the attack's own base hit lands.
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
//
//   Burst: scalingStat 'intelligence' (10) x spellPower(1.0 * 3 consumed stacks = 3.0) = 30;
//     vs def 0: core 30, chip 0.3 -> raw 30.3 -> final 30. TARGET health 35 - 30 -> 5, alive.
//   Base attack (off Attack 5, def 0): core 5, chip 0.05 -> raw 5.05 -> final 5.
//     TARGET health 5 - 5 -> 0 -> dies. Glow is already consumed by this point, so its own
//     dealt-mod (+10%/stack) never contributes to either hit -- confirmed by both raw values
//     above assuming an empty dealt pool.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { DamageModifierDef, Trait } from '../effect-types'

export const SEED = 2002 // No RNG consumed; seed is inert.

const DETONATOR = createCreatureId('detonator')
const TARGET = createCreatureId('target')

const GLOW_STATUS_ID = 'glow-fixture'

export const GLOW: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: GLOW_STATUS_ID,
  cap: 5,
  direction: 'dealt',
  magnitude: 0.1, // +10% dealt per stack -- never actually read here, consumed before any hit
}

export const DETONATOR_FIXTURE: Trait = {
  id: 'detonator-fixture',
  name: 'Detonator (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: GLOW_STATUS_ID, duration: 5, stacks: 3 },
      },
    },
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'consume-stacks',
        statusId: GLOW_STATUS_ID,
        effect: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          scalingStat: 'intelligence',
          magnitudeSource: { kind: 'consumed-stacks' },
        },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'detonator',
    attack: 5,
    intelligence: 10,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['detonator-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 35,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [DETONATOR_FIXTURE.id, DETONATOR_FIXTURE],
])
export const statuses = new Map([[GLOW.statusId, GLOW]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: DETONATOR,
    hook: 'on-fight-start',
    effectId: 'detonator-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: DETONATOR,
    statusId: GLOW_STATUS_ID,
    stacks: 3,
    duration: 5,
    sourceId: DETONATOR,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: DETONATOR },
  { type: 'AttackDeclared', attackerId: DETONATOR, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: DETONATOR,
    hook: 'on-attack',
    effectId: 'detonator-fixture',
  },
  { type: 'StatusExpired', creatureId: DETONATOR, statusId: GLOW_STATUS_ID },
  {
    type: 'DamageDealt',
    sourceId: DETONATOR,
    targetId: TARGET,
    rawDamage: 30.3,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 5,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: DETONATOR,
    targetId: TARGET,
    rawDamage: 5.05,
    finalDamage: 5,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: DETONATOR },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
