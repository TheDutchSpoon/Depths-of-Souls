// Golden: two carriers of one `stacks: false` trigger on opposite sides -- the one earlier in turn
// order claims the pass's single chance and the other draws nothing. Hand-derived. The fixture
// trigger observes `relationship: 'any'`, so both carriers match the one action (the shipped
// Resonant Overtone observes `ally` casts only, so two Overtones never both match).
//
// Cast (all violence -> every affinity multiplier x1.0; level 11 -> no Additional):
//   Player side: S (slot 0, speed 10, carrier), A (slot 1, speed 40, Attack 40, always-attack)
//   Enemy side:  F (slot 0, speed 30, health 100, Defence 10, carrier)
// Turn order: A 40, F 30, S 10. Side -> slot -> id order (S, A, F) would put the player carrier S
// first. TURN_STEPS = 1 runs A's turn: it attacks F, the only enemy.
//
// The carrier trait: on `on-action-observed`, `chancePercent` 50, `stacks: false`, Attack x1.5 on
// its own bearer (20 -> 30). `stacks: false` claims the slot BEFORE the roll, so only the first
// carrier in the pass is given a chance at all.
//
// Draws (independent mulberry32 trace, seed 9507): 0.275722.
//   F is first in turn order and claims the slot: it rolls 0.275722 < 0.50 -> fires.
//   S finds the slot claimed: no roll, no event. One draw in all.
// In side -> slot -> id order S would claim, draw 0.275722 and fire, and F would stay silent.
//
// Hit on F: core 40 - 10 = 30, chip 0.01 x 40 = 0.4 -> raw 30.4 -> final 30; F 100 -> 70.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9507
export const TURN_STEPS = 1

const A = createCreatureId('a')
const F = createCreatureId('f')

export const ONE_CHANCE: Trait = {
  id: 'non-stacking-one-chance',
  name: 'One Chance (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'any' },
      chancePercent: 50,
      stacks: false,
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.5,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 's',
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [ONE_CHANCE.id],
  },
  {
    id: 'a',
    speed: 40,
    attack: 40,
    affinity: 'violence',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'f',
    health: 100,
    defence: 10,
    speed: 30,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [ONE_CHANCE.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([[ONE_CHANCE.id, ONE_CHANCE]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: F },
  // F claims the slot and rolls; S draws nothing.
  {
    type: 'TriggerFired',
    sourceId: F,
    hook: 'on-action-observed',
    effectId: ONE_CHANCE.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: F,
    targetId: F,
    stat: 'attack',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: F,
    rawDamage: 30.4,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 70,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: A },
]
