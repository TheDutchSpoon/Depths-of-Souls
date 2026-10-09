// Golden: the Flickerling Wick's heal never targets the Wick itself (Phase 4.1-H2b1, ASSUMPTION 140:
// "heals the lowest-HP injured ally OTHER than itself"). Hand-derived; the Wick is the REAL species.
//
// Players: WICK (38 / 10 / 16 / 14 / 16; wounded to 10/38 by `setup`, the MOST hurt ally and the
// lowest current HP), C (health 40, speed 5, lightly hurt: 39/40). Enemy E waits (health 100,
// speed 1). Both always-wait. Turn order: WICK 16, C 5, E 1. TURN_STEPS = 1: WICK's turn.
//
// Turn start: the pool = living allies other than the Wick below max Health = {C} (39 < 40), so the
// gate passes for both effects (the Wick being hurt itself neither opens nor closes it).
//  1. Burn: floor(38 x 10 / 100) = 3 (raw 3.8). WICK 10 -> 7. (No observers on this board.)
//  2. Heal: the target is C -- not the Wick, though the Wick has the lower current HP (7 < 39).
//     Amount floor(38 x 20 / 100) = floor(7.6) = 7, but C only has room for 1: applyHeal clamps to
//     effective max Health 40, so C 39 -> 40, amount 1.
// (With the bearer exclusion removed the heal would pick the Wick: HealApplied wick -> wick.)

import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { makeParty } from '../__fixtures__/creatures'
import { fromSpecies } from '../__fixtures__/flickerlings'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { FLICKERLING_WICK } from '../../data/species/glimmerdark'
import { FLICKERLING_WICK_TRAIT } from '../../data/traits/glimmerdark'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 8205 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const WICK = createCreatureId('wick')
const C = createCreatureId('c')

export const playerParty = [
  fromSpecies(FLICKERLING_WICK, 'player', 0),
  ...makeParty('player', [
    { id: 'c', health: 40, speed: 5, scriptId: 'always-wait' },
  ]).map((creature) => ({ ...creature, slot: 1 })),
]

export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 100, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export function setup(state: CombatState): CombatState {
  return updateCreature(updateCreature(state, WICK, { currentHp: 10 }), C, {
    currentHp: 39,
  })
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: WICK },
  {
    type: 'TriggerFired',
    sourceId: WICK,
    hook: 'on-turn-start',
    effectId: FLICKERLING_WICK_TRAIT.id,
  },
  {
    type: 'DamageDealt',
    sourceId: WICK,
    targetId: WICK,
    rawDamage: 3.8,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 7,
    damageSource: 'dot',
  },
  {
    type: 'TriggerFired',
    sourceId: WICK,
    hook: 'on-turn-start',
    effectId: FLICKERLING_WICK_TRAIT.id,
  },
  { type: 'HealApplied', sourceId: WICK, targetId: C, amount: 1, remainingHp: 40 },
  { type: 'Waited', creatureId: WICK },
  { type: 'TurnEnded', creatureId: WICK },
]
