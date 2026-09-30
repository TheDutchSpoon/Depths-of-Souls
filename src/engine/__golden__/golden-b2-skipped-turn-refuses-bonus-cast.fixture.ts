// Golden: B2.1 (Phase 4.1-C2c) -- a creature whose turn was SKIPPED takes no granted action
// either, even though the lock is gone by the granted-actions step; the bonus-cast's chance is
// still ROLLED first, so the RNG stream doesn't depend on the skip. Hand-derived.
//
// CASTER (player, speed 20, Int 20, HP 40, defence 0): trait `b2-stunned-bonus-caster-fixture` =
//   [bonus-cast chancePercent 100,
//    on-fight-start apply-status Stun (self),
//    on-turn-end remove-status Stun (self)].
// Slots after createCombat (asserted in the test): exactly [BOLT] (enemy-side single target,
// spellPower 0.5) -- so if the gate were removed there IS something castable to cast.
// Round 1, CASTER's turn: Stun (applied at fight start) suppresses at turn start -> `suppressed`
// is true, no action. The turn-end hook then REMOVES Stun, so by the granted-actions step no lock
// exists: checkLegality alone would let the cast through. Only the skipped-turn GATE refuses it
// (this is what separates B2.1 from B2.2). The gate sits AFTER the roll: bonus-cast rolls draw #1.
//
// LATER RNG CONSUMER: E1 (enemy, speed 10, Attack 10, script `random-attack` = attack a
// `random-enemy`) acts next and picks uniformly among the player side's living creatures in slot
// order [CASTER, D1, D2] with draw floor(r * 3). Seed 9200's mulberry32 draws (independent node
// trace): #1 0.8779, #2 0.3225, #3 0.3805.
//   - As built: draw #1 = the bonus-cast chance roll (100% -> passes whatever it is, but IS
//     drawn), then E1's pick is draw #2 = 0.3225 -> floor(0.9675) = 0 -> CASTER.
//   - Refuse-BEFORE-roll (the mutation): E1's pick would be draw #1 = 0.8779 -> floor(2.63) = 2
//     -> D2. Different log.
//   - Gate removed: a SpellCast/DamageDealt on E1 appears (and E1's pick shifts to draw #3).
// Damage: E1 Attack 10 vs CASTER defence 0: core 10, chip 0.01*10 = 0.1 -> raw 10.1 -> final 10;
// CASTER 40 - 10 = 30 (no clamp). All vitality (x1.0). Turn order: CASTER 20, E1 10, D1 5, D2 4,
// E2 1; TURN_STEPS = 2 (CASTER, E1).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { STUN } from '../../data/statuses'
import type { CombatEvent, Spell } from '../types'
import type { Script } from '../scripting-types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 9200
export const TURN_STEPS = 2 // CASTER (skipped), E1

const CASTER = createCreatureId('caster')
const E1 = createCreatureId('e1')

export const BOLT: Spell = {
  id: 'bolt-fixture',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'vitality',
}

export const RANDOM_ATTACK_SCRIPT: Script = {
  id: 'random-attack-fixture',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'random-enemy' },
    },
  ],
}

export const STUNNED_BONUS_CASTER: Trait = {
  id: 'b2-stunned-bonus-caster-fixture',
  name: 'Stunned Bonus Caster (fixture)',
  effects: [
    { category: 'bonus-cast', chancePercent: 100 },
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: STUN.statusId, duration: 3 },
      },
    },
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'remove-status',
        target: { kind: 'self' },
        filter: { statusId: STUN.statusId },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    health: 40,
    intelligence: 20,
    defence: 0,
    speed: 20,
    scriptId: 'always-wait',
    equippedSpells: [BOLT],
    innateTraitIds: [STUNNED_BONUS_CASTER.id],
  },
  { id: 'd1', health: 40, defence: 0, speed: 5, scriptId: 'always-wait' },
  { id: 'd2', health: 40, defence: 0, speed: 4, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'e1',
    health: 40,
    attack: 10,
    defence: 0,
    speed: 10,
    scriptId: RANDOM_ATTACK_SCRIPT.id,
  },
  { id: 'e2', health: 50, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [RANDOM_ATTACK_SCRIPT.id, RANDOM_ATTACK_SCRIPT],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [STUNNED_BONUS_CASTER.id, STUNNED_BONUS_CASTER],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([[STUN.statusId, STUN]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-fight-start',
    effectId: STUNNED_BONUS_CASTER.id,
  },
  {
    type: 'StatusApplied',
    targetId: CASTER,
    statusId: STUN.statusId,
    stacks: 1,
    duration: 3,
    sourceId: CASTER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  // Stun's own turn-start suppression: TriggerFired, then the empty bracket (no action).
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-start',
    effectId: STUN.statusId,
  },
  // Turn-end hook removes the Stun -- the lock is gone before the granted-actions step.
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-end',
    effectId: STUNNED_BONUS_CASTER.id,
  },
  { type: 'StatusExpired', creatureId: CASTER, statusId: STUN.statusId },
  // Bonus-cast rolled (draw #1) and was then refused: NO SpellCast, NO DamageDealt here.
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: E1 },
  // E1's random pick = draw #2 (0.3225) -> index 0 = CASTER.
  { type: 'AttackDeclared', attackerId: E1, targetId: CASTER },
  {
    type: 'DamageDealt',
    sourceId: E1,
    targetId: CASTER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 30,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: E1 },
]
