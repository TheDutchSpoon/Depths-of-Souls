// Golden: what damage observation must NOT react to (Phase 4.1-H2b1, ASSUMPTIONS 115, 132, 137).
// Hand-derived. The observer O is Flare-shaped (`relationship 'ally'`, `selfInflicted true`) and
// answers with Attack x1.5 on itself; so ANY `TriggerFired` from O would show. Three damage events
// that are not costs, one zero cost, and O stays silent through all of them:
//
//   Player side: C (LEVEL 1, health 60, Intelligence 40, Defence 8, speed 40, `cast-slot-0`)
//                Z (health 30, speed 30, always-wait) ZERO: on-turn-start flat 1% of its own Health
//                O (health 40, speed 5, always-wait) WATCH
//                A (health 25, Defence 10, speed 4, always-wait)
//   Enemy side:  E (Attack 30, speed 20, always-attack at the lowest-HP enemy, level 11)
//   All vitality (affinity x1.0). TURN_STEPS = 5: C, Z, E, O, A.
//
// 1. C casts SELF_HIT: a single enemy-side spell (aimed at E) whose one effect hits `self` (the
//    caster) with `deal-damage`, `offStat 'cast'` x spellPower 0.5: off = 40 x 0.5 = 20. DIRECT
//    (the channel follows the action, not the target; same numbers as golden-h2a-spell-on-caster):
//    core max(20 - 8, 0) = 12, chip 0.2 -> raw 12.2 -> 12; the Additional reads C's own level and
//    max Health: min(floor(60 x 20 / 100) = 12, max(0, 10 - 0) = 10) = 10; final 22; C 60 -> 38.
//    source === target here, but it is not a cost: O is SILENT. (Reading "self-inflicted" as
//    `source === target` would fire O.)
// 2. Z's turn start: ZERO is flat 1% of Z's Health = floor(30 x 1 / 100) = floor(0.3) = 0. A cost
//    of 0 is a full no-op (ASSUMPTION 132): TriggerFired shows (ASSUMPTION 138), then NOTHING: no
//    DamageDealt, so nothing to observe.
// 3. E attacks the lowest-HP player: C 38, Z 30, O 40, A 25 -> A. Attack 30 vs Defence 10: core
//    20, chip 0.3 -> raw 20.3 -> 20; E is level 11, so no Additional. A 25 -> 5. An ordinary direct
//    hit on an ally (selfInflicted false): O is SILENT. (Dropping the selfInflicted filter fires O
//    on this hit and on step 1.)

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 8202 // No RNG consumed; seed is inert.
export const TURN_STEPS = 5

const C = createCreatureId('c')
const Z = createCreatureId('z')
const E = createCreatureId('e')
const A = createCreatureId('a')

export const SELF_HIT: Spell = {
  id: 'h2b1-self-hit',
  name: 'Self hit (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    { kind: 'deal-damage', target: { kind: 'self' }, offStat: 'cast', spellPower: 0.5 },
  ],
}

export const CAST_SLOT_0: Script = {
  id: 'h2b1-cast-slot-0',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
}

export const ZERO: Trait = {
  id: 'h2b1-zero-cost',
  name: 'Zero cost (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { ofStat: 'health', percent: 1 },
      },
    },
  ],
}

export const WATCH: Trait = {
  id: 'h2b1-watch',
  name: 'Watch costs (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-observed',
      observationFilter: { relationship: 'ally', selfInflicted: true },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.5,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'c',
    level: 1,
    health: 60,
    intelligence: 40,
    defence: 8,
    speed: 40,
    scriptId: CAST_SLOT_0.id,
    equippedSpells: [SELF_HIT],
  },
  { id: 'z', health: 30, speed: 30, scriptId: 'always-wait', innateTraitIds: [ZERO.id] },
  { id: 'o', health: 40, speed: 5, scriptId: 'always-wait', innateTraitIds: [WATCH.id] },
  { id: 'a', health: 25, defence: 10, speed: 4, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 100, attack: 30, speed: 20, scriptId: 'always-attack' },
])

export const scripts = new Map([...FIXTURE_SCRIPTS_BY_ID, [CAST_SLOT_0.id, CAST_SLOT_0]])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ZERO.id, ZERO],
  [WATCH.id, WATCH],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: C },
  { type: 'SpellCast', targetShape: 'single', casterId: C, gemSlot: 0, targetId: E },
  {
    type: 'DamageDealt',
    sourceId: C,
    targetId: C,
    rawDamage: 12.2,
    finalDamage: 22,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 38,
    damageSource: 'cast',
  },
  // (O is silent: a direct spell effect on its own caster is not a cost)
  { type: 'TurnEnded', creatureId: C },
  { type: 'TurnStarted', creatureId: Z },
  { type: 'TriggerFired', sourceId: Z, hook: 'on-turn-start', effectId: ZERO.id },
  // (no DamageDealt: a cost of 0 is a full no-op, so there is nothing to observe)
  { type: 'Waited', creatureId: Z },
  { type: 'TurnEnded', creatureId: Z },
  { type: 'TurnStarted', creatureId: E },
  { type: 'AttackDeclared', attackerId: E, targetId: A },
  {
    type: 'DamageDealt',
    sourceId: E,
    targetId: A,
    rawDamage: 20.3,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 5,
    damageSource: 'attack',
  },
  // (O is silent: an ordinary hit on an ally)
  { type: 'TurnEnded', creatureId: E },
  { type: 'TurnStarted', creatureId: createCreatureId('o') },
  { type: 'Waited', creatureId: createCreatureId('o') },
  { type: 'TurnEnded', creatureId: createCreatureId('o') },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
]
