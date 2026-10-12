// Golden: an act-first and an act-last status move a creature's place in a hook pass, against its
// Speed. Hand-derived; no RNG is consumed (the seed is inert). The statuses carry a `turn-order`
// effect and no `breakChancePercent`, so no cleanup draws a break-free roll: the golden pins the
// poles only.
//
// Cast (all violence -> every affinity multiplier x1.0; level 11 -> no Additional):
//   Player side: FAST (slot 0, speed 40, health 100) -- applies an act-LAST status to itself
//                MID  (slot 1, speed 20, health 60, Defence 10)
//   Enemy side:  SLOW (slot 0, speed 5, Attack 40, always-attack) -- applies an act-FIRST status
//                NORM (slot 1, speed 10)
// All four carry an `on-action-observed` trait (`relationship: 'any'`) that raises the bearer's own
// Intelligence, a stat nothing in this fight reads, by a factor distinct to the creature.
//
// Three orders of the same four creatures once the statuses are on:
//   by Speed:                 FAST 40, MID 20, NORM 10, SLOW 5
//   side -> slot -> id:       FAST, MID, SLOW, NORM
//   turn order (the poles):   SLOW (act-first), MID 20, NORM 10, FAST (act-last)
// Neither of the other two orders puts SLOW first or FAST last.
//
// The fight-start pass runs before any status exists, so it is by Speed: FAST (40), MID, NORM,
// SLOW (5). Only FAST and SLOW carry a fight-start trait: each applies its status to itself
// (duration 99). SLOW's act-first status puts it first in round 1, so TURN_STEPS = 1 runs its turn.
//
// SLOW attacks the lowest-HP enemy: MID (60) beats FAST (100). Hit on MID: core 40 - 10 = 30, chip
// 0.01 x 40 = 0.4 -> raw 30.4 -> final 30; MID 60 -> 30. The `on-action-observed` pass comes before
// the hit and fires in the order SLOW, MID, NORM, FAST, each Intelligence 20 x factor: SLOW x1.1 =
// 22, MID x1.2 = 24, NORM x1.3 = 26, FAST x1.4 = 28.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 9502 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const FAST = createCreatureId('fast')
const MID = createCreatureId('mid')
const SLOW = createCreatureId('slow')
const NORM = createCreatureId('norm')

export const LAST_STATUS: StatusDef = {
  statusId: 'pole-last-fixture',
  polarity: 'debuff',
  defaultDuration: 99,
  effects: [{ category: 'turn-order', position: 'last' }],
}

export const FIRST_STATUS: StatusDef = {
  statusId: 'pole-first-fixture',
  polarity: 'buff',
  defaultDuration: 99,
  effects: [{ category: 'turn-order', position: 'first' }],
}

function selfStatus(id: string, statusId: string): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook: 'on-fight-start',
        response: {
          kind: 'apply-status',
          target: { kind: 'self' },
          status: { statusId, duration: 99 },
        },
      },
    ],
  }
}

export const GO_LAST = selfStatus('pole-go-last', LAST_STATUS.statusId)
export const GO_FIRST = selfStatus('pole-go-first', FIRST_STATUS.statusId)

function observer(id: string, factor: number): Trait {
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
          stat: 'intelligence',
          factor,
        },
      },
    ],
  }
}

export const OBSERVE_FAST = observer('pole-observe-fast', 1.4)
export const OBSERVE_MID = observer('pole-observe-mid', 1.2)
export const OBSERVE_SLOW = observer('pole-observe-slow', 1.1)
export const OBSERVE_NORM = observer('pole-observe-norm', 1.3)

export const playerParty = makeParty('player', [
  {
    id: 'fast',
    health: 100,
    speed: 40,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [GO_LAST.id, OBSERVE_FAST.id],
  },
  {
    id: 'mid',
    health: 60,
    defence: 10,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [OBSERVE_MID.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'slow',
    speed: 5,
    attack: 40,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [GO_FIRST.id, OBSERVE_SLOW.id],
  },
  {
    id: 'norm',
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [OBSERVE_NORM.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [GO_LAST, GO_FIRST, OBSERVE_FAST, OBSERVE_MID, OBSERVE_SLOW, OBSERVE_NORM].map((t) => [
    t.id,
    t,
  ]),
)
export const statuses: ReadonlyMap<string, StatusDef> = new Map(
  [LAST_STATUS, FIRST_STATUS].map((s) => [s.statusId, s]),
)

function selfApplies(id: typeof FAST, traitId: string, statusId: string): CombatEvent[] {
  return [
    { type: 'TriggerFired', sourceId: id, hook: 'on-fight-start', effectId: traitId },
    { type: 'StatusApplied', targetId: id, statusId, duration: 99, sourceId: id },
  ]
}

function observes(id: typeof FAST, traitId: string, factor: number, after: number) {
  return [
    { type: 'TriggerFired', sourceId: id, hook: 'on-action-observed', effectId: traitId },
    {
      type: 'StatModifierApplied',
      sourceId: id,
      targetId: id,
      stat: 'intelligence',
      factor,
      effectiveBefore: 20,
      effectiveAfter: after,
    },
  ] satisfies CombatEvent[]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  // Fight start, by Speed (no status yet): FAST before SLOW.
  ...selfApplies(FAST, GO_LAST.id, LAST_STATUS.statusId),
  ...selfApplies(SLOW, GO_FIRST.id, FIRST_STATUS.statusId),
  { type: 'RoundStarted', round: 1 },
  // SLOW's act-first status: it acts first despite the lowest Speed.
  { type: 'TurnStarted', creatureId: SLOW },
  { type: 'AttackDeclared', attackerId: SLOW, targetId: MID },
  // The observation pass: act-first SLOW, then MID (20) and NORM (10) by Speed, then the act-last
  // FAST, whose Speed (40) is the highest.
  ...observes(SLOW, OBSERVE_SLOW.id, 1.1, 22),
  ...observes(MID, OBSERVE_MID.id, 1.2, 24),
  ...observes(NORM, OBSERVE_NORM.id, 1.3, 26),
  ...observes(FAST, OBSERVE_FAST.id, 1.4, 28),
  {
    type: 'DamageDealt',
    sourceId: SLOW,
    targetId: MID,
    rawDamage: 30.4,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 30,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: SLOW },
]
