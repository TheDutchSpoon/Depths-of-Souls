// Golden: the Flickerling Wick's gate (Phase 4.1-H2b1, ASSUMPTION 140): it burns and heals ONLY
// while a living ally OTHER than itself is below max Health. Neither effect may leave a stray
// `TriggerFired` -- a heal whose target is nobody still logs one, which is why BOTH effects carry
// the gate. Hand-derived; the Wick is the REAL species. Two cases, each its own fixture object in
// this file (the runner takes either).
//
// CASE 1, `hurtOthersFull`: WICK (38 / 10 / 16 / 14 / 16, wounded to 20/38), FLARE (25/25, full) and
//   A (health 40, full), all always-wait; enemy E waits. Turn order WICK 16 (FLARE 22 goes first and
//   waits), so TURN_STEPS = 2: FLARE's turn, WICK's. The pool = living allies other than the Wick
//   below max Health = {} (FLARE 25/25, A 40/40) -> BOTH gates are false: no burn, no heal, no
//   `TriggerFired` at all, and no Flare reaction (there is no cost to observe). The Wick being hurt
//   itself is not counted. (A gate that counts the bearer burns here: DamageDealt wick -> wick.)
//
// CASE 2, `aloneAndHurt`: WICK (wounded to 10/38), the ONLY living creature on its side: its one ally
//   A is dead (`setup`: 0 HP, not alive). A dead ally has currentHp 0 < max, so a pool built on ALL
//   allies instead of the LIVING ones would count it as hurt. TURN_STEPS = 1 (the dead A has no
//   turn... only WICK is queued): the pool is {} -> no burn, no heal, no `TriggerFired`.

import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { makeParty } from '../__fixtures__/creatures'
import { fromSpecies } from '../__fixtures__/flickerlings'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { FLICKERLING_FLARE, FLICKERLING_WICK } from '../../data/species/glimmerdark'
import type { CombatEvent, CombatState } from '../types'

const WICK = createCreatureId('wick')
const FLARE = createCreatureId('flare')
const A = createCreatureId('a')

const enemyParty = () =>
  makeParty('enemy', [{ id: 'e', health: 100, speed: 1, scriptId: 'always-wait' }])

const allyA = () =>
  makeParty('player', [{ id: 'a', health: 40, speed: 5, scriptId: 'always-wait' }]).map(
    (creature) => ({ ...creature, slot: 2 }),
  )

export const hurtOthersFull = {
  SEED: 8206, // No RNG consumed; seed is inert.
  TURN_STEPS: 2,
  playerParty: [
    fromSpecies(FLICKERLING_WICK, 'player', 0),
    fromSpecies(FLICKERLING_FLARE, 'player', 1),
    ...allyA(),
  ],
  enemyParty: enemyParty(),
  scripts: FIXTURE_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
  setup: (state: CombatState): CombatState =>
    updateCreature(state, WICK, { currentHp: 20 }),
}

export const hurtOthersFullExpected: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FLARE },
  { type: 'Waited', creatureId: FLARE },
  { type: 'TurnEnded', creatureId: FLARE },
  { type: 'TurnStarted', creatureId: WICK },
  // (no burn, no heal, no TriggerFired from either Wick effect, no Flare reaction)
  { type: 'Waited', creatureId: WICK },
  { type: 'TurnEnded', creatureId: WICK },
]

export const aloneAndHurt = {
  SEED: 8207, // No RNG consumed; seed is inert.
  TURN_STEPS: 1,
  playerParty: [
    fromSpecies(FLICKERLING_WICK, 'player', 0),
    ...allyA().map((c) => ({ ...c, slot: 1 })),
  ],
  enemyParty: enemyParty(),
  scripts: FIXTURE_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
  setup: (state: CombatState): CombatState =>
    updateCreature(updateCreature(state, WICK, { currentHp: 10 }), A, {
      currentHp: 0,
      alive: false,
    }),
}

export const aloneAndHurtExpected: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: WICK },
  // (the only living ally is the Wick itself, and the dead A is not counted)
  { type: 'Waited', creatureId: WICK },
  { type: 'TurnEnded', creatureId: WICK },
]
