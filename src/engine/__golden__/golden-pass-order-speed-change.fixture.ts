// Golden: a pass takes its order once, when it starts; a response early in the pass that changes a
// later creature's Speed doesn't reorder that pass, and the next pass reads the new Speed.
// Hand-derived; no RNG is consumed (the seed is inert). This kills two mutants: re-reading the
// order inside a pass (pass 1 would fire A, C, B), and taking the order once at the action's start
// (pass 2 would fire A, B, C).
//
// Cast (all violence -> every affinity multiplier x1.0; level 11 -> no Additional):
//   Player side: A (slot 0, speed 40, health 40, Attack 40, always-attack), C (slot 1, speed 10,
//                health 20)
//   Enemy side:  B (slot 0, speed 20, health 100, Defence 10)
// Three observers (`relationship: 'any'`), in turn order A 40, B 20, C 10. Side -> slot -> id is
// A, C, B, so the two orders differ on B and C.
//
// A attacks B, the only enemy (TURN_STEPS = 1 runs only its turn).
//
// Pass 1, `on-action-observed` (before the hit), taken from Speeds A 40, B 20, C 10 -> A, B, C:
//   A: Speed x2.5 on its lowest-HP ally -- C (20) is below A (40). C's Speed 10 -> 25, above B's 20.
//   B: Attack x1.1 on itself (20 -> 22).
//   C: Attack x1.2 on itself (20 -> 24). C still fires after B: this pass keeps its order.
// Hit on B: core 40 - 10 = 30, chip 0.01 x 40 = 0.4 -> raw 30.4 -> final 30; B 100 -> 70.
// Pass 2, `on-damage-observed` (after the hit), taken from Speeds A 40, C 25, B 20 -> A, C, B:
//   A: Defence x1.3 on itself (20 -> 26). C: Defence x1.5 (20 -> 30). B: Defence x1.4 (10 -> 14:
//   B's Defence is 10, not the default 20).

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9503 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const A = createCreatureId('a')
const B = createCreatureId('b')
const C = createCreatureId('c')

export const OBSERVE_A: Trait = {
  id: 'speed-change-observe-a',
  name: 'Observe A (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'any' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        stat: 'speed',
        factor: 2.5,
      },
    },
    damageObserver(1.3),
  ],
}

function damageObserver(factor: number): Trait['effects'][number] {
  return {
    category: 'triggered',
    hook: 'on-damage-observed',
    observationFilter: { relationship: 'any' },
    response: {
      kind: 'apply-stat-modifier',
      target: { kind: 'self' },
      stat: 'defence',
      factor,
    },
  }
}

function selfObserver(id: string, actionFactor: number, damageFactor: number): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook: 'on-action-observed',
        observationFilter: { relationship: 'any' },
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: actionFactor,
        },
      },
      damageObserver(damageFactor),
    ],
  }
}

export const OBSERVE_B = selfObserver('speed-change-observe-b', 1.1, 1.4)
export const OBSERVE_C = selfObserver('speed-change-observe-c', 1.2, 1.5)

export const playerParty = makeParty('player', [
  {
    id: 'a',
    health: 40,
    attack: 40,
    speed: 40,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [OBSERVE_A.id],
  },
  {
    id: 'c',
    health: 20,
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [OBSERVE_C.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'b',
    health: 100,
    defence: 10,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [OBSERVE_B.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [OBSERVE_A, OBSERVE_B, OBSERVE_C].map((t) => [t.id, t]),
)

function fires(
  id: typeof A,
  traitId: string,
  hook: 'on-action-observed' | 'on-damage-observed',
  stat: 'attack' | 'defence',
  factor: number,
  effectiveBefore: number,
  effectiveAfter: number,
): CombatEvent[] {
  return [
    { type: 'TriggerFired', sourceId: id, hook, effectId: traitId },
    {
      type: 'StatModifierApplied',
      sourceId: id,
      targetId: id,
      stat,
      factor,
      effectiveBefore,
      effectiveAfter,
    },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: B },
  // Pass 1 in the order it was taken, A, B, C, although A's response lifts C above B.
  {
    type: 'TriggerFired',
    sourceId: A,
    hook: 'on-action-observed',
    effectId: OBSERVE_A.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: A,
    targetId: C,
    stat: 'speed',
    factor: 2.5,
    effectiveBefore: 10,
    effectiveAfter: 25,
  },
  ...fires(B, OBSERVE_B.id, 'on-action-observed', 'attack', 1.1, 20, 22),
  ...fires(C, OBSERVE_C.id, 'on-action-observed', 'attack', 1.2, 20, 24),
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: B,
    rawDamage: 30.4,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 70,
    damageSource: 'attack',
  },
  // Pass 2 reads the live Speeds: A 40, C 25, B 20.
  ...fires(A, OBSERVE_A.id, 'on-damage-observed', 'defence', 1.3, 20, 26),
  ...fires(C, OBSERVE_C.id, 'on-damage-observed', 'defence', 1.5, 20, 30),
  ...fires(B, OBSERVE_B.id, 'on-damage-observed', 'defence', 1.4, 10, 14),
  { type: 'TurnEnded', creatureId: A },
]
