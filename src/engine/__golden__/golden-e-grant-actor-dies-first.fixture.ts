// Golden: 4.1-E (A2, ASSUMPTION 6) -- a queued grant whose ACTOR died before it runs is refused and
// emits nothing of its own (no ActionGranted, no action event); the earlier TriggerFired stays.
// Hand-derived.
//
// SETUP. Player: A (speed 30, HP 10, Int 20, defence 0, `always-cast`, [BOLT]) and O (speed 5,
// `always-wait`, trait `e-echo-fixture`: on-action-observed, ally, cast, chancePercent 100 ->
// perform-action(triggering-source, cast 'random' at 'random')). Enemy: FOE (speed 1, HP 100,
// defence 0, Attack 30, `always-wait`), trait `e-retaliate-fixture`: on-damage-taken ->
// deal-damage(triggering-source, offStat 'attack', spellPower 1).
//
// TURN 1 (A; TURN_STEPS = 1). A casts BOLT at FOE: SpellCast. Observation: O's chance (100%) passes
// -> TriggerFired; the echo is QUEUED for actor A. The hit lands: Int 20 x 0.5 = 10 vs defence 0 ->
// raw 10.1 -> 10; FOE 100 -> 90. FOE's on-damage-taken retaliation: TriggerFired(FOE), then a real
// Attack-flavoured hit on A: Attack 30 x 1 = 30 vs A's defence 0 -> core 30, chip 0.3 -> raw 30.3
// -> final 30; A 10 -> 0 (remainingHp clamps at 0), CreatureDied(A). The action is over; the queue
// drains: the grant's ACTOR (A) is dead -> refused, nothing emitted (a live actor would show
// ActionGranted, a SpellCast and a hit here). TurnEnded(A). Both sides still have a living member
// (O, FOE), so the fight continues. All vitality (x1.0).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4103
export const TURN_STEPS = 1

const A = createCreatureId('a')
const O = createCreatureId('o')
const FOE = createCreatureId('foe')

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

export const ECHO_FIXTURE: Trait = {
  id: 'e-echo-fixture',
  name: 'Echo (fixture, 100%)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      chancePercent: 100,
      response: {
        kind: 'perform-action',
        actor: 'triggering-source',
        intent: {
          action: { kind: 'cast', gemSlot: 'random' },
          targeting: { kind: 'random' },
        },
      },
    },
  ],
}

export const RETALIATE_FIXTURE: Trait = {
  id: 'e-retaliate-fixture',
  name: 'Retaliate (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        offStat: 'attack',
        spellPower: 1,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'a',
    health: 10,
    intelligence: 20,
    defence: 0,
    speed: 30,
    scriptId: 'always-cast',
    equippedSpells: [BOLT],
  },
  { id: 'o', speed: 5, scriptId: 'always-wait', innateTraitIds: [ECHO_FIXTURE.id] },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    health: 100,
    attack: 30,
    defence: 0,
    speed: 1,
    scriptId: 'always-wait',
    innateTraitIds: [RETALIATE_FIXTURE.id],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ECHO_FIXTURE.id, ECHO_FIXTURE],
  [RETALIATE_FIXTURE.id, RETALIATE_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'SpellCast', targetShape: 'single', casterId: A, gemSlot: 0, targetId: FOE },
  {
    type: 'TriggerFired',
    sourceId: O,
    hook: 'on-action-observed',
    effectId: ECHO_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: FOE,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 90,
    damageSource: 'cast',
  },
  {
    type: 'TriggerFired',
    sourceId: FOE,
    hook: 'on-damage-taken',
    effectId: RETALIATE_FIXTURE.id,
  },
  {
    type: 'DamageDealt',
    sourceId: FOE,
    targetId: A,
    rawDamage: 30.3,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: A },
  // The queued echo's actor (A) is dead: refused, nothing emitted -- no ActionGranted, no SpellCast.
  { type: 'TurnEnded', creatureId: A },
]
