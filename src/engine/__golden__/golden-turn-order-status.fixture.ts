// Golden: the `turn-order-status` StatusDef category (Phase 4 Slice C) -- Web (act-last) /
// Blindclaws' grant-act-first (act-first), applied at fight-start via an on-fight-start
// triggered apply-status response, read PASSIVELY by buildTurnQueue (never hook-fired itself).
// Proves position beats raw Speed entirely, and that a Speed-sorted "normal" group of
// non-positioned creatures from BOTH sides sits between the two poles.
//
// Hand-derived (no formula/RNG involved -- every creature Waits, nobody takes damage):
//
//   WEBBED  (player, speed 30 -- HIGHEST raw Speed) carries act-LAST -> must still act dead last.
//   HASTY   (enemy,  speed  5 -- LOWEST  raw Speed) carries act-FIRST -> must still act first.
//   NORMAL_FAST (player, speed 20) / NORMAL_SLOW (enemy, speed 10): no turn-order-status ->
//     the "normal" pole, Speed-sorted regardless of side (20 before 10).
//
//   Expected round-1 queue: HASTY -> NORMAL_FAST -> NORMAL_SLOW -> WEBBED.
//
// Driven via 4 explicit resolveTurn steps (one full round), NOT resolveFight -- every script is
// always-wait, so the fight would otherwise run to the ROUND_CAP draw; this golden only asserts
// round 1's queue-build + turn order.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 9009 // No RNG consumed anywhere in this fixture.

const WEBBED = createCreatureId('webbed')
const NORMAL_FAST = createCreatureId('normal-fast')
const HASTY = createCreatureId('hasty')
const NORMAL_SLOW = createCreatureId('normal-slow')

export const WEB_FIXTURE_STATUS: StatusDef = {
  category: 'turn-order-status',
  statusId: 'web-fixture',
  cap: 1,
  position: 'last',
}

export const HASTE_FIXTURE_STATUS: StatusDef = {
  category: 'turn-order-status',
  statusId: 'haste-fixture',
  cap: 1,
  position: 'first',
}

export const WEBBED_TRAIT: Trait = {
  id: 'webbed-fixture',
  name: 'Webbed (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'web-fixture', duration: 3 },
      },
    },
  ],
}

export const HASTY_TRAIT: Trait = {
  id: 'hasty-fixture',
  name: 'Hasty (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'haste-fixture', duration: 3 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'webbed', speed: 30, scriptId: 'always-wait', innateTraitIds: [WEBBED_TRAIT.id] },
  { id: 'normal-fast', speed: 20, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'hasty', speed: 5, scriptId: 'always-wait', innateTraitIds: [HASTY_TRAIT.id] },
  { id: 'normal-slow', speed: 10, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [WEBBED_TRAIT.id, WEBBED_TRAIT],
  [HASTY_TRAIT.id, HASTY_TRAIT],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [WEB_FIXTURE_STATUS.statusId, WEB_FIXTURE_STATUS],
  [HASTE_FIXTURE_STATUS.statusId, HASTE_FIXTURE_STATUS],
])

export const TURN_STEPS = 4 // one full round: HASTY, NORMAL_FAST, NORMAL_SLOW, WEBBED

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  // on-fight-start fires in livingIds order (player slots then enemy slots): WEBBED, then HASTY
  // (NORMAL_FAST/NORMAL_SLOW carry no innate traits, so nothing fires for them).
  {
    type: 'TriggerFired',
    sourceId: WEBBED,
    hook: 'on-fight-start',
    effectId: 'webbed-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: WEBBED,
    statusId: 'web-fixture',
    stacks: 1,
    duration: 3,
    sourceId: WEBBED,
  },
  {
    type: 'TriggerFired',
    sourceId: HASTY,
    hook: 'on-fight-start',
    effectId: 'hasty-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: HASTY,
    statusId: 'haste-fixture',
    stacks: 1,
    duration: 3,
    sourceId: HASTY,
  },
  // Queue built AFTER the above statuses land: HASTY (act-first pole) -> NORMAL_FAST/NORMAL_SLOW
  // (normal pole, Speed-sorted 20 then 10) -> WEBBED (act-last pole), despite WEBBED's raw Speed
  // (30) being the highest of all four and HASTY's (5) the lowest.
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HASTY },
  { type: 'Waited', creatureId: HASTY },
  { type: 'TurnEnded', creatureId: HASTY },
  { type: 'TurnStarted', creatureId: NORMAL_FAST },
  { type: 'Waited', creatureId: NORMAL_FAST },
  { type: 'TurnEnded', creatureId: NORMAL_FAST },
  { type: 'TurnStarted', creatureId: NORMAL_SLOW },
  { type: 'Waited', creatureId: NORMAL_SLOW },
  { type: 'TurnEnded', creatureId: NORMAL_SLOW },
  { type: 'TurnStarted', creatureId: WEBBED },
  { type: 'Waited', creatureId: WEBBED },
  { type: 'TurnEnded', creatureId: WEBBED },
]
