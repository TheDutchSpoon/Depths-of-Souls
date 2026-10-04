// Golden: B1 (Phase 4.1-C2b) -- a granted cast with an enemy-side single-target spell and no
// explicit targeting takes the SIDE-AWARE default: the LOWEST-HP enemy, not Phase 1's first
// living enemy by slot. Hand-derived.
//
// CASTER (player): Int 20, speed 20, always-wait (so the ONLY hit in the log is the granted cast),
// trait `granted-caster-fixture` = on-turn-end perform-action(self, cast 'random') at chancePercent
// 100 (re-expressed from `bonus-cast` in 4.1-E: the log gains TriggerFired + ActionGranted
// before the SpellCast; target/damage unchanged). Exactly ONE equipped spell,
// BOLT (enemy-side single target, spellPower 0.5). The trait has no innate-spell, so the slot
// list after createCombat is exactly [BOLT] (asserted in the test): the gem draw is a pool of
// one (index floor(r*1) = 0), so no gem-draw ambiguity muddies what this golden pins.
// Enemies (always-wait): A (slot 0, HP 50, speed 1) and B (slot 1, HP 30, speed 2). Slot 0 has
// MORE HP than slot 1, so the two defaults disagree: first-by-slot = A, lowest-HP = B.
// No Provoker, no Confusion, no Tunnel Vision, so the override pipeline (which every granted
// cast goes through since C2c) draws nothing here. All vitality (x1.0).
//
// One round (queue: caster 20, B 2, A 1), three turns:
//   CASTER waits. Turn-end: granted cast rolls (100%: passes whatever the draw), gem draw over
//   [slot 0] -> slot 0, target = default lowest-hp-enemy {A 50, B 30} -> B.
//     off = Int 20 x spellPower 0.5 = 10, def 0: core 10, chip 0.01*10 = 0.1 -> raw 10.1 -> final
//     10. B 30 - 10 = 20 (no kill -- the fight goes on -- and no clamp: remainingHp 20).
//   B waits; A waits. Fight not over (result null).
//
// With first-by-slot restored for the granted cast path, the cast hits A (remainingHp 40) instead.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9103
export const TURN_STEPS = 3 // caster, B, A

const CASTER = createCreatureId('caster')
const A = createCreatureId('a')
const B = createCreatureId('b')
const TRAIT_ID = 'granted-caster-fixture'

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

export const GRANTED_CASTER_FIXTURE: Trait = {
  id: 'granted-caster-fixture',
  name: 'Granted Caster (fixture)',
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
  ],
}

export const traits: ReadonlyMap<string, Trait> = new Map([
  [GRANTED_CASTER_FIXTURE.id, GRANTED_CASTER_FIXTURE],
])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    health: 40,
    intelligence: 20,
    speed: 20,
    scriptId: 'always-wait',
    equippedSpells: [BOLT],
    innateTraitIds: ['granted-caster-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'a', health: 50, defence: 0, speed: 1, scriptId: 'always-wait' },
  { id: 'b', health: 30, defence: 0, speed: 2, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  // 4.1-E: the granted cast is now an on-turn-end `perform-action` grant (chance = draw #1, then
  // drained in the granted-actions step: gem draw #2, target draw -> default, no draw).
  { type: 'TriggerFired', sourceId: CASTER, hook: 'on-turn-end', effectId: TRAIT_ID },
  { type: 'ActionGranted', sourceId: CASTER, actorId: CASTER, effectId: TRAIT_ID },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: B,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: B,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 20,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Waited', creatureId: B },
  { type: 'TurnEnded', creatureId: B },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
]
