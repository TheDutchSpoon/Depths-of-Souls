// Golden: Web's break-free rolls are drawn in turn order. Two Webbed bearers whose turn order
// differs from side -> slot -> id: the draws go to the faster one first. Hand-derived.
//
// Cast (all vitality, every script always-wait):
//   Player side: P (slot 0, speed 10, Webbed), N (slot 1, speed 20, not Webbed)
//   Enemy side:  E (slot 0, speed 30, Webbed)
// Each bearer applies the fixture Web (act-last, 50% break-free per turn, duration 99) to itself at
// fight start. The fight-start pass is by Speed (no status yet): E 30, N 20, P 10.
//
// Round 1's queue: N (the normal group) first; then the act-last pole, E (30) before P (10) by
// Speed. Side -> slot -> id would put P before E. TURN_STEPS = 1 runs N's turn; its turn-end
// cleanup rolls every Web once (both were applied at fight start, not this turn), the bearers in
// turn order: E, then P.
//
// Draws (independent mulberry32 trace, seed 9506): 0.423153, 0.668858.
//   E rolls first: 0.423153 < 0.50 -> E breaks free (StatusExpired for E).
//   P rolls second: 0.668858 >= 0.50 -> P keeps its Web.
// In side -> slot -> id order P would take 0.423153 and break free instead, and E would keep its
// Web.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 9506
export const TURN_STEPS = 1

const P = createCreatureId('p')
const N = createCreatureId('n')
const E = createCreatureId('e')

const WEB_STATUS_ID = 'web-order-fixture'

export const WEB_ORDER_STATUS: StatusDef = {
  statusId: WEB_STATUS_ID,
  polarity: 'debuff',
  defaultDuration: 99,
  effects: [{ category: 'turn-order', position: 'last', breakChancePercent: 50 }],
}

export const WEB_SELF: Trait = {
  id: 'web-order-self',
  name: 'Web Self (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: WEB_STATUS_ID, duration: 99 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'p',
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [WEB_SELF.id],
  },
  { id: 'n', speed: 20, affinity: 'vitality', scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'e',
    speed: 30,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [WEB_SELF.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([[WEB_SELF.id, WEB_SELF]])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [WEB_ORDER_STATUS.statusId, WEB_ORDER_STATUS],
])

function webs(id: typeof P): CombatEvent[] {
  return [
    { type: 'TriggerFired', sourceId: id, hook: 'on-fight-start', effectId: WEB_SELF.id },
    {
      type: 'StatusApplied',
      targetId: id,
      statusId: WEB_STATUS_ID,
      duration: 99,
      sourceId: id,
    },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  // Fight start, by Speed: E (30) before P (10).
  ...webs(E),
  ...webs(P),
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: N },
  { type: 'Waited', creatureId: N },
  // The rolls: E first (0.423153 < 0.50, breaks free), then P (0.668858, keeps it: no event).
  { type: 'StatusExpired', creatureId: E, statusId: WEB_STATUS_ID },
  { type: 'TurnEnded', creatureId: N },
]
