// Golden: Snapjaws' Ironjaw (data/traits.ts's SNAPJAW_IRONJAW_TRAIT) -- a self-ramping wall,
// permanently raising its own Defence every time its own turn starts. Distinct from both Lure
// (on-provoke -> self-Defend) and Jaws (on-damage-taken -> retaliate): no Provoke, no damage
// exchanged at all in this fixture. Proves the buff is SELF-only (never touches the ally) and
// COMPOUNDS across the rounds Ironjaw acts.
//
// Hand-derived (independent `node -e` calculator: 20*1.2=24 exact; 24*1.2=28.799999999999997,
// a float). Nobody attacks (always-wait throughout).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SNAPJAW_IRONJAW_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 6006 // No RNG consumed anywhere in this fixture.

const IRONJAW = createCreatureId('ironjaw')
const ALLY = createCreatureId('ally')
const FOE = createCreatureId('foe')

export const playerParty = makeParty('player', [
  {
    id: 'ironjaw',
    defence: 20,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [SNAPJAW_IRONJAW_TRAIT.id],
  },
  { id: 'ally', defence: 20, speed: 10, affinity: 'violence', scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, affinity: 'violence', scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const TURN_STEPS = 4 // round 1: IRONJAW, ALLY, FOE; round 2: IRONJAW only.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: IRONJAW },
  {
    type: 'TriggerFired',
    sourceId: IRONJAW,
    hook: 'on-turn-start',
    effectId: SNAPJAW_IRONJAW_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: IRONJAW,
    targetId: IRONJAW,
    stat: 'defence',
    factor: 1.2,
    effectiveBefore: 20,
    effectiveAfter: 24,
  },
  { type: 'Waited', creatureId: IRONJAW },
  { type: 'TurnEnded', creatureId: IRONJAW },
  { type: 'TurnStarted', creatureId: ALLY },
  { type: 'Waited', creatureId: ALLY },
  { type: 'TurnEnded', creatureId: ALLY },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: IRONJAW },
  {
    type: 'TriggerFired',
    sourceId: IRONJAW,
    hook: 'on-turn-start',
    effectId: SNAPJAW_IRONJAW_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: IRONJAW,
    targetId: IRONJAW,
    stat: 'defence',
    factor: 1.2,
    effectiveBefore: 24,
    effectiveAfter: 28.799999999999997,
  },
  { type: 'Waited', creatureId: IRONJAW },
  { type: 'TurnEnded', creatureId: IRONJAW },
]
