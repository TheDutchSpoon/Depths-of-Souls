// Golden: Pollinators' Pollenlord (data/traits.ts's POLLINATOR_POLLENLORD_TRAIT) -- a team-wide
// Speed buff that repeats every time Pollenlord's own turn starts, distinct from Duster's
// one-time fight-start buff. Proves it lands on the whole team (Pollenlord included) and
// COMPOUNDS across the rounds Pollenlord acts (a fresh StatModifierEffect each firing).
//
// Hand-derived (independent `node -e` calculator: 40*1.1=44, 20*1.1=22 (round 1, exact);
// 40*1.1*1.1=48.400000000000006, 20*1.1*1.1=24.200000000000003 (round 2, floats)). Nobody
// attacks (always-wait throughout). Both player creatures' Speed rises by the SAME factor each
// firing, so their relative order never changes; FOE's fixed low Speed never contests either --
// turn order stays POLLENLORD > ALLY > FOE every round, unaffected by the buff.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { POLLINATOR_POLLENLORD_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 5005 // No RNG consumed anywhere in this fixture.

const POLLENLORD = createCreatureId('pollenlord')
const ALLY = createCreatureId('ally')
const FOE = createCreatureId('foe')

export const playerParty = makeParty('player', [
  {
    id: 'pollenlord',
    speed: 40,
    affinity: 'wit',
    scriptId: 'always-wait',
    innateTraitIds: [POLLINATOR_POLLENLORD_TRAIT.id],
  },
  {
    id: 'ally',
    speed: 20,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, affinity: 'wit', scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const TURN_STEPS = 4 // round 1: POLLENLORD, ALLY, FOE; round 2: POLLENLORD only.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: POLLENLORD },
  {
    type: 'TriggerFired',
    sourceId: POLLENLORD,
    hook: 'on-turn-start',
    effectId: POLLINATOR_POLLENLORD_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: POLLENLORD,
    targetId: POLLENLORD,
    stat: 'speed',
    factor: 1.1,
    effectiveBefore: 40,
    effectiveAfter: 44,
  },
  {
    type: 'StatModifierApplied',
    sourceId: POLLENLORD,
    targetId: ALLY,
    stat: 'speed',
    factor: 1.1,
    effectiveBefore: 20,
    effectiveAfter: 22,
  },
  { type: 'Waited', creatureId: POLLENLORD },
  { type: 'TurnEnded', creatureId: POLLENLORD },
  { type: 'TurnStarted', creatureId: ALLY },
  { type: 'Waited', creatureId: ALLY },
  { type: 'TurnEnded', creatureId: ALLY },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: POLLENLORD },
  {
    type: 'TriggerFired',
    sourceId: POLLENLORD,
    hook: 'on-turn-start',
    effectId: POLLINATOR_POLLENLORD_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: POLLENLORD,
    targetId: POLLENLORD,
    stat: 'speed',
    factor: 1.1,
    effectiveBefore: 44,
    effectiveAfter: 48.400000000000006,
  },
  {
    type: 'StatModifierApplied',
    sourceId: POLLENLORD,
    targetId: ALLY,
    stat: 'speed',
    factor: 1.1,
    effectiveBefore: 22,
    effectiveAfter: 24.200000000000003,
  },
  { type: 'Waited', creatureId: POLLENLORD },
  { type: 'TurnEnded', creatureId: POLLENLORD },
]
