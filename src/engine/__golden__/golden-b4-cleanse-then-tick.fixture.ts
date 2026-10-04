// Golden: B4's exact-instance rule (Phase 4.1-B, PR #69 review R5) -- an earlier candidate in the
// SAME on-turn-end hook pass removes a status whose own trigger was captured, unfired, in that
// same pass. Without the exact-instance check, the tick's stale candidate would still fire even
// though its status instance no longer exists on the creature by the time its own turn in the
// candidate list comes.
//
// BEARER's one trait carries BOTH halves: an on-fight-start effect that applies a DoT-shaped
// status to itself, and an on-turn-end effect that removes that SAME status. Both are baseline
// effects (one trait), instantiated -- and ordered -- at fight setup: [apply-status trigger,
// remove-status trigger]. The status's own on-turn-end tick is appended to activeEffects only
// once fight-start actually applies it, AFTER both trait effects. So BEARER's on-turn-end
// candidate list (effectsForHook, built once at the top of BEARER's pass) is, in order:
// [remove-status trigger (trait effect 2), the status's own tick trigger]. The remove-status
// trigger fires FIRST (removes the status); by the time the tick's candidate comes up, its exact
// owning instance is already gone -- it never fires, not even TriggerFired, and no DamageDealt is
// ever emitted for it.
//
// Both scripted always-wait; BEARER is faster so it acts first. No chancePercent anywhere, so
// this fixture is deterministic regardless of seed -- SEED is arbitrary.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 1
export const TURN_STEPS = 1

const BEARER = createCreatureId('bearer')

const TICK_STATUS_ID = 'b4-golden-tick'

export const TICK_STATUS: StatusDef = {
  statusId: TICK_STATUS_ID,
  cap: 1,
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: 5,
        damageSource: 'dot',
      },
    },
  ],
  polarity: 'debuff',
  defaultDuration: 3,
}

export const CLEANSE_THEN_TICK_TRAIT: Trait = {
  id: 'b4-cleanse-then-tick-fixture',
  name: 'Cleanse Then Tick (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: TICK_STATUS_ID, duration: 3 },
      },
    },
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'remove-status',
        target: { kind: 'self' },
        filter: { statusId: TICK_STATUS_ID },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'bearer',
    speed: 20,
    scriptId: 'always-wait',
    innateTraitIds: [CLEANSE_THEN_TICK_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [CLEANSE_THEN_TICK_TRAIT.id, CLEANSE_THEN_TICK_TRAIT],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [TICK_STATUS.statusId, TICK_STATUS],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-fight-start',
    effectId: CLEANSE_THEN_TICK_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: TICK_STATUS_ID,
    stacks: 1,
    duration: 3,
    sourceId: BEARER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Waited', creatureId: BEARER },
  // Phase 4.1-C (D6): on-turn-end hooks fire BEFORE TurnEnded now (TurnEnded is always the
  // turn's last event).
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-turn-end',
    effectId: CLEANSE_THEN_TICK_TRAIT.id,
  },
  { type: 'StatusExpired', creatureId: BEARER, statusId: TICK_STATUS_ID },
  // No second TriggerFired, no DamageDealt: the tick's candidate was captured before the
  // cleanser ran, but its exact owning instance is gone by the time its own turn in the
  // candidate list comes -- B4's exact-instance check skips it silently.
  { type: 'TurnEnded', creatureId: BEARER },
]
