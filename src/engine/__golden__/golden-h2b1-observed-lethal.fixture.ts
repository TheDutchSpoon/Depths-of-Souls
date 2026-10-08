// Golden: a LETHAL cost, in the damage-path hook order (Phase 4.1-H2b1, ASSUMPTIONS 115, 116, 140,
// CONVENTIONS "Hook execution model"): DamageDealt -> (on-damage-taken, survivors only) ->
// on-damage-observed -> CreatureDied -> on-death -> on-kill -> on-ally-death. The Wick's burn can
// kill it; the Flare's reaction then sits BEFORE CreatureDied and the Last Gleam's `on-ally-death`
// AFTER it, and the lethal burn skips the heal (fireHook re-checks `alive` per effect).
// Hand-derived; the Wick, the Flare and the Last Gleam are the REAL species with their real traits.
//
// Players (party order = slot): WICK (38 / 10 / 16 / 14 / 16; wounded to 3/38 by `setup`), FLARE
// (25 / 14 / 22 / 10 / 22), GLEAM (28 / 24 / 10 / 14 / 18, violence), A (health 40, speed 5, attack
// 20, hurt: 30/40 so the gate passes). Enemy E waits (health 100, speed 1). Everyone always-waits.
// Turn order: FLARE 22, GLEAM 18, WICK 16, A 5, E 1. TURN_STEPS = 3: FLARE and GLEAM wait, then WICK.
//
// WICK's turn start. Gate: the pool = living allies other than the Wick below max Health = {A}
// (30 < 40) -> passes.
//  1. Burn: floor(38 x 10 / 100) = floor(3.8) = 3 = the Wick's whole 3 HP -> lethal. DamageDealt
//     (raw 3.8, final 3, remainingHp 0); the Wick is already `alive: false`.
//  2. The observation pass runs over the LIVING (the Wick is dead, so it does not observe its own
//     death blow): FLARE fires (`ally`, `selfInflicted`; the Wick was its ally). Speed x1.15 to every
//     LIVING ally, in party order: FLARE 22, GLEAM 18, A 5 (the dead Wick gets nothing).
//  3. CreatureDied wick.
//  4. on-death (none); on-kill (the killer is the dead Wick itself: skipped); then the death
//     observers over the Wick's living allies in party order: FLARE (no on-ally-death trait), GLEAM
//     fires its Last Light: Attack x1.2 to every living ally -- FLARE 14, GLEAM 24, A 20.
//  5. The heal (the Wick's second effect) is SKIPPED: the Wick is no longer alive, so no
//     TriggerFired for it. There is no action (dead), no turn-end hook; only TurnEnded.

import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { makeParty } from '../__fixtures__/creatures'
import { fromSpecies } from '../__fixtures__/flickerlings'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import {
  FLICKERLING_FLARE,
  FLICKERLING_LAST_GLEAM,
  FLICKERLING_WICK,
} from '../../data/species/glimmerdark'
import {
  FLICKERLING_FLARE_TRAIT,
  FLICKERLING_LAST_GLEAM_TRAIT,
  FLICKERLING_WICK_TRAIT,
} from '../../data/traits/glimmerdark'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 8208 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3

const WICK = createCreatureId('wick')
const FLARE = createCreatureId('flare')
const GLEAM = createCreatureId('last-gleam')
const A = createCreatureId('a')

export const playerParty = [
  fromSpecies(FLICKERLING_WICK, 'player', 0),
  fromSpecies(FLICKERLING_FLARE, 'player', 1),
  fromSpecies(FLICKERLING_LAST_GLEAM, 'player', 2),
  ...makeParty('player', [
    { id: 'a', health: 40, speed: 5, scriptId: 'always-wait' },
  ]).map((creature) => ({ ...creature, slot: 3 })),
]

export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 100, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export function setup(state: CombatState): CombatState {
  return updateCreature(updateCreature(state, WICK, { currentHp: 3 }), A, {
    currentHp: 30,
  })
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FLARE },
  { type: 'Waited', creatureId: FLARE },
  { type: 'TurnEnded', creatureId: FLARE },
  { type: 'TurnStarted', creatureId: GLEAM },
  { type: 'Waited', creatureId: GLEAM },
  { type: 'TurnEnded', creatureId: GLEAM },
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
    remainingHp: 0,
    damageSource: 'dot',
  },
  // The Flare's reaction sits BEFORE CreatureDied; the dead Wick gets no Speed.
  {
    type: 'TriggerFired',
    sourceId: FLARE,
    hook: 'on-damage-observed',
    effectId: FLICKERLING_FLARE_TRAIT.id,
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
    targetId: GLEAM,
    stat: 'speed',
    factor: 1.15,
    effectiveBefore: 18,
    effectiveAfter: 18 * 1.15,
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
  { type: 'CreatureDied', creatureId: WICK },
  // The Last Gleam's reaction sits AFTER CreatureDied.
  {
    type: 'TriggerFired',
    sourceId: GLEAM,
    hook: 'on-ally-death',
    effectId: FLICKERLING_LAST_GLEAM_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GLEAM,
    targetId: FLARE,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 14,
    effectiveAfter: 14 * 1.2,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GLEAM,
    targetId: GLEAM,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 24,
    effectiveAfter: 24 * 1.2,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GLEAM,
    targetId: A,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 20,
    effectiveAfter: 20 * 1.2,
  },
  // (no heal TriggerFired: the lethal burn skipped the Wick's second effect; no action: it is dead)
  { type: 'TurnEnded', creatureId: WICK },
]
