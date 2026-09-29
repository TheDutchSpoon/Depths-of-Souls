// Golden: B1 (Phase 4.1-C2b) -- a bonus cast with an enemy-side single-target spell and no
// explicit targeting takes the SIDE-AWARE default: the LOWEST-HP enemy, not Phase 1's first
// living enemy by slot. Hand-derived.
//
// CASTER (player): Int 20, speed 20, always-wait (so the ONLY hit in the log is the bonus cast),
// trait `bonus-caster-fixture` = bonus-cast chancePercent 100. Exactly ONE equipped spell,
// BOLT (enemy-side single target, spellPower 0.5). The trait has no innate-spell, so the slot
// list after createCombat is exactly [BOLT] (asserted in the test): the gem draw is a pool of
// one (index floor(r*1) = 0), so no gem-draw ambiguity muddies what this golden pins.
// Enemies (always-wait): A (slot 0, HP 50, speed 1) and B (slot 1, HP 30, speed 2). Slot 0 has
// MORE HP than slot 1, so the two defaults disagree: first-by-slot = A, lowest-HP = B.
// No Provoker, no Confusion, no Tunnel Vision, so the override pipeline (which every granted
// cast goes through since C2c) draws nothing here. All vitality (x1.0).
//
// One round (queue: caster 20, B 2, A 1), three turns:
//   CASTER waits. Turn-end: bonus-cast rolls (100%: passes whatever the draw), gem draw over
//   [slot 0] -> slot 0, target = default lowest-hp-enemy {A 50, B 30} -> B.
//     off = Int 20 x spellPower 0.5 = 10, def 0: core 10, chip 0.01*10 = 0.1 -> raw 10.1 -> final
//     10. B 30 - 10 = 20 (no kill -- the fight goes on -- and no clamp: remainingHp 20).
//   B waits; A waits. Fight not over (result null).
//
// With first-by-slot restored for the bonus-cast path, the cast hits A (remainingHp 40) instead.

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

export const BOLT: Spell = {
  id: 'bolt-fixture',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'vitality',
}

export const BONUS_CASTER_FIXTURE: Trait = {
  id: 'bonus-caster-fixture',
  name: 'Bonus Caster (fixture)',
  effects: [{ category: 'bonus-cast', chancePercent: 100 }],
}

export const traits: ReadonlyMap<string, Trait> = new Map([
  [BONUS_CASTER_FIXTURE.id, BONUS_CASTER_FIXTURE],
])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    health: 40,
    intelligence: 20,
    speed: 20,
    scriptId: 'always-wait',
    equippedSpells: [BOLT],
    innateTraitIds: ['bonus-caster-fixture'],
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
