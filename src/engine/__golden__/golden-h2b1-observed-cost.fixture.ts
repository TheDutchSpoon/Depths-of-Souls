// Golden: damage observation of a COST, and the relationship filter (Phase 4.1-H2b1, ASSUMPTIONS
// 115, 132, 142). Hand-derived. A creature's own trait response damaging itself is a cost; every
// living creature then gets an `on-damage-observed` pass (hook source = the DAMAGED creature), in
// livingIds order (player slots, then enemy slots). An observer filters on `relationship` (observer
// vs the DAMAGED creature; 'ally' includes self) and `selfInflicted` (true = a cost only).
//
// Cast (all vitality, level 11 -> no Additional; every creature Attack 20, health 30):
//   Player side:  P  (speed 10, always-wait)  PAY: on-turn-start flat 6 on itself (a cost)
//                 O1 (speed 9,  always-wait)  PAY + WATCH_ALLY
//   Enemy side:   O2 (speed 2,  always-wait)  WATCH_ALLY  -- relationship 'ally', selfInflicted true
//                 O3 (speed 1,  always-wait)  WATCH_ENEMY -- relationship 'enemy', selfInflicted true
// WATCH_* respond with `apply-stat-modifier` on SELF: Attack x1.5 (a bare event that names who fired).
// TURN_STEPS = 2: P's turn, then O1's turn.
//
// P's turn: PAY's cost 6 (calculateCost(6): raw 6, final 6, affinity 1, not chip-only; 'dot' label
// because a flat response with no damageSource is tagged 'dot'): P 30 -> 24. Observers in livingIds
// order p, o1, o2, o3:
//   p  carries no observer trait.
//   o1 (ally of the damaged P, same side; selfInflicted true == the cost's true): fires. Attack
//      20 -> 30.
//   o2 (relationship 'ally' compares o2 [enemy side] to the damaged P [player side]: not allies):
//      SILENT -- the relationship filter. (Dropping it would fire o2 here.)
//   o3 (relationship 'enemy': o3 [enemy side] vs damaged P [player side]: enemies): fires. Attack
//      20 -> 30.
// O1's turn: PAY first (a trait's effects keep their order), cost 6 on O1 itself: O1 30 -> 24.
//   p: no observer trait. o1 observes ITS OWN cost ('ally' includes self): Attack 30 -> 45 (the
//   fold is base x product: 20 x 1.5 x 1.5 = 45). o2 silent (O1 is a player). o3 fires: 30 -> 45.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8201 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

const P = createCreatureId('p')
const O1 = createCreatureId('o1')
const O3 = createCreatureId('o3')

export const PAY: Trait = {
  id: 'h2b1-pay',
  name: 'Pay (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 6 },
    },
  ],
}

function watcher(id: string, relationship: 'ally' | 'enemy'): Trait {
  return {
    id,
    name: `Watch ${relationship} (fixture)`,
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-observed',
        observationFilter: { relationship, selfInflicted: true },
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 1.5,
        },
      },
    ],
  }
}

export const WATCH_ALLY = watcher('h2b1-watch-ally', 'ally')
export const WATCH_ENEMY = watcher('h2b1-watch-enemy', 'enemy')

export const playerParty = makeParty('player', [
  {
    id: 'p',
    health: 30,
    speed: 10,
    scriptId: 'always-wait',
    innateTraitIds: [PAY.id],
  },
  {
    id: 'o1',
    health: 30,
    speed: 9,
    scriptId: 'always-wait',
    innateTraitIds: [PAY.id, WATCH_ALLY.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'o2',
    health: 30,
    speed: 2,
    scriptId: 'always-wait',
    innateTraitIds: [WATCH_ALLY.id],
  },
  {
    id: 'o3',
    health: 30,
    speed: 1,
    scriptId: 'always-wait',
    innateTraitIds: [WATCH_ENEMY.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [PAY.id, PAY],
  [WATCH_ALLY.id, WATCH_ALLY],
  [WATCH_ENEMY.id, WATCH_ENEMY],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'TriggerFired', sourceId: P, hook: 'on-turn-start', effectId: PAY.id },
  {
    type: 'DamageDealt',
    sourceId: P,
    targetId: P,
    rawDamage: 6,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 24,
    damageSource: 'dot',
  },
  // o1 fires; o2 is silent (relationship); o3 fires.
  {
    type: 'TriggerFired',
    sourceId: O1,
    hook: 'on-damage-observed',
    effectId: WATCH_ALLY.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: O1,
    targetId: O1,
    stat: 'attack',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  {
    type: 'TriggerFired',
    sourceId: O3,
    hook: 'on-damage-observed',
    effectId: WATCH_ENEMY.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: O3,
    targetId: O3,
    stat: 'attack',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
  { type: 'TurnStarted', creatureId: O1 },
  { type: 'TriggerFired', sourceId: O1, hook: 'on-turn-start', effectId: PAY.id },
  {
    type: 'DamageDealt',
    sourceId: O1,
    targetId: O1,
    rawDamage: 6,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 24,
    damageSource: 'dot',
  },
  // o1 observes its OWN cost; o2 silent; o3 fires again.
  {
    type: 'TriggerFired',
    sourceId: O1,
    hook: 'on-damage-observed',
    effectId: WATCH_ALLY.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: O1,
    targetId: O1,
    stat: 'attack',
    factor: 1.5,
    effectiveBefore: 30,
    effectiveAfter: 45,
  },
  {
    type: 'TriggerFired',
    sourceId: O3,
    hook: 'on-damage-observed',
    effectId: WATCH_ENEMY.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: O3,
    targetId: O3,
    stat: 'attack',
    factor: 1.5,
    effectiveBefore: 30,
    effectiveAfter: 45,
  },
  { type: 'Waited', creatureId: O1 },
  { type: 'TurnEnded', creatureId: O1 },
]
