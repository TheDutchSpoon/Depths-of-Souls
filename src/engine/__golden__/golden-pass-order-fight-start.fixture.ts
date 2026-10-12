// Golden: the `on-fight-start` pass fires in turn order, which is read from the live creatures --
// there is no turn queue yet at fight start. Two creatures with a fight-start trigger, a fast enemy
// and a slow player creature. Hand-derived; no RNG is consumed (the seed is inert).
//
// Cast (all vitality, every script always-wait):
//   Player side: S (slot 0, speed 10, carries a fight-start trigger)
//   Enemy side:  F (slot 0, speed 30, carries a fight-start trigger)
// Turn order (descending Speed): F 30, S 10. Side -> slot -> id order is S, F, so the old order
// fired S first. The queue is empty until round 1 starts, so a pass that read it would fire nobody.
//
// Each trigger raises its bearer's Intelligence (20), which nothing reads: F x1.1 = 22, S x1.2 = 24.
// TURN_STEPS = 1 runs the first turn, F's (the fastest), after the fight-start pass.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9508 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const S = createCreatureId('s')
const F = createCreatureId('f')

function startTrait(id: string, factor: number): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook: 'on-fight-start',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'intelligence',
          factor,
        },
      },
    ],
  }
}

export const START_FAST = startTrait('fight-start-order-fast', 1.1)
export const START_SLOW = startTrait('fight-start-order-slow', 1.2)

export const playerParty = makeParty('player', [
  {
    id: 's',
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [START_SLOW.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'f',
    speed: 30,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [START_FAST.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [START_FAST, START_SLOW].map((t) => [t.id, t]),
)

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  // The faster enemy first.
  { type: 'TriggerFired', sourceId: F, hook: 'on-fight-start', effectId: START_FAST.id },
  {
    type: 'StatModifierApplied',
    sourceId: F,
    targetId: F,
    stat: 'intelligence',
    factor: 1.1,
    effectiveBefore: 20,
    effectiveAfter: 22,
  },
  { type: 'TriggerFired', sourceId: S, hook: 'on-fight-start', effectId: START_SLOW.id },
  {
    type: 'StatModifierApplied',
    sourceId: S,
    targetId: S,
    stat: 'intelligence',
    factor: 1.2,
    effectiveBefore: 20,
    effectiveAfter: 24,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: F },
  { type: 'Waited', creatureId: F },
  { type: 'TurnEnded', creatureId: F },
]
