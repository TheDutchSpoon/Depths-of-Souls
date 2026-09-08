// Golden: Creature.defendCount + the `magnitudeSource` count-scaling primitive on a
// `damage-modifier` status (Phase 4 Slice D, Bulwark-SHAPED -- a fixture mechanism demo, not the
// real Bulwark data from specializations/shieldbarer.md, which is Slice F's job).
//
// BEARER's trait applies a permanent (duration 10, never re-applied) `taken`-direction
// damage-modifier ONCE at fight-start, whose `magnitude` (0.95) is raised to the power of a LIVE
// `self-defend-count` reading instead of the status's own (frozen at 1) `stacks` -- so the taken
// factor keeps shrinking round-over-round purely from BEARER defending again, with no
// re-application needed ("mitigation improves round-over-round as the bearer keeps defending").
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
// BEARER is faster (defends first each round, so it's already `defending` when hit that same
// round); STRIKER always attacks BEARER.
//
//   Round 1 (defendCount 1 by the time STRIKER's hit lands):
//     off 40, effDef 10*1.5=15 (defending): core 25, chip 0.01*40=0.4 -> core+chip 25.4.
//     takenFactors: Defend 0.65 * bulwark(0.95**1 = 0.95) = 0.6174999999999999.
//     raw = 25.4 * 0.6174999999999999 = 15.684499999999998 -> final 15.
//     BEARER health 29 - 15 -> 14, alive.
//   Round 2 (defendCount 2):
//     takenFactors: 0.65 * bulwark(0.95**2 = 0.9025) = 0.586625.
//     raw = 25.4 * 0.586625 = 14.900274999999999 -> final 14.
//     BEARER health 14 - 14 -> 0 -> dies. Fight ends mid-round (before round 2's own
//     round-end sweep) -- STRIKER's side wins.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { DamageModifierDef, Trait } from '../effect-types'

export const SEED = 1001 // No RNG consumed; seed is inert.

const BEARER = createCreatureId('bearer')
const STRIKER = createCreatureId('striker')

const BULWARK_STATUS_ID = 'bulwark-fixture-status'

export const BULWARK_FIXTURE: Trait = {
  id: 'bulwark-fixture',
  name: 'Bulwark (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: BULWARK_STATUS_ID, duration: 10 },
      },
    },
  ],
}

export const BULWARK_STATUS: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: BULWARK_STATUS_ID,
  cap: 1, // applied exactly once -- magnitudeSource, not re-application, drives the scaling
  direction: 'taken',
  magnitude: 0.95,
  magnitudeSource: { kind: 'count', of: 'self-defend-count' },
}

export const playerParty = makeParty('player', [
  {
    id: 'bearer',
    health: 29,
    defence: 10,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-defend',
    innateTraitIds: ['bulwark-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'striker',
    attack: 40,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [BULWARK_FIXTURE.id, BULWARK_FIXTURE],
])
export const statuses = new Map([[BULWARK_STATUS.statusId, BULWARK_STATUS]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-fight-start',
    effectId: 'bulwark-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: BULWARK_STATUS_ID,
    stacks: 1,
    duration: 10,
    sourceId: BEARER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Defended', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: BEARER },
  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: BEARER },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: BEARER,
    rawDamage: 15.684499999999998,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 14,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Defended', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: BEARER },
  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: BEARER },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: BEARER,
    rawDamage: 14.900274999999999,
    finalDamage: 14,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'FightEnded', result: 'loss' },
]

export const expectedResult: FightResult = 'loss'
