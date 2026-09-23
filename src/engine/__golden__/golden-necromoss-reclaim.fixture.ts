// Golden: Rotcap Hollow's Necromoss Wisp (species-locked.md's "Reclaim" mechanic) -- the real,
// shipped `NECROMOSS_WISP_TRAIT` heals itself every turn scaled by the LIVE count of its own
// dead allies, proving `heal`'s `magnitudeSource` mode (Slice E2, named for Necromoss in
// effect-types.ts's own doc comment) against real content for the first time.
//
// PR #64 review: WISP's health (50, not the species' own real 18) and dead-ally count (3, not 2)
// are deliberately chosen so BOTH the 5% rate and the count actually change the FLOORED result --
// at the old numbers (18 max HP, 2 dead allies), 18*0.05*2 = 1.8 floors to 1, which is also what
// 18*0.03*2 = 1.08 (the pre-review rate) floors to, so that scenario couldn't have caught a
// regression to the wrong rate. Here: 50*0.05*3 = 7.5 -> floors to 7; the WRONG rate (0.03) would
// give 50*0.03*3 = 4.5 -> 4, and the WRONG count (2) would give 50*0.05*2 = 5.0 -> 5 -- both
// visibly different from 7, so this scenario is sensitive to either mistake.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). WISP (speed 16) acts
// before DUMMY (player, speed 5, always-wait, never reached in 1 step) -- WISP's own three dead
// allies are excluded from the round-1 turn queue build entirely (alive-filtered), so WISP is
// simply the queue's first (and only-reached) entry. WISP starts the fight wounded to 5 HP
// (applied post-createCombat, same idiom golden-dot.fixture.ts uses -- createCombat resets
// currentHp to effective max, so a raw `currentHp` override on the party literal would be
// discarded).
//
//   WISP's on-turn-start: heal(self, scalingStat health, spellPower 0.05,
//     magnitudeSource: count of dead-allies) -- 3 dead allies among WISP's own side ->
//     amount = getEffectiveStat(WISP, 'health') [50, unmodified] * 0.05 * 3 = 7.5 ->
//     applyHeal floors: floor(7.5) = 7. WISP 5 -> 12 (well under its 50 max, no clamp).
//   WISP's own action this turn (always-wait, unrelated to the trait) -> Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { NECROMOSS_WISP_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 5005 // No RNG consumed anywhere in this fixture; seed is inert.

export const WISP = createCreatureId('necromoss-wisp')

/** Applied post-createCombat by golden-necromoss-reclaim.test.ts -- see the header comment above. */
export const WISP_STARTING_HP = 5

export const playerParty = makeParty('player', [
  {
    id: 'dummy',
    speed: 5,
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'necromoss-wisp',
    health: 50,
    attack: 10,
    intelligence: 20,
    defence: 12,
    speed: 16,
    affinity: 'wit',
    scriptId: 'always-wait',
    innateTraitIds: [NECROMOSS_WISP_TRAIT.id],
  },
  {
    id: 'fallen-1',
    alive: false,
    scriptId: 'always-wait',
  },
  {
    id: 'fallen-2',
    alive: false,
    scriptId: 'always-wait',
  },
  {
    id: 'fallen-3',
    alive: false,
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 1 // WISP's turn only -- DUMMY is never reached.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: WISP },
  {
    type: 'TriggerFired',
    sourceId: WISP,
    hook: 'on-turn-start',
    effectId: NECROMOSS_WISP_TRAIT.id,
  },
  {
    type: 'HealApplied',
    sourceId: WISP,
    targetId: WISP,
    amount: 7,
    remainingHp: 12,
  },
  { type: 'Waited', creatureId: WISP },
  { type: 'TurnEnded', creatureId: WISP },
]
