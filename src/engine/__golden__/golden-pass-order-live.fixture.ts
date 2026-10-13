// Golden: a pass after the round's queue was built reads the LIVE order, not the frozen queue. Two
// scenarios on `on-round-end`. Hand-derived; seeds are inert except where noted.
//
// Every trigger here changes a stat nothing reads (Intelligence, base 20, exact factors 2, 3, 4)
// or, in `speedUp`, the Speed the order is made of.
//
// SCENARIO `speedUp`: a Speed change earlier in the round. Player P (slot 0, speed 30, round-end
//   x2), enemy E (slot 0, speed 20, round-end x3, and an `on-turn-start` trigger: Speed x3 on
//   itself). Both wait.
//   Round 1's queue is P 30, E 20 -- also side -> slot -> id. E's turn start raises its Speed
//   20 -> 60, above P's 30, so the round-end pass fires E, P: the live order. The frozen queue
//   (and the old order) would fire P, E. TURN_STEPS = 3: P's turn, E's turn, then the round-end
//   pass and round 2's first turn, E's (Speed 60 -> 180 at its turn start).
//
// SCENARIO `revived`: a creature killed in round 1 is revived in round 2, and fires in its live
//   place in round 2's round-end pass, although round 2's queue was built without it. Player U
//   (slot 0, speed 40, health 50, Attack 10, always-attack; revives a random dead ally on attack,
//   20%; round-end x2), D (slot 1, speed 20, health 20, Defence 0, always-wait; round-end x4);
//   enemy K (slot 0, speed 30, health 1000, Attack 40, Defence 0; attacks only in round 1, then
//   waits; round-end x3). All violence (every affinity multiplier x1.0).
//   Round 1, queue U 40, K 30, D 20: U attacks K (core 10, chip 0.1 -> raw 10.1 -> final 10;
//   K 1000 -> 990); its revive trigger fires with no dead ally: no target, no draw. K attacks the
//   lowest-HP enemy, D (20 < U's 50): core 40, chip 0.4 -> raw 40.4 -> final 40, D dies. D's queued
//   slot comes up dead: no turn, no bracket. Round-end pass: U, K (D is dead).
//   Round 2, queue U, K (D is dead): U attacks K (990 -> 980) and its revive trigger revives D:
//   one dead ally, so the pick draws once (value inert, index 0), D at round(20 x 0.2) = 4 HP. K
//   waits. Round-end pass: the live order U 40, K 30, D 20 -> U, K, D. The frozen queue would omit
//   D, and the old order (party arrays U, D, K) would fire D before K. TURN_STEPS = 5 adds round
//   3's first turn: U attacks (K 980 -> 970); D is alive, so its revive trigger finds no target.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

const P = createCreatureId('p')
const E = createCreatureId('e')
const U = createCreatureId('u')
const D = createCreatureId('d')
const K = createCreatureId('k')

function roundEnd(id: string, factor: number): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook: 'on-round-end',
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

export const ROUND_END_P = roundEnd('live-round-end-p', 2)
export const ROUND_END_E = roundEnd('live-round-end-e', 3)
export const ROUND_END_U = roundEnd('live-round-end-u', 2)
export const ROUND_END_K = roundEnd('live-round-end-k', 3)
export const ROUND_END_D = roundEnd('live-round-end-d', 4)

export const HASTEN: Trait = {
  id: 'live-hasten',
  name: 'Hasten (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'speed',
        factor: 3,
      },
    },
  ],
}

export const REVIVE_ON_ATTACK: Trait = {
  id: 'live-revive-on-attack',
  name: 'Revive on Attack (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
    },
  ],
}

/** Attacks in round 1 only, then waits. */
export const ATTACK_ROUND_ONE: Script = {
  id: 'attack-round-one',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}

const scripts: ReadonlyMap<string, Script> = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [ATTACK_ROUND_ONE.id, ATTACK_ROUND_ONE],
])

const traits: ReadonlyMap<string, Trait> = new Map(
  [
    ROUND_END_P,
    ROUND_END_E,
    ROUND_END_U,
    ROUND_END_K,
    ROUND_END_D,
    HASTEN,
    REVIVE_ON_ATTACK,
  ].map((t) => [t.id, t]),
)

function roundEndFires(
  id: typeof P,
  trait: Trait,
  factor: number,
  before: number,
  after: number,
): CombatEvent[] {
  return [
    { type: 'TriggerFired', sourceId: id, hook: 'on-round-end', effectId: trait.id },
    {
      type: 'StatModifierApplied',
      sourceId: id,
      targetId: id,
      stat: 'intelligence',
      factor,
      effectiveBefore: before,
      effectiveAfter: after,
    },
  ]
}

