// Golden: a Stun 1 gained in the bearer's OWN turn-start hooks skips exactly one turn (Phase
// 4.1-F2, ASSUMPTIONS 45 and 49: one born window, opened at the action slot). It skips this very
// turn (ASSUMPTION 45: the lock is read after the turn-start hooks) and, because it was applied
// BEFORE the action slot, it is not born: it counts down at this turn's own cleanup and is gone
// for the next. A whole-turn window would have kept it a second turn. Hand-derived.
//
// X (player, speed 20) carries a fixture trait: on-turn-start, round 1 only, apply Stun for 1 turn
// to itself. FOE (enemy, speed 10) waits. Three rounds.
//   Round 1: X: TriggerFired, StatusApplied(stun), TurnSkipped, then the cleanup expires the Stun.
//   Rounds 2 and 3: X acts normally (Waited).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4202 // No RNG consumed; seed is inert.
export const TURN_STEPS = 6 // three rounds of two turns

const X = createCreatureId('x')
const FOE = createCreatureId('foe')

export const SELF_STUN_TRAIT: Trait = {
  id: 'f2-self-stun-fixture',
  name: 'Self Stun (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'stun', duration: 1 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'x', speed: 20, scriptId: 'always-wait', innateTraitIds: [SELF_STUN_TRAIT.id] },
])
export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 10, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SELF_STUN_TRAIT.id, SELF_STUN_TRAIT],
])
export const statuses = STATUS_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: X },
  {
    type: 'TriggerFired',
    sourceId: X,
    hook: 'on-turn-start',
    effectId: SELF_STUN_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: X,
    statusId: 'stun',
    duration: 1,
    sourceId: X,
  },
  { type: 'TurnSkipped', creatureId: X, effectId: 'stun' },
  { type: 'StatusExpired', creatureId: X, statusId: 'stun' },
  { type: 'TurnEnded', creatureId: X },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: X },
  { type: 'Waited', creatureId: X },
  { type: 'TurnEnded', creatureId: X },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: X },
  { type: 'Waited', creatureId: X },
  { type: 'TurnEnded', creatureId: X },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
]

export const expectedResult: FightResult | null = null
