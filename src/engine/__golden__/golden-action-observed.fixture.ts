// Golden: the general action-observation system (Phase 4 Slice E2) -- Resonants' own locked
// consumer shape (`relationship: 'ally'`, `actionKind: 'cast'`), fired on `on-action-observed`
// per action INSTANCE. CASTER carries an Echo-shaped extra-cast-instance passive (reusing the
// already-built action-instance-list mechanism, Slice B) so its Cast resolves as TWO instances;
// RESONANT (an ally observer, not the actor) reacts to EACH instance independently, proving
// "an ally's Echo/Flurry multi-cast is observed once per instance" (CONVENTIONS).
//
// Hand-derived (independent `node -e` calculator). All vitality -> neutral affinity x1.0.
// CASTER (speed 20) acts; RESONANT/ENEMY never act this turn (RESONANT has no script needed --
// it only reacts; ENEMY is scripted always-wait and never reached, speed 1).
//
//   Instance 0: on-action-observed fires on RESONANT (ally, cast -- matches) BEFORE the hit:
//     StatModifierApplied attack 10 -> 11 (x1.1). Then the spell hits: off = Int(10) x
//     spellPower(1.0) = 10; def 0 -> core 10, chip 0.1 -> raw 10.1 -> final 10. ENEMY 1000 -> 990.
//   Instance 1: on-action-observed fires on RESONANT again: StatModifierApplied attack
//     11 -> 12.100000000000001 (x1.1, float-imprecise at full precision). Same hit again:
//     raw 10.1 -> final 10. ENEMY 990 -> 980.
//
// ENEMY (relationship enemy, not ally) and CASTER itself never receive the observation --
// only RESONANT's filter matches.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 6161 // No RNG consumed anywhere in this fixture; seed is inert.

const CASTER = createCreatureId('caster')
const RESONANT = createCreatureId('resonant')
const ENEMY = createCreatureId('enemy')

export const TEST_SPELL: Spell = {
  id: 'test-observed-spell',
  name: 'Test Spell',
  targetShape: 'single',
  spellPower: 1,
  affinity: 'vitality',
}

export const ECHO_CAST_FIXTURE: Trait = {
  id: 'echo-cast-fixture',
  name: 'Echo Cast (fixture)',
  effects: [{ category: 'action-instance', actionKind: 'cast', powerPercent: 100 }],
}

export const RESONANT_FIXTURE: Trait = {
  id: 'resonant-fixture',
  name: 'Resonant (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    intelligence: 10,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-cast',
    innateTraitIds: ['echo-cast-fixture'],
    equippedSpells: [TEST_SPELL],
  },
  {
    id: 'resonant',
    attack: 10,
    speed: 5,
    affinity: 'vitality',
    innateTraitIds: ['resonant-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'enemy',
    health: 1000,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ECHO_CAST_FIXTURE.id, ECHO_CAST_FIXTURE],
  [RESONANT_FIXTURE.id, RESONANT_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: ENEMY,
  },
  {
    type: 'TriggerFired',
    sourceId: RESONANT,
    hook: 'on-action-observed',
    effectId: 'resonant-fixture',
  },
  {
    type: 'StatModifierApplied',
    sourceId: RESONANT,
    targetId: RESONANT,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 10,
    effectiveAfter: 11,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: ENEMY,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 990,
    damageSource: 'cast',
  },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: ENEMY,
  },
  {
    type: 'TriggerFired',
    sourceId: RESONANT,
    hook: 'on-action-observed',
    effectId: 'resonant-fixture',
  },
  {
    type: 'StatModifierApplied',
    sourceId: RESONANT,
    targetId: RESONANT,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 11,
    effectiveAfter: 12.100000000000001,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: ENEMY,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 980,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CASTER },
]