const hastens = (before: number, after: number): CombatEvent[] => [
  { type: 'TriggerFired', sourceId: E, hook: 'on-turn-start', effectId: HASTEN.id },
  {
    type: 'StatModifierApplied',
    sourceId: E,
    targetId: E,
    stat: 'speed',
    factor: 3,
    effectiveBefore: before,
    effectiveAfter: after,
  },
]

export const speedUp = {
  SEED: 9509, // No RNG consumed; seed is inert.
  TURN_STEPS: 3,
  playerParty: makeParty('player', [
    {
      id: 'p',
      speed: 30,
      affinity: 'vitality',
      scriptId: 'always-wait',
      innateTraitIds: [ROUND_END_P.id],
    },
  ]),
  enemyParty: makeParty('enemy', [
    {
      id: 'e',
      speed: 20,
      affinity: 'vitality',
      scriptId: 'always-wait',
      innateTraitIds: [HASTEN.id, ROUND_END_E.id],
    },
  ]),
  scripts,
  traits,
}

export const speedUpExpected: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
  { type: 'TurnStarted', creatureId: E },
  ...hastens(20, 60),
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
  // Round-end pass on the live Speeds, E 60 then P 30.
  ...roundEndFires(E, ROUND_END_E, 3, 20, 60),
  ...roundEndFires(P, ROUND_END_P, 2, 20, 40),
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: E },
  ...hastens(60, 180),
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
]

export const revived = {
  SEED: 9510, // One inert draw: the revive pick among a pool of one.
  TURN_STEPS: 5,
  playerParty: makeParty('player', [
    {
      id: 'u',
      health: 50,
      attack: 10,
      speed: 40,
      affinity: 'violence',
      scriptId: 'always-attack',
      innateTraitIds: [REVIVE_ON_ATTACK.id, ROUND_END_U.id],
    },
    {
      id: 'd',
      health: 20,
      defence: 0,
      speed: 20,
      affinity: 'violence',
      scriptId: 'always-wait',
      innateTraitIds: [ROUND_END_D.id],
    },
  ]),
  enemyParty: makeParty('enemy', [
    {
      id: 'k',
      health: 1000,
      attack: 40,
      defence: 0,
      speed: 30,
      affinity: 'violence',
      scriptId: ATTACK_ROUND_ONE.id,
      innateTraitIds: [ROUND_END_K.id],
    },
  ]),
  scripts,
  traits,
}

const uAttacksK = (): CombatEvent[] => [
  { type: 'AttackDeclared', attackerId: U, targetId: K },
  {
    type: 'TriggerFired',
    sourceId: U,
    hook: 'on-attack',
    effectId: REVIVE_ON_ATTACK.id,
  },
]

const hitOnK = (remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: U,
  targetId: K,
  rawDamage: 10.1,
  finalDamage: 10,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'attack',
})

export const revivedExpected: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: U },
  ...uAttacksK(),
  hitOnK(990),
  { type: 'TurnEnded', creatureId: U },
  { type: 'TurnStarted', creatureId: K },
  { type: 'AttackDeclared', attackerId: K, targetId: D },
  {
    type: 'DamageDealt',
    sourceId: K,
    targetId: D,
    rawDamage: 40.4,
    finalDamage: 40,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: D },
  { type: 'TurnEnded', creatureId: K },
  // Round-1 end: D is dead, so U then K.
  ...roundEndFires(U, ROUND_END_U, 2, 20, 40),
  ...roundEndFires(K, ROUND_END_K, 3, 20, 60),
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: U },
  ...uAttacksK(),
  { type: 'Revived', sourceId: U, targetId: D, currentHp: 4 },
  hitOnK(980),
  { type: 'TurnEnded', creatureId: U },
  { type: 'TurnStarted', creatureId: K },
  { type: 'Waited', creatureId: K },
  { type: 'TurnEnded', creatureId: K },
  // Round-2 end, the live order U 40, K 30, D 20: D fires although the queue lacks it.
  ...roundEndFires(U, ROUND_END_U, 2, 40, 80),
  ...roundEndFires(K, ROUND_END_K, 3, 60, 180),
  ...roundEndFires(D, ROUND_END_D, 4, 20, 80),
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: U },
  ...uAttacksK(),
  hitOnK(970),
  { type: 'TurnEnded', creatureId: U },
]
