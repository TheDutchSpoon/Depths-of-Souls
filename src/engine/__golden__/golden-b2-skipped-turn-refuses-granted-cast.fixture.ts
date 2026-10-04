// Golden: B2.1 (Phase 4.1-C2c) -- a creature whose turn was SKIPPED takes no granted action
// either, even though the lock is gone by the granted-actions step; the granted cast's chance is
// still ROLLED first, so the RNG stream doesn't depend on the skip. Hand-derived.
//
// CASTER (player, speed 20, Int 20, HP 40, defence 0): trait `b2-stunned-granted-caster-fixture` =
//   [on-turn-end perform-action(self, cast 'random') chancePercent 100 (4.1-E; was `bonus-cast`),
//    on-fight-start apply-status Stun (self),
//    on-turn-end remove-status Stun (self)].
// Slots after createCombat (asserted in the test): exactly [BOLT] (enemy-side single target,
// spellPower 0.5) -- so if the gate were removed there IS something castable to cast.
// Round 1, CASTER's turn: Stun (applied at fight start) suppresses at turn start -> `suppressed`
// is true, no action. The turn-end hooks fire in effect order: the grant's trigger (chance roll =
// draw #1, queued), then the remove-status trigger REMOVES Stun, so by the granted-actions step no
// lock exists: checkLegality alone would let the cast through. Only the skipped-turn GATE
// (`drainGrantedActions`' `skippedTurnOf`) refuses it (this is what separates B2.1 from B2.2). The
// gate sits AFTER the roll: the chance roll is draw #1 at trigger time, whatever the skip.
//
// LATER RNG CONSUMER: E1 (enemy, speed 10, Attack 10, script `random-attack` = attack a
// `random-enemy`) acts next and picks uniformly among the player side's living creatures in slot
// order [CASTER, D1, D2] with draw floor(r * 3). Seed 9200's mulberry32 draws (independent node
// trace): #1 0.8779, #2 0.3225, #3 0.3805.
//   - As built: draw #1 = the grant's chance roll (100% -> passes whatever it is, but IS
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
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
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

export const STUNNED_GRANTED_CASTER: Trait = {
  id: 'b2-stunned-granted-caster-fixture',
  name: 'Stunned Granted Caster (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      chancePercent: 100,
      response: {
        kind: 'perform-action',
        actor: 'self',
        intent: { action: { kind: 'cast', gemSlot: 'random' } },
      },
    },
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
    innateTraitIds: [STUNNED_GRANTED_CASTER.id],
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
  [STUNNED_GRANTED_CASTER.id, STUNNED_GRANTED_CASTER],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([[STUN.statusId, STUN]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-fight-start',
    effectId: STUNNED_GRANTED_CASTER.id,
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
  // The grant's trigger (declared first, so it fires first): the chance is rolled (draw #1) ...
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-end',
    effectId: STUNNED_GRANTED_CASTER.id,
  },
  // ... then the remove-status trigger removes the Stun -- the lock is gone before the
  // granted-actions step.
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-end',
    effectId: STUNNED_GRANTED_CASTER.id,
  },
  { type: 'StatusExpired', creatureId: CASTER, statusId: STUN.statusId },
  // The grant was then refused by the skipped-turn gate: NO ActionGranted, NO SpellCast, NO
  // DamageDealt here.
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
