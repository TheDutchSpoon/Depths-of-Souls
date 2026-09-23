// Golden: Rotcap Hollow's floor-30 boss, the Rot Sovereign (species-locked.md's "Attrition-
// management ... grows via count-scaling off deaths + blankets the party in spreading Spore") --
// the real, shipped `ROT_SOVEREIGN_TRAIT` proving BOTH signature halves end to end: an add's
// death growing her Attack (the LIVE `magnitudeSource` count-scaling primitive, freeze-at-
// application, per species-locked.md's own wording) feeding directly into her own very next
// attack's damage, and her own turn-start Spore blanket.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). TARGET (speed 30) acts
// before SOVEREIGN (speed 16, real base stats) before ADD (speed 1, a plain fixture stand-in for
// one of her real adds -- never reached; this golden stops after SOVEREIGN's own turn).
// Endurance-vs-Endurance (TARGET/ADD/SOVEREIGN all endurance) is always neutral (same
// affinity) -- x1.0 everywhere, no complication. No random selectors anywhere (both attacks'
// targets are each side's sole living member by the time they're chosen) -- SEED is inert.
//
//   TARGET->ADD (off 20, def 0): core = 20. chip = 0.01*20 = 0.2. raw = 20.2 -> final =
//     floor(20.2) = 20. ADD (wounded to 5 post-createCombat, see ADD_STARTING_HP) 5 - 20 -> 0,
//     dies.
//   fireDeathObservers: on-ally-death fires on SOVEREIGN (ADD's only living ally) -> Attrition's
//     on-ally-death effect: apply-stat-modifier(self, attack, factor 1.15,
//     magnitudeSource: count of dead-allies) -- 1 dead ally (ADD, just died, already reflected)
//     -> finalFactor = 1 + (1.15-1)*1 = 1.15. effectiveBefore = 22 (base, unmodified).
//     effectiveAfter = 22 * 1.15 = 25.299999999999997 (JS float -- 1.15 isn't exactly
//     representable in binary; verified via node, not hand-rounded).
//   SOVEREIGN's own on-turn-start: Attrition's Spore-blanket effect -> apply-status(all-enemies,
//     spore) -> TARGET (her only living enemy).
//   SOVEREIGN->TARGET (off 25.299999999999997 [carrying the growth from the ally death above],
//     def 10): core = 25.299999999999997 - 10 = 15.299999999999997. chip =
//     0.01*25.299999999999997 = 0.253. raw = 15.552999999999997 -> final =
//     floor(15.552999999999997) = 15. TARGET (100 max HP) 100 - 15 = 85, survives -- proving the
//     growth from ADD's death already fed this very next attack.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { ROT_SOVEREIGN_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 3030 // No RNG consumed anywhere in this fixture; seed is inert.

export const TARGET = createCreatureId('target')
export const SOVEREIGN = createCreatureId('rot-sovereign')
export const ADD = createCreatureId('add')

/** Applied post-createCombat by golden-rot-sovereign.test.ts -- see the header comment above. */
export const ADD_STARTING_HP = 5

export const playerParty = makeParty('player', [
  {
    id: 'target',
    health: 100,
    attack: 20,
    defence: 10,
    speed: 30,
    affinity: 'endurance',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'rot-sovereign',
    health: 30,
    attack: 22,
    intelligence: 20,
    defence: 26,
    speed: 16,
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

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 2 // TARGET's turn (kills ADD), then SOVEREIGN's turn -- ADD's own
// (now-empty, skipped-since-dead) queue slot is never reached.

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
    hook: 'on-ally-death',
    effectId: ROT_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: SOVEREIGN,
    stat: 'attack',
    factor: 1.15,
    effectiveBefore: 22,
    effectiveAfter: 25.299999999999997,
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
    stacks: 1,
    duration: 3,
    sourceId: SOVEREIGN,
  },
  { type: 'AttackDeclared', attackerId: SOVEREIGN, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: SOVEREIGN,
    targetId: TARGET,
    rawDamage: 15.552999999999997,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 85,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: SOVEREIGN },
]
