// Golden: the turn-end interaction -- a DoT tick kills its bearer, whose on-death spreads a
// status to another creature, which then follows the born-this-turn rule, and the win check after
// the turn-end hooks ends the fight on a tick-kill (Phase 4.1-F2). Hand-derived.
//
// H (player, speed 30, health 100) waits. HOST (enemy, speed 20, Spore, wounded to 1 HP) and MATE
// (enemy, speed 10, health 100 wounded to 8 HP) both wait. Spore (data/statuses.ts): 4% of the
// bearer's max HP per stack per turn-end tick (= 4 at 100 max HP) plus an on-death spread to a
// living, non-Spored ally. HOST's Spore is applied before any turn (turn clock 0), so never born.
//
//   Round 1 (H, HOST, MATE): H waits. HOST waits; its turn-end tick 4 kills it (1 -> 0):
//     DamageDealt, CreatureDied, then on-death fires Spore's own spread (TriggerFired, then
//     StatusApplied on MATE, applied in HOST's turn). MATE (alive) keeps the side up, so the turn
//     goes on: HOST's cleanup is skipped (a corpse's statuses are inert, no StatusExpired).
//     MATE waits; the Spore was applied in ANOTHER creature's turn, so it is not born for MATE:
//     MATE's own turn-end tick lands now: 8 -> 4, then the countdown 3 -> 2.
//   Round 2 (H, MATE; HOST is dead): H waits. MATE waits; its turn-end tick 4 -> 0 kills it.
//     CreatureDied, then on-death fires (TriggerFired; no living, non-Spored ally to spread to).
//     The enemy side is empty: the win check right after the turn-end hooks ends the fight, so
//     MATE's cleanup is skipped: TurnEnded, FightEnded win.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'

export const SEED = 4207 // The spread's random pick has a pool of one; the seed is inert.

const H = createCreatureId('h')
const HOST = createCreatureId('host')
const MATE = createCreatureId('mate')

export const playerParty = makeParty('player', [
  { id: 'h', speed: 30, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  { id: 'host', health: 100, speed: 20, scriptId: 'always-wait' },
  { id: 'mate', health: 100, speed: 10, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState => {
  let state = applyStatus(
    H,
    HOST,
    { statusId: 'spore' },
    created,
    createResolutionContext([], newCascade()),
  )
  state = updateCreature(state, HOST, { currentHp: 1 })
  return updateCreature(state, MATE, { currentHp: 8 })
}

const tick = (who: typeof H, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: who,
  targetId: who,
  rawDamage: 4,
  finalDamage: 4,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'spore',
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: H },
  { type: 'Waited', creatureId: H },
  { type: 'TurnEnded', creatureId: H },
  { type: 'TurnStarted', creatureId: HOST },
  { type: 'Waited', creatureId: HOST },
  tick(HOST, 0),
  { type: 'CreatureDied', creatureId: HOST },
  { type: 'TriggerFired', sourceId: HOST, hook: 'on-death', effectId: 'spore' },
  {
    type: 'StatusApplied',
    targetId: MATE,
    statusId: 'spore',
    stacks: 1,
    duration: 3,
    sourceId: HOST,
  },
  { type: 'TurnEnded', creatureId: HOST },
  { type: 'TurnStarted', creatureId: MATE },
  { type: 'Waited', creatureId: MATE },
  tick(MATE, 4),
  { type: 'TurnEnded', creatureId: MATE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: H },
  { type: 'Waited', creatureId: H },
  { type: 'TurnEnded', creatureId: H },
  { type: 'TurnStarted', creatureId: MATE },
  { type: 'Waited', creatureId: MATE },
  tick(MATE, 0),
  { type: 'CreatureDied', creatureId: MATE },
  { type: 'TriggerFired', sourceId: MATE, hook: 'on-death', effectId: 'spore' },
  { type: 'TurnEnded', creatureId: MATE },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
