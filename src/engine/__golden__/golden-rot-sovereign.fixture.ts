// Golden: Rotcap Hollow's floor-30 boss, the Rot Sovereign (`content/rotcap-hollow.md#rot-sovereign`)
// -- the real, shipped `ROT_SOVEREIGN_TRAIT` proving all three
// signature pieces end to end: an add's death growing her Attack (`on-death-observed`), a PLAYER
// creature's death ALSO growing her Attack at the SAME flat rate (one `any` trigger: a flat +10%
// per event, no `magnitudeSource`), the two compounding multiplicatively across both death
// sources, and her own turn-start Spore blanket.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). TARGET (speed 40) acts
// before SOVEREIGN (speed 30; her Attack 22, Intelligence 20 and Defence 26 are the real Rot
// Sovereign's base stats, but the speed is the fixture's own -- the real one is 16 -- and her Health
// 30 is the fixture's own too, the real one is 45) before WEAK (speed 10) before ADD (speed 1 --
// never reached; this golden stops after SOVEREIGN's own turn). Endurance-vs-Endurance
// (everyone here is endurance) is always neutral -- x1.0 everywhere, no complication. No random
// selectors anywhere (every attack's target is deterministically the lowest-HP living enemy) --
// SEED is inert.
//
//   TARGET->ADD (off 20, def 0): core = 20. chip = 0.01*20 = 0.2. raw = 20.2 -> final =
//     floor(20.2) = 20. ADD (wounded to 5 post-createCombat) 5 - 20 -> 0, dies.
//   fireDeathObservers(ADD): on-death-observed runs over every living creature but ADD, in turn order:
//     TARGET carries no matching trait, nothing; it fires on SOVEREIGN ->
//     Attrition's flat +10% Attack: effectiveBefore = 22 (base, unmodified), factor 1.1 ->
//     effectiveAfter = 22 * 1.1 = 24.200000000000003 (JS float, not hand-rounded -- verified via
//     node).
//   SOVEREIGN's own on-turn-start: Attrition's Spore-blanket effect -> apply-status(all-enemies,
//     spore) -> TARGET then WEAK (her living enemies, player-party slot order).
//   SOVEREIGN->WEAK (off 24.200000000000003 [carrying the growth from ADD's death], def 0):
//     core = 24.200000000000003. chip = 0.01*24.200000000000003 = 0.24200000000000002. raw =
//     24.442000000000004 -> final = floor(24.442000000000004) = 24. WEAK (wounded to 5
//     post-createCombat) 5 - 24 -> 0, dies -- proving the ally-death growth already fed this very
//     next attack.
//   WEAK itself was blanketed with Spore by the on-turn-start effect above; its death fires
//     Spore's OWN on-death spread trigger too -- fizzling (TriggerFired, no StatusApplied) since
//     TARGET (WEAK's only living ally) was ALSO blanketed with Spore in that same firing and is
//     filtered out by random-ally-without-status.
//   fireDeathObservers(WEAK): on-death-observed runs over every living creature but WEAK: TARGET
//     has no matching trait, nothing; it fires on SOVEREIGN ->
//     Attrition's SAME flat +10% Attack, fired a second time: effectiveBefore =
//     24.200000000000003, factor 1.1 -> effectiveAfter = 24.200000000000003 * 1.1 =
//     26.620000000000005 -- the two death sources compounding multiplicatively
//     (22 * 1.1 * 1.1 = 26.62), at the identical rate regardless of which side died.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { ROT_SOVEREIGN_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'
import { updateCreature } from '../creature-lookup'
import type { CombatState } from '../types'

export const SEED = 3030 // No RNG consumed anywhere in this fixture; seed is inert.

export const TARGET = createCreatureId('target')
export const WEAK = createCreatureId('weak')
export const SOVEREIGN = createCreatureId('rot-sovereign')
export const ADD = createCreatureId('add')

/** Applied post-createCombat by golden-rot-sovereign.test.ts -- see the header comment above. */
export const WEAK_STARTING_HP = 5
export const ADD_STARTING_HP = 5

export const playerParty = makeParty('player', [
  {
    id: 'target',
    health: 100,
    attack: 20,
    defence: 10,
    speed: 40,
    affinity: 'endurance',
    scriptId: 'always-attack',
  },
  {
    id: 'weak',
    health: 30,
    defence: 0,
    speed: 10,
    affinity: 'endurance',
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'rot-sovereign',
    health: 30,
    attack: 22,
    intelligence: 20,
    defence: 26,
    speed: 30,
    affinity: 'endurance',
    scriptId: 'always-attack',
    innateTraitIds: [ROT_SOVEREIGN_TRAIT.id],
  },
  {
    id: 'add',
    health: 20,
    defence: 0,
    speed: 1,
    affinity: 'endurance',
    scriptId: 'always-wait',
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 2 // TARGET's turn (kills ADD), then SOVEREIGN's turn (kills WEAK) --
// WEAK's and ADD's own queue slots (both dead) are never reached.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'AttackDeclared', attackerId: TARGET, targetId: ADD },
  {
    type: 'DamageDealt',
    sourceId: TARGET,
    targetId: ADD,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: ADD },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-death-observed',
    effectId: ROT_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: SOVEREIGN,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 22,
    effectiveAfter: 24.200000000000003,
  },
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'TurnStarted', creatureId: SOVEREIGN },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-turn-start',
    effectId: ROT_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: TARGET,
    statusId: 'spore',
    duration: 3,
    sourceId: SOVEREIGN,
  },
  {
    type: 'StatusApplied',
    targetId: WEAK,
    statusId: 'spore',
    duration: 3,
    sourceId: SOVEREIGN,
  },
  { type: 'AttackDeclared', attackerId: SOVEREIGN, targetId: WEAK },
  {
    type: 'DamageDealt',
    sourceId: SOVEREIGN,
    targetId: WEAK,
    rawDamage: 24.442000000000004,
    finalDamage: 24,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: WEAK },
  // WEAK itself was blanketed with Spore by SOVEREIGN's own on-turn-start effect above, so its
  // death also fires Spore's OWN on-death spread trigger -- fizzling (TriggerFired only, no
  // StatusApplied) since TARGET, WEAK's only living ally, was blanketed with Spore in that same
  // on-turn-start firing and is filtered out.
  { type: 'TriggerFired', sourceId: WEAK, hook: 'on-death', effectId: 'spore' },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-death-observed',
    effectId: ROT_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: SOVEREIGN,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 24.200000000000003,
    effectiveAfter: 26.620000000000005,
  },
  { type: 'TurnEnded', creatureId: SOVEREIGN },
]

/** Post-`createCombat` step (createCombat resets HP/statuses at fight setup); runs before the first
 * frozen turn (see test-utils/golden-runner.ts). */
export const setup = (created: CombatState): CombatState => {
  // createCombat resets currentHp to effective max at fight-start, so ADD's and WEAK's wounded
  // starting HP have to be applied here, after creation -- see the fixture's header comment.
  let state = updateCreature(created, ADD, { currentHp: ADD_STARTING_HP })
  state = updateCreature(state, WEAK, { currentHp: WEAK_STARTING_HP })
  return state
}
