// Golden: B4's exact-instance rule (Phase 4.1-B, PR #69 review R5) -- a status removed AND
// reapplied within the SAME hook pass gets a genuinely new instance; the OLD instance's own
// pending trigger candidate (captured before either happened) must not fire.
//
// BEARER's one trait carries THREE effects, instantiated -- and ordered -- at fight setup:
// [1: on-fight-start apply-status (seeds the initial tick status), 2: on-turn-end remove-status
// (same statusId), 3: on-turn-end apply-status (same statusId, a FRESH instance)]. The initial
// tick status (from effect 1) is appended to activeEffects only once fight-start fires, AFTER all
// three trait effects. So BEARER's on-turn-end candidate list is, in order: [effect 2 (remove),
// effect 3 (apply-fresh), the OLD status's own tick trigger]. Effect 2 fires first (removes the
// old instance); effect 3 fires next (applies a brand-new instance, a fresh id from the shared
// counter -- B4); by the time the OLD tick candidate comes up, its exact owning instance is gone
// (a genuinely different instance now occupies the same statusId slot) -- it never fires, not
// even TriggerFired, and no DamageDealt is ever emitted. (The new instance's id being provably
// DIFFERENT from the old one is covered by resolution.test.ts's own unit test, which can inspect
// instance ids directly -- not visible from the event log alone.)
//
// Both scripted always-wait; BEARER is faster so it acts first. No chancePercent anywhere, so
// this fixture is deterministic regardless of seed -- SEED is arbitrary.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 1
export const TURN_STEPS = 1

const BEARER = createCreatureId('bearer')

const TICK_STATUS_ID = 'b4-golden-tick-2'

export const TICK_STATUS: StatusDef = {
  statusId: TICK_STATUS_ID,
  potency: { ofStat: 'attack', percent: 25 },
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
        damageSource: 'dot',
      },
    },
  ],
  polarity: 'debuff',
  defaultDuration: 3,
}

export const REMOVE_THEN_REAPPLY_TRAIT: Trait = {
  id: 'b4-remove-then-reapply-fixture',
  name: 'Remove Then Reapply (fixture)',
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
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: TICK_STATUS_ID, duration: 3 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'bearer',
    speed: 20,
    scriptId: 'always-wait',
    innateTraitIds: [REMOVE_THEN_REAPPLY_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [REMOVE_THEN_REAPPLY_TRAIT.id, REMOVE_THEN_REAPPLY_TRAIT],
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
    effectId: REMOVE_THEN_REAPPLY_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: TICK_STATUS_ID,
    duration: 3,
    sourceId: BEARER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Waited', creatureId: BEARER },
  // Phase 4.1-C (D6): on-turn-end hooks fire BEFORE TurnEnded now (TurnEnded is always the
  // turn's last event).
  // Candidate 1 (effect 2, remove): fires -- the OLD instance is gone.
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-turn-end',
    effectId: REMOVE_THEN_REAPPLY_TRAIT.id,
  },
  { type: 'StatusExpired', creatureId: BEARER, statusId: TICK_STATUS_ID },
  // Candidate 2 (effect 3, apply-fresh): fires -- a brand-new instance replaces it.
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-turn-end',
    effectId: REMOVE_THEN_REAPPLY_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: TICK_STATUS_ID,
    duration: 3,
    sourceId: BEARER,
  },
  // Candidate 3 (the OLD status's own tick, captured before either of the above ran): skipped
  // silently -- its exact owning instance no longer exists. No third TriggerFired, no
  // DamageDealt.
  { type: 'TurnEnded', creatureId: BEARER },
]
