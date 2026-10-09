// Golden: B2.3 (Phase 4.1-C2c) -- a CONFUSED creature's granted cast goes through the override
// pipeline like any action: Confusion can redirect it to the caster's own side. Hand-derived.
//
// CASTER (player, slot 0, speed 20, Int 20, always-wait): trait `b2-confused-granted-caster-fixture`
// = [on-turn-end perform-action(self, cast 'random') chancePercent 100 (4.1-E; was `bonus-cast`),
// on-fight-start apply-status Confusion (self, 3 turns)].
// Confusion = 50% friendly-fire (data/statuses.ts). Slots after createCombat (asserted): [BOLT]
// (enemy-side single target, spellPower 0.5). Allies: A1 (slot 1), A2 (slot 2), HP 40 each.
// Enemies: E1 (slot 0, HP 50), E2 (slot 1, HP 30) -- the side-aware default target would be E2.
//
// Seed 9229's draws (independent mulberry32 trace): #1 0.0425, #2 0.8804, #3 0.2319, #4 0.7761.
// Turn end, the grant: #1 chance roll (100%: passes) at trigger time. Drained: runAction: legal; gem draw #2 over the one
// castable slot -> 0; target: default lowest-hp-enemy is NOT consulted because Confusion is
// checked FIRST: roll #3 = 0.2319 < 0.50 -> redirect; ally pick #4 = 0.7761 over the LIVING ALLIES
// [CASTER, A1, A2] (the caster is an ally of itself) -> floor(0.7761 * 3) = floor(2.33) = 2 -> A2.
// So the cast lands on A2. BOLT: Int 20 x 0.5 = 10, A2 defence 0 -> core 10, chip 0.1 -> raw
// 10.1 -> final 10; A2 40 - 10 = 30 (no clamp). Vitality throughout (x1.0).
// Before C2c (granted casts skipped the override pipeline) the cast hit E2 (the default
// lowest-HP enemy) and drew nothing after the gem.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { CONFUSION } from '../../data/statuses'
import type { CombatEvent, Spell } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 9229
export const TURN_STEPS = 1 // CASTER: waits, then the granted cast at turn end

const CASTER = createCreatureId('caster')
const A2 = createCreatureId('a2')

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

export const CONFUSED_GRANTED_CASTER: Trait = {
  id: 'b2-confused-granted-caster-fixture',
  name: 'Confused Granted Caster (fixture)',
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
        status: { statusId: CONFUSION.statusId, duration: 3 },
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
    innateTraitIds: [CONFUSED_GRANTED_CASTER.id],
  },
  { id: 'a1', health: 40, defence: 0, speed: 5, scriptId: 'always-wait' },
  { id: 'a2', health: 40, defence: 0, speed: 4, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e1', health: 50, defence: 0, speed: 2, scriptId: 'always-wait' },
  { id: 'e2', health: 30, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [CONFUSED_GRANTED_CASTER.id, CONFUSED_GRANTED_CASTER],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [CONFUSION.statusId, CONFUSION],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-fight-start',
    effectId: CONFUSED_GRANTED_CASTER.id,
  },
  {
    type: 'StatusApplied',
    targetId: CASTER,
    statusId: CONFUSION.statusId,
    duration: 3,
    sourceId: CASTER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  // 4.1-E: the granted cast is an on-turn-end `perform-action` grant (chance roll #1 at trigger
  // time); ActionGranted comes once the grant runs and is accepted (after draws #2-#4).
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-end',
    effectId: CONFUSED_GRANTED_CASTER.id,
  },
  {
    type: 'ActionGranted',
    sourceId: CASTER,
    actorId: CASTER,
    effectId: CONFUSED_GRANTED_CASTER.id,
  },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: A2,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: A2,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 30,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CASTER },
]
