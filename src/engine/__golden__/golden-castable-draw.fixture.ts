// Golden: the castable-filtered `gemSlot: 'random'` draw (Phase 4.1-C2b, ASSUMPTION 13). Win/loss
// is checked only AFTER TurnEnded, so a granted (bonus) cast after the killing blow runs against
// an already-EMPTY enemy side. Hand-derived.
//
// CASTER (player slot 0): HP 40, Int 10, attack 20, speed 20, always-attack; trait
// `bonus-caster-fixture` = innate-spell ENEMY_BOLT + an on-turn-end perform-action(self, cast
// 'random') at chancePercent 100 (4.1-E; was `bonus-cast`; the draws are unchanged). Fight setup
// PREPENDS innate spells (A8), so the equipped slots after createCombat are exactly
//   slot 0 = ENEMY_BOLT (enemy-side, innate)     slot 1 = HEAL_SPELL (ally-side, the gem)
// (asserted in the test). WOUNDABLE (player slot 1): HP 30, speed 10, always-wait.
// FOE (enemy): HP 10, attack 15, speed 30, always-attack. Queue: foe, caster, woundable.
//
// FOE -> lowest-HP player {caster 40, woundable 30} -> WOUNDABLE. raw 15+0.15 = 15.15 -> 15;
//   WOUNDABLE 30 -> 15.
// CASTER attacks FOE (only enemy): raw 20+0.2 = 20.2 -> 20; FOE 10 -> 0, dies. Enemy side empty.
// Turn-end hooks: none. Bonus cast: draw #1 (chance roll, 100% so it always passes) = 0.8341.
// Gem draw = draw #2 = 0.2492 (seed 8002: stream 0.8341, 0.2492, ...).
//   UNFILTERED draw over both non-null slots [enemy-bolt, heal]: index = floor(r*2):
//     r in [0, 0.5) -> slot 0 (ENEMY_BOLT), r in [0.5, 1) -> slot 1 (HEAL). r = 0.2492 -> slot 0,
//     the enemy spell -> no living enemy -> the cast FIZZLES (no SpellCast at all).
//   FILTERED draw over castable slots: ENEMY_BOLT has no living target, so the pool is exactly
//     [slot 1]: index = floor(r*1) = 0 -> slot 1 = HEAL, whatever r is.
// The heal's default target (no targeting, from the RESOLVED spell's side, B1) = lowest-hp-ally
//   {caster 40, woundable 15} -> WOUNDABLE. heal = Int 10 x 1 = 10; 15 + 10 = 25 <= max 30, so no
//   clamp. HealApplied.amount 10, remainingHp 25.
// Then TurnEnded, win (checked after TurnEnded).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8002

const CASTER = createCreatureId('caster')
const WOUNDABLE = createCreatureId('woundable')
const FOE = createCreatureId('foe')
const TRAIT_ID = 'bonus-caster-fixture'

export const ENEMY_BOLT: Spell = {
  id: 'enemy-bolt-fixture',
  name: 'Enemy Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 1,
    },
  ],
}

export const HEAL_SPELL: Spell = {
  id: 'heal-fixture',
  name: 'Test Heal',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'ally',
  unlockedAtBiome: 1,
  effects: [
    { kind: 'heal', target: { kind: 'cast-target' }, offStat: 'cast', spellPower: 1 },
  ],
}

export const BONUS_CASTER_FIXTURE: Trait = {
  id: 'bonus-caster-fixture',
  name: 'Bonus Caster (fixture)',
  effects: [
    { category: 'innate-spell', spell: ENEMY_BOLT },
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
  ],
}

export const traits: ReadonlyMap<string, Trait> = new Map([
  [BONUS_CASTER_FIXTURE.id, BONUS_CASTER_FIXTURE],
])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    health: 40,
    attack: 20,
    intelligence: 10,
    defence: 0,
    speed: 20,
    scriptId: 'always-attack',
    equippedSpells: [HEAL_SPELL],
    innateTraitIds: ['bonus-caster-fixture'],
  },
  { id: 'woundable', health: 30, defence: 0, speed: 10, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    health: 10,
    attack: 15,
    defence: 0,
    speed: 30,
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'AttackDeclared', attackerId: FOE, targetId: WOUNDABLE },
  {
    type: 'DamageDealt',
    sourceId: FOE,
    targetId: WOUNDABLE,
    rawDamage: 15.15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 15,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'AttackDeclared', attackerId: CASTER, targetId: FOE },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: FOE,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: FOE },
  // 4.1-E: the bonus cast is an on-turn-end `perform-action` grant -- the chance roll (draw #1)
  // happens in the turn-end hook pass, the grant runs in the granted-actions step.
  { type: 'TriggerFired', sourceId: CASTER, hook: 'on-turn-end', effectId: TRAIT_ID },
  { type: 'ActionGranted', sourceId: CASTER, actorId: CASTER, effectId: TRAIT_ID },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 1,
    targetId: WOUNDABLE,
  },
  {
    type: 'HealApplied',
    sourceId: CASTER,
    targetId: WOUNDABLE,
    amount: 10,
    remainingHp: 25,
  },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
