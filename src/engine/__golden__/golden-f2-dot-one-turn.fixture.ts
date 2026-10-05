// Golden: a 1-turn DoT ticks EXACTLY once (Phase 4.1-F2: ticks are on-turn-end triggers, run
// BEFORE the cleanup that counts the status down). Also the born-this-turn rule for ticks: a
// Poison the bearer applies to ITSELF in its own turn-end hooks (since the action slot) is born:
// it neither ticks nor counts down that turn, and ticks once at the NEXT turn end. Hand-derived.
//
// Poison: 3% of the bearer's max HP per stack per tick (data/statuses.ts) = 3 at 100 max HP.
// Round 1 queue: E1 (speed 40), A (30), S (20), E2 (10).
//   A (player) carries a trait: on-turn-start, round 1, Poison for 1 turn on all enemies (slot
//     order E1, E2). It lands in A's turn, so for E1 and E2 it is not born in their own turns.
//   S (player) carries a trait: on-turn-end, round 1, Poison for 1 turn on itself.
//   E2 (acts after A): R1 turn end tick 100 -> 97, then the countdown 1 -> 0 expires it. Once.
//   E1 (acted before A): R1 nothing; R2 turn end tick 100 -> 97, then it expires. Once.
//   S: the self-applied Poison is born in S's R1 turn -> no tick, no countdown in R1 (no events
//     at its R1 end beyond the trait). R2 turn end: tick 100 -> 97, then it expires. Once.
//   Round 3: everybody waits.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4204 // No RNG consumed; seed is inert.
export const TURN_STEPS = 12 // three rounds of four turns

const A = createCreatureId('a')
const S = createCreatureId('s')
const E1 = createCreatureId('e1')
const E2 = createCreatureId('e2')

export const POISONER_TRAIT: Trait = {
  id: 'f2-poisoner-fixture',
  name: 'Poisoner (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'poison', duration: 1 },
      },
    },
  ],
}
export const SELF_POISON_TRAIT: Trait = {
  id: 'f2-self-poison-fixture',
  name: 'Self Poison (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'poison', duration: 1 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'a',
    health: 100,
    speed: 30,
    scriptId: 'always-wait',
    innateTraitIds: [POISONER_TRAIT.id],
  },
  {
    id: 's',
    health: 100,
    speed: 20,
    scriptId: 'always-wait',
    innateTraitIds: [SELF_POISON_TRAIT.id],
  },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e1', health: 100, speed: 40, scriptId: 'always-wait' },
  { id: 'e2', health: 100, speed: 10, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [POISONER_TRAIT.id, POISONER_TRAIT],
  [SELF_POISON_TRAIT.id, SELF_POISON_TRAIT],
])
export const statuses = STATUS_REGISTRY

type Id = typeof A
const turn = (who: Id, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: Id): CombatEvent => ({ type: 'Waited', creatureId: who })
const tick = (who: Id): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: who,
  targetId: who,
  rawDamage: 3,
  finalDamage: 3,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp: 97,
  damageSource: 'dot',
  statusId: 'poison',
})
const expired = (who: Id): CombatEvent => ({
  type: 'StatusExpired',
  creatureId: who,
  statusId: 'poison',
})
const poisoned = (who: Id, sourceId: Id): CombatEvent => ({
  type: 'StatusApplied',
  targetId: who,
  statusId: 'poison',
  stacks: 1,
  duration: 1,
  sourceId,
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(E1, waited(E1)),
  ...turn(
    A,
    {
      type: 'TriggerFired',
      sourceId: A,
      hook: 'on-turn-start',
      effectId: POISONER_TRAIT.id,
    },
    poisoned(E1, A),
    poisoned(E2, A),
    waited(A),
  ),
  ...turn(
    S,
    waited(S),
    {
      type: 'TriggerFired',
      sourceId: S,
      hook: 'on-turn-end',
      effectId: SELF_POISON_TRAIT.id,
    },
    poisoned(S, S),
  ),
  ...turn(E2, waited(E2), tick(E2), expired(E2)),
  { type: 'RoundStarted', round: 2 },
  ...turn(E1, waited(E1), tick(E1), expired(E1)),
  ...turn(A, waited(A)),
  ...turn(S, waited(S), tick(S), expired(S)),
  ...turn(E2, waited(E2)),
  { type: 'RoundStarted', round: 3 },
  ...turn(E1, waited(E1)),
  ...turn(A, waited(A)),
  ...turn(S, waited(S)),
  ...turn(E2, waited(E2)),
]

export const expectedResult: FightResult | null = null
