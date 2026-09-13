// Golden: Web's break-free roll (Phase 4 Slice E2) -- a per-GLOBAL-turn chance rolled at EVERY
// creature's turn-start against every current Web-bearer (TurnOrderStatusDef.breakChancePercent),
// NOT the bearer's own hook. Fixture-shaped, not real Web content (that's H1's job).
//
// Hand-derived (independent `node -e` mulberry32 trace against rng.ts's exact algorithm). BEARER
// applies Web to itself via an on-fight-start trait (a fixture stand-in for "starts the fight
// webbed"); Web's act-last pole pins BEARER's turn-queue position to LAST regardless of raw
// Speed, so the queue is [OTHER, BEARER] every round. No other mechanism in this fixture
// consumes RNG (both scripted always-wait, no provoke/confusion), so the break-free roll at
// OTHER's very first TurnStarted is provably the very first draw of the fight.
//
// SEED 7's first draw is 0.0117... (< 50/100 -> the roll SUCCEEDS) -- BEARER's Web breaks free
// at OTHER's OWN turn-start, before OTHER even acts. By the time BEARER's own turn starts, Web
// is already gone, so no further roll happens for it that turn (0 further RNG draws this
// fixture -- only ever the one roll, confirmed by the RNG-counter unit tests in combat.test.ts).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 7

const OTHER = createCreatureId('other')
const BEARER = createCreatureId('bearer')

const WEB_STATUS_ID = 'web-test-fixture'

export const WEB_TEST_STATUS: StatusDef = {
  category: 'turn-order-status',
  statusId: WEB_STATUS_ID,
  cap: 1,
  position: 'last',
  breakChancePercent: 50,
  polarity: 'debuff',
}

export const WEB_SELF_FIXTURE: Trait = {
  id: 'web-self-fixture',
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
    id: 'bearer',
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: ['web-self-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'other', speed: 10, affinity: 'vitality', scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [WEB_SELF_FIXTURE.id, WEB_SELF_FIXTURE],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [WEB_TEST_STATUS.statusId, WEB_TEST_STATUS],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-fight-start',
    effectId: 'web-self-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: WEB_STATUS_ID,
    stacks: 1,
    duration: 99,
    sourceId: BEARER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: OTHER },
  { type: 'StatusExpired', creatureId: BEARER, statusId: WEB_STATUS_ID },
  { type: 'Waited', creatureId: OTHER },
  { type: 'TurnEnded', creatureId: OTHER },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Waited', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: BEARER },
]
