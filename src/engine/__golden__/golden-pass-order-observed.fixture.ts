// Golden: the observation hooks fire in turn order (`on-action-observed` and `on-damage-observed`
// on one attack), a faster enemy ahead of a slower player creature. Hand-derived; no RNG is
// consumed (the seed is inert).
//
// Cast (all violence, so every affinity multiplier is x1.0; level 11 -> no Additional):
//   Player side: S (slot 0, speed 10, observer), A (slot 1, speed 40, Attack 40, always-attack)
//   Enemy side:  F (slot 0, speed 30, observer, health 100), T (slot 1, speed 20, health 60,
//                Defence 10, always-wait)
// Turn order, descending Speed: A 40, F 30, T 20, S 10. Side -> slot -> id order, which is also
// the order of the party arrays: S, A, F, T. S and F disagree, which is what the golden shows.
//
// A is the fastest, so TURN_STEPS = 1 runs only its turn. It attacks the lowest-HP enemy: F has
// 100, T has 60 -> T. The observers carry `relationship: 'any'`, so both match every event.
//   F: on-action-observed -> Attack x1.1 (20 -> 22); on-damage-observed -> Defence x1.2 (20 -> 24)
//   S: on-action-observed -> Attack x1.3 (20 -> 26); on-damage-observed -> Defence x1.4 (20 -> 28)
// Each observer changes a stat of its own that nothing in this fight reads, so neither pass moves
// the order.
//
// Hit on T (core 40 - 10 = 30, chip 0.01 x 40 = 0.4 -> raw 30.4 -> final 30): T 60 -> 30.
//
// The `on-action-observed` pass runs before the hit, the `on-damage-observed` pass after it. Each
// pass fires F then S; the old order fired S then F.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9501 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const A = createCreatureId('a')
const S = createCreatureId('s')
const F = createCreatureId('f')
const T = createCreatureId('t')

function observer(id: string, actionFactor: number, damageFactor: number): Trait {
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
      {
        category: 'triggered',
        hook: 'on-damage-observed',
        observationFilter: { relationship: 'any' },
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'defence',
          factor: damageFactor,
        },
      },
    ],
  }
}

export const OBSERVE_FAST = observer('pass-order-observe-fast', 1.1, 1.2)
export const OBSERVE_SLOW = observer('pass-order-observe-slow', 1.3, 1.4)

export const playerParty = makeParty('player', [
  {
    id: 's',
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [OBSERVE_SLOW.id],
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
    speed: 30,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [OBSERVE_FAST.id],
  },
  {
    id: 't',
    health: 60,
    defence: 10,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [OBSERVE_FAST, OBSERVE_SLOW].map((t) => [t.id, t]),
)

function fires(
  id: typeof F,
  traitId: string,
  hook: 'on-action-observed' | 'on-damage-observed',
  stat: 'attack' | 'defence',
  factor: number,
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
      effectiveBefore: 20,
      effectiveAfter,
    },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: T },
  // on-action-observed: the faster enemy F, then the slower player creature S.
  ...fires(F, OBSERVE_FAST.id, 'on-action-observed', 'attack', 1.1, 22),
  ...fires(S, OBSERVE_SLOW.id, 'on-action-observed', 'attack', 1.3, 26),
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: T,
    rawDamage: 30.4,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 30,
    damageSource: 'attack',
  },
  // on-damage-observed: F again ahead of S.
  ...fires(F, OBSERVE_FAST.id, 'on-damage-observed', 'defence', 1.2, 24),
  ...fires(S, OBSERVE_SLOW.id, 'on-damage-observed', 'defence', 1.4, 28),
  { type: 'TurnEnded', creatureId: A },
]
