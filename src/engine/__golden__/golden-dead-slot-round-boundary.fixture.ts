// Golden: dead entries that end a round. One resolveTurn call steps past them, runs the round-end
// pass once, starts the next round and resolves the next living creature's turn. Hand-derived;
// no RNG anywhere (seed inert).
//
// HERO (player, speed 30, HP 50, Defence 0, always-wait). Traits: SWEEP (on-turn-start: flat 5
// damage to every enemy) and ROUND_END_HERO (on-round-end: Intelligence x2 on itself).
// E (enemy, speed 40, HP 100, Defence 0, always-wait), D1 (enemy, speed 20, HP 1, Defence 0),
// D2 (enemy, speed 10, HP 1, Defence 0), both always-wait. All vitality: affinity x1.0.
//
// Round 1 queue (speed desc, frozen): [E, HERO, D1, D2].
// Call 1, E's turn: waits.
// Call 2, HERO's turn: SWEEP fires at turn start, in enemy party order E, D1, D2: flat 5 on
//   Defence 0 -> raw 5, final 5. E 100 -> 95; D1 1 -> 0 dies; D2 1 -> 0 dies. E survives, so the
//   fight goes on. HERO waits.
// Call 3: D1's slot and D2's slot are both dead, so nothing is emitted for them and the queue is
//   exhausted: the round-end pass runs once (HERO's trait: Intelligence 20 x2 = 40; E and the dead
//   have no round-end trait), no side is wiped, round 2 starts, its queue is [E, HERO] (the
//   living), and E's turn is the call's turn: it waits. The same call, so TURN_STEPS = 3.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4102 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3

const HERO = createCreatureId('hero')
const E = createCreatureId('e')
const D1 = createCreatureId('d1')
const D2 = createCreatureId('d2')

export const SWEEP: Trait = {
  id: 'dead-slot-sweep-fixture',
  name: 'Sweep (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'all-enemies' },
        flatAmount: 5,
        damageSource: 'attack',
      },
    },
  ],
}

export const ROUND_END_HERO: Trait = {
  id: 'dead-slot-round-end-fixture',
  name: 'Round End (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'intelligence',
        factor: 2,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    speed: 30,
    defence: 0,
    health: 50,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [SWEEP.id, ROUND_END_HERO.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e', speed: 40, defence: 0, health: 100, scriptId: 'always-wait' },
  { id: 'd1', speed: 20, defence: 0, health: 1, scriptId: 'always-wait' },
  { id: 'd2', speed: 10, defence: 0, health: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SWEEP.id, SWEEP],
  [ROUND_END_HERO.id, ROUND_END_HERO],
])

const sweepHit = (targetId: typeof E, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: HERO,
  targetId,
  rawDamage: 5,
  finalDamage: 5,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'attack',
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  // Call 1.
  { type: 'TurnStarted', creatureId: E },
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
  // Call 2.
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'TriggerFired', sourceId: HERO, hook: 'on-turn-start', effectId: SWEEP.id },
  sweepHit(E, 95),
  sweepHit(D1, 0),
  { type: 'CreatureDied', creatureId: D1 },
  sweepHit(D2, 0),
  { type: 'CreatureDied', creatureId: D2 },
  { type: 'Waited', creatureId: HERO },
  { type: 'TurnEnded', creatureId: HERO },
  // Call 3: D1 and D2 are skipped without a trace, then the round ends and round 2 begins.
  {
    type: 'TriggerFired',
    sourceId: HERO,
    hook: 'on-round-end',
    effectId: ROUND_END_HERO.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: HERO,
    targetId: HERO,
    stat: 'intelligence',
    factor: 2,
    effectiveBefore: 20,
    effectiveAfter: 40,
  },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: E },
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
]
