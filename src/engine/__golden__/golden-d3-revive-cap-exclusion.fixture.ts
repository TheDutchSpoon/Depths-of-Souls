// Golden: D3's revive cap, the mixed-pool exclusion half (Phase 4.1-B, PR #69 review R5) --
// `random-dead-ally` excludes a dead ally already at MAX_REVIVES_PER_CREATURE from the pool
// BEFORE drawing, so a pool with one capped and one eligible dead ally always lands on the
// eligible one.
//
// REVIVER carries a trait that fires `revive` (target `random-dead-ally`, pct 0.5) at
// on-fight-start. Rather than hand-driving 10 real revive-and-rekill cycles through combat to
// reach the cap (the mechanism itself is already unit-tested end-to-end in resolution.test.ts,
// including the climb to exactly 10), this fixture starts CAPPED already at the cap -- the same
// "post-createCombat setup step" pattern golden-dot.fixture.ts's own header comment documents
// (createCombat always resets currentHp/revivesUsed at fight-setup, so the capped/dead starting
// state has to be applied AFTER creation, in the .test.ts driver, via updateCreature). ELIGIBLE
// starts dead too, but with revivesUsed 0.
//
// Pool at the on-fight-start revive roll: CAPPED excluded (revivesUsed >= cap) -> pool is
// [ELIGIBLE] alone, so the index draw (`floor(rng * 1)`) always lands on 0 regardless of its
// value -- ELIGIBLE is revived unconditionally; CAPPED never is. ELIGIBLE's base Health is 20;
// currentHp = round(20 * 0.5) = 10.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 1

const REVIVER = createCreatureId('reviver')
export const CAPPED = createCreatureId('capped')
export const ELIGIBLE = createCreatureId('eligible')

export const REVIVE_TRAIT: Trait = {
  id: 'd3-revive-exclusion-fixture',
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
  { id: 'eligible', speed: 10, health: 20, scriptId: 'always-wait' },
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
  { type: 'Revived', sourceId: REVIVER, targetId: ELIGIBLE, currentHp: 10 },
  // No Revived for CAPPED anywhere -- it was excluded from the pool before the draw.
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: REVIVER },
  { type: 'Waited', creatureId: REVIVER },
  { type: 'TurnEnded', creatureId: REVIVER },
]
