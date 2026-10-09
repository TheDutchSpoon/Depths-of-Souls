// Golden: the Flickerling Wick's burn and heal, the Flare reacting to the burn, and the heal's
// "hurt" filter (Phase 4.1-H2b1, ASSUMPTIONS 116, 140). Hand-derived; the Wick and the Flare are the
// REAL species (data/species/glimmerdark.ts) with their real traits.
//
// Players (party order = slot): WICK (38 / 10 / 16 / 14 / 16, vitality), FLARE (25 / 14 / 22 / 10 /
// 22, wit), A (health 40, speed 5, hurt: 30/40), B (health 20, speed 4, FULL: 20/20 -- a LOWER
// current HP than A, the trap for a heal that forgets the hurt filter). Enemy E waits (health 100,
// speed 1). Everyone always-waits. Turn order by Speed: FLARE 22, WICK 16, A 5, B 4, E 1.
// TURN_STEPS = 2: FLARE's turn (it waits), then WICK's.
//
// WICK's turn start, two effects in order (burn, heal), both gated on `other-ally-injured`: the pool
// is the living allies OTHER than the Wick below max Health = {A} (30 < 40) -> the gate passes
// for both.
//  1. Burn (a cost): floor(38 x 10 / 100) = floor(3.8) = 3 exactly (calculateCost(3.8): raw 3.8,
//     final 3, affinity 1, not chip-only, 'dot' label). WICK 38 -> 35. Then the observation pass over
//     the living (wick, flare, a, b, e): only FLARE has an observer (`ally`, `selfInflicted`), and
//     the burn is a cost on an ally -> FLARE reacts: Speed x1.15 to every living ally, in party
//     order: WICK 16 -> 16 x 1.15, FLARE 22 -> 22 x 1.15, A 5 -> 5 x 1.15, B 4 -> 4 x 1.15.
//  2. Heal: the pool is still {A} (the burn changed nobody else's HP): the lowest current HP among
//     the HURT others is A (30). B (20, lower) is full, so it is not a candidate; the Wick itself
//     is excluded. Amount: floor(38) x 20 x 1 / 100 = 7.6 -> applyHeal floors to 7. A 30 -> 37.
// (Dropping the hurt filter heals B, who is at full: amount 0 on B. Counting the bearer would still
// pick A here, so the bearer exclusion is pinned by golden-h2b1-wick-skips-self.)

import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { makeParty } from '../__fixtures__/creatures'
import { fromSpecies } from '../__fixtures__/flickerlings'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { FLICKERLING_FLARE, FLICKERLING_WICK } from '../../data/species/glimmerdark'
import {
  FLICKERLING_FLARE_TRAIT,
  FLICKERLING_WICK_TRAIT,
} from '../../data/traits/glimmerdark'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 8204 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

const WICK = createCreatureId('wick')
const FLARE = createCreatureId('flare')
const A = createCreatureId('a')
const B = createCreatureId('b')

export const playerParty = [
  fromSpecies(FLICKERLING_WICK, 'player', 0),
  fromSpecies(FLICKERLING_FLARE, 'player', 1),
  ...makeParty('player', [
    { id: 'a', health: 40, speed: 5, scriptId: 'always-wait' },
    { id: 'b', health: 20, speed: 4, scriptId: 'always-wait' },
  ]).map((c, i) => ({ ...c, slot: i + 2 })),
]

export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 100, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

/** createCombat resets HP, so the wound is a post-creation step. */
export function setup(state: CombatState): CombatState {
  return updateCreature(state, A, { currentHp: 30 })
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FLARE },
  { type: 'Waited', creatureId: FLARE },
  { type: 'TurnEnded', creatureId: FLARE },
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
    remainingHp: 35,
    damageSource: 'dot',
  },
  {
    type: 'TriggerFired',
    sourceId: FLARE,
    hook: 'on-damage-observed',
    effectId: FLICKERLING_FLARE_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: FLARE,
    targetId: WICK,
    stat: 'speed',
    factor: 1.15,
    effectiveBefore: 16,
    effectiveAfter: 16 * 1.15,
  },
  {
    type: 'StatModifierApplied',
    sourceId: FLARE,
    targetId: FLARE,
    stat: 'speed',
    factor: 1.15,
    effectiveBefore: 22,
    effectiveAfter: 22 * 1.15,
  },
  {
    type: 'StatModifierApplied',
    sourceId: FLARE,
    targetId: A,
    stat: 'speed',
    factor: 1.15,
    effectiveBefore: 5,
    effectiveAfter: 5 * 1.15,
  },
  {
    type: 'StatModifierApplied',
    sourceId: FLARE,
    targetId: B,
    stat: 'speed',
    factor: 1.15,
    effectiveBefore: 4,
    effectiveAfter: 4 * 1.15,
  },
  {
    type: 'TriggerFired',
    sourceId: WICK,
    hook: 'on-turn-start',
    effectId: FLICKERLING_WICK_TRAIT.id,
  },
  { type: 'HealApplied', sourceId: WICK, targetId: A, amount: 7, remainingHp: 37 },
  { type: 'Waited', creatureId: WICK },
  { type: 'TurnEnded', creatureId: WICK },
]
