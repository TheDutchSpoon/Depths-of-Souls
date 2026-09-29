// Golden: D3's revive cap, the fizzle half (Phase 4.1-B, PR #69 review R5) -- the "11th attempt"
// case, where the ONLY dead ally is already at MAX_REVIVES_PER_CREATURE: the pool is empty
// before the draw, so the revive response finds nothing, targets nothing, and consumes zero RNG.
// The triggering hook still fires (TriggerFired IS emitted -- the trigger's own condition/
// chancePercent gate has nothing to do with whether its response then finds a target), so the
// expected log is "TriggerFired only": no Revived, no DamageDealt, no anything else.
//
// REVIVER carries the same on-fight-start `revive` trait as golden-d3-revive-cap-exclusion.
// CAPPED starts dead and already at the cap (set post-createCombat, same pattern as that
// fixture's own header comment explains) -- the sole dead ally, so `random-dead-ally`'s pool is
// empty and the draw (`Math.floor(nextRandom(...) * length)`) never runs at all.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'
import { updateCreature } from '../creature-lookup'
import { MAX_REVIVES_PER_CREATURE } from '../config'
import type { CombatState } from '../types'

export const SEED = 1
export const TURN_STEPS = 1

const REVIVER = createCreatureId('reviver')
export const CAPPED = createCreatureId('capped')

export const REVIVE_TRAIT: Trait = {
  id: 'd3-revive-fizzle-fixture',
  name: 'Revive (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'revive',
        target: { kind: 'random-dead-ally' },
        pct: 0.5,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'reviver',
    speed: 30,
    scriptId: 'always-wait',
    innateTraitIds: [REVIVE_TRAIT.id],
  },
  { id: 'capped', speed: 20, health: 20, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [REVIVE_TRAIT.id, REVIVE_TRAIT],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: REVIVER,
    hook: 'on-fight-start',
    effectId: REVIVE_TRAIT.id,
  },
  // No Revived -- the pool was empty before any draw could happen.
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: REVIVER },
  { type: 'Waited', creatureId: REVIVER },
  { type: 'TurnEnded', creatureId: REVIVER },
]

/** Post-`createCombat` step (createCombat resets HP/statuses at fight setup); runs before the first
 * frozen turn (see test-utils/golden-runner.ts). */
export const setup = (created: CombatState): CombatState => {
  const initial = updateCreature(created, CAPPED, {
    alive: false,
    currentHp: 0,
    revivesUsed: MAX_REVIVES_PER_CREATURE,
  })
  return initial
}
