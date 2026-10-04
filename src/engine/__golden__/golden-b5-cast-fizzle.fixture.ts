// Golden: B5 on the CAST path (Phase 4.1-C2c, PR #73 review) -- the twin of
// golden-b5-fizzle-rule4-retarget, which only covers executeAttack. A single-target DAMAGE spell
// followed by an `apply-status` effect, whose target is killed by an `on-cast` trigger during that instance's
// pre-hit hooks: the hit fizzles (no damage, no status), SpellCast stays, and the caster's second
// cast instance re-targets by rule 4. Hand-derived; no RNG (seed inert).
//
// CASTER (player, speed 20, Int 20, HP 40, script `always-cast` = slot 0, default target
// lowest-hp-enemy): slots after createCombat exactly [SMITE] (asserted). SMITE = single-target
// enemy-side damage spell, spellPower 1.0, then an `apply-status` Weaken effect (2 turns). One trait
// `b5-cast-fixture`:
//   (1) action-instance cast 30% -> the instance list is [100, 30];
//   (2) on-fight-start deal-damage 15 (flat) to `lowest-hp-enemy` (the wound: createCombat resets
//       every HP to full, so a "low-HP target" needs an in-fight wound);
//   (3) on-cast, condition hp-percent subject 'target' <= 30, deal-damage 99 (flat) to the
//       triggering source (the cast's target).
// Enemies (defence 0, always-wait): A slot 0 HP 30, B slot 1 HP 25, C slot 2 HP 20 (speeds 3,2,1).
//
// Fight start: lowest-hp-enemy over {30, 25, 20} = C (unique minimum, no tie): 20 - 15 = 5.
// Instance 1 (100%): default target lowest-hp-enemy over {A 30, B 25, C 5} = C. SpellCast(C).
//   on-cast: 5*100 = 500 <= 30*20 = 600 TRUE -> flat 99 on C -> 0, CreatureDied(C). B5: the target
//   died in its own pre-hook -> NO DamageDealt for the spell, NO StatusApplied.
// Instance 2 (30%): rule 4 -> lowest-HP survivor of {A 30, B 25} = B (first-by-slot would be A).
//   SpellCast(B). on-cast on B: 25*100 = 2500 <= 30*25 = 750 FALSE -> no trigger. Hit: off 20 x
//   (1.0 x 0.3) = 6, def 0 -> core 6, chip 0.06 -> raw 6.06 -> final 6; B 25 - 6 = 19 (no clamp).
//   Then Weaken lands on B (a LIVING target): StatusApplied(B, weaken, 1 stack, 2 turns).
// With the cast guard removed the log gains a DamageDealt on the dead C (the effect list runs), and
// with first-by-slot restored for rule 4 the second SpellCast targets A.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { WEAKEN } from '../../data/statuses'
import type { CombatEvent, Spell } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 9260 // No RNG consumed (no provoker, no random selector); seed is inert.
export const TURN_STEPS = 1 // CASTER's turn: both instances

const CASTER = createCreatureId('caster')
const B = createCreatureId('b')
const C = createCreatureId('c')

export const SMITE: Spell = {
  id: 'smite-fixture',
  name: 'Smite (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 1.0,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: WEAKEN.statusId, duration: 2 },
    },
  ],
}

export const B5_CAST_FIXTURE: Trait = {
  id: 'b5-cast-fixture',
  name: 'B5 cast (fixture)',
  effects: [
    { category: 'action-instance', actionKind: 'cast', powerPercent: 30 },
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
        flatAmount: 15,
        damageSource: 'cast',
      },
    },
    {
      category: 'triggered',
      hook: 'on-cast',
      condition: {
        kind: 'hp-percent',
        subject: 'target',
        qualifier: 'any',
        comparator: '<=',
        thresholdPercent: 30,
      },
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 99,
        damageSource: 'cast',
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
    scriptId: 'always-cast',
    equippedSpells: [SMITE],
    innateTraitIds: [B5_CAST_FIXTURE.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'a', health: 30, defence: 0, speed: 3, scriptId: 'always-wait' },
  { id: 'b', health: 25, defence: 0, speed: 2, scriptId: 'always-wait' },
  { id: 'c', health: 20, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [B5_CAST_FIXTURE.id, B5_CAST_FIXTURE],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [WEAKEN.statusId, WEAKEN],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-fight-start',
    effectId: B5_CAST_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: C,
    rawDamage: 15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 5,
    damageSource: 'cast',
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  // Instance 1 (100%): declared on C, killed by the on-cast trigger; the hit fizzles.
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: C,
  },
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-cast',
    effectId: B5_CAST_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: C,
    rawDamage: 99,
    finalDamage: 99,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'cast',
  },
  { type: 'CreatureDied', creatureId: C },
  // (no DamageDealt and no StatusApplied for the fizzled 100% instance)
  // Instance 2 (30%): rule 4 -> B (25 < A's 30); the trigger's condition is false.
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
    rawDamage: 6.06,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 19,
    damageSource: 'cast',
  },
  {
    type: 'StatusApplied',
    targetId: B,
    statusId: WEAKEN.statusId,
    stacks: 1,
    duration: 2,
    sourceId: CASTER,
  },
  { type: 'TurnEnded', creatureId: CASTER },
]
