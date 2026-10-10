// Golden: Spore's spread passes the dying bearer's WHOLE snapshot on (Phase 4.1-H2b2, ASSUMPTIONS
// 113, 143, 145). The spread is the status's own `on-death` effect applying that same status, so
// the engine copies the firing instance's snapshot (applier id, affinity, potency) onto the new
// host, instead of snapshotting the dying bearer fresh.
//
// Hand-derived (independent `node -e` calculator). Player: A (the original applier; Speed 100,
// VITALITY). Enemies: HOST (Speed 20, health 100 wounded to 1, VIOLENCE) and MATE (Speed 10,
// Defence 20, health 100, VIOLENCE). A applies Spore to HOST before any
// turn (turn clock 0, never born): snapshot = applier A, vitality, potency 15% of A's Speed =
// floor(100 x 15 / 100) = 15. Vitality beats violence: x1.25. Defence 20 -> 0.2 x 20 = 4:
// tick = 15 x 1.25 - 4 = 18.75 - 4 = 14.75 -> floor 14.
//
//   R1 A waits. R1 HOST turn end: tick 14.75 -> 14, source A (alive), HOST 1 -> 0, dies.
//   CreatureDied(HOST); Spore's own on-death spread fires (TriggerFired) and picks MATE (the only
//   living non-Spored ally; a pool of one): StatusApplied(MATE, spore, duration 3, source HOST),
//   carrying A / vitality / 15. R1 MATE turn end: not born (applied in HOST's turn): tick 14.75 ->
//   14, source A, MATE 100 -> 86. R2: MATE's turn end: 86 -> 72.
//   (A fresh snapshot from the dying HOST would be potency floor(20 x 15 / 100) = 3, affinity
//   violence: 3 x 1.0 - 4 = -1 -> the minimum 1, sourced from HOST.)
// TURN_STEPS = 5 (A, HOST, MATE in round 1; A, MATE in round 2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { holdPotency } from '../__fixtures__/held-statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'

export const SEED = 8309 // The spread's random pick has a pool of one; the seed is inert.
export const TURN_STEPS = 5

const A = createCreatureId('a')
const HOST = createCreatureId('host')
const MATE = createCreatureId('mate')

export const playerParty = makeParty('player', [
  { id: 'a', speed: 100, affinity: 'vitality', scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  { id: 'host', health: 100, speed: 20, affinity: 'violence', scriptId: 'always-wait' },
  {
    id: 'mate',
    health: 100,
    defence: 20,
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
// Pinned at Spore 15% of Speed, the value this golden's arithmetic uses (4.1-H2d, ASSUMPTION 147: tuning
// never changes a mechanism golden). The status is otherwise the real one.
export const statuses = holdPotency(STATUS_REGISTRY, { spore: 15 })

export const setup = (created: CombatState): CombatState => {
  const state = applyStatus(
    A,
    HOST,
    { statusId: 'spore' },
    created,
    createResolutionContext([], newCascade()),
  )
  return updateCreature(state, HOST, { currentHp: 1 })
}

type Id = typeof A
const turn = (who: Id, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: Id): CombatEvent => ({ type: 'Waited', creatureId: who })
const tick = (target: Id, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: A,
  targetId: target,
  rawDamage: 14.75,
  finalDamage: 14,
  affinityMultiplier: 1.25,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'spore',
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(A, waited(A)),
  ...turn(
    HOST,
    waited(HOST),
    tick(HOST, 0),
    { type: 'CreatureDied', creatureId: HOST },
    { type: 'TriggerFired', sourceId: HOST, hook: 'on-death', effectId: 'spore' },
    {
      type: 'StatusApplied',
      targetId: MATE,
      statusId: 'spore',
      duration: 3,
      sourceId: HOST,
    },
  ),
  ...turn(MATE, waited(MATE), tick(MATE, 86)),
  { type: 'RoundStarted', round: 2 },
  ...turn(A, waited(A)),
  ...turn(MATE, waited(MATE), tick(MATE, 72)),
]

export const expectedResult: FightResult | null = null
