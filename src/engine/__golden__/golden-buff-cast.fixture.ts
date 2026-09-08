// Golden: the Support-spell model's `stat-modifier` payload, AOE shape (Phase 4 Slice E) -- an
// ally-targeting AOE Cast freezes the caster's OWN living side (mirroring the enemy-AOE freeze
// rule) and reuses applyStatModifier directly per target (no TriggerFired -- Cast itself is the
// chosen-action context, not a trigger), emitting the same StatModifierApplied event a triggered
// stat-modifier would. The buff's magnitude (stat/factor) is an authored constant on the spell,
// NOT scaled by spellPower/powerPercent (Spell.statModifier's own doc comment).
//
// Hand-derived (independent `node -e` calculator). All vitality -> neutral affinity x1.0 on the
// one damage hit. BUFFER (speed 20) acts before ALLY (speed 10) before FOE (speed 1, never
// reached -- the fight ends on ALLY's turn).
//
//   BUFFER casts the AOE buff (+50% Defence, factor 1.5) at "all living allies" -- BUFFER's own
//   side, slot order [buffer, ally]:
//     buffer: effectiveBefore = getEffectiveStat(buffer,'defence') = 20 (base, no prior
//       modifiers) -> effectiveAfter = 20 x 1.5 = 30.
//     ally:   effectiveBefore = 10 -> effectiveAfter = 10 x 1.5 = 15.
//   ALLY->FOE (off 20, def 0): core 20, chip 0.01*20=0.2 -> raw 20.2 -> final 20.
//     FOE health 10 - 20 -> 0 -> dies. Enemy side empty -> win, on ALLY's own turn.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult, Spell } from '../types'

export const SEED = 6006 // No RNG consumed anywhere in this fixture; seed is inert.

const BUFFER = createCreatureId('buffer')
const ALLY = createCreatureId('ally')
const FOE = createCreatureId('foe')

export const BUFF_SPELL: Spell = {
  id: 'buff-fixture',
  name: 'Test Buff',
  targetShape: 'aoe',
  spellPower: 1, // unused -- stat-modifier's magnitude is the authored statModifier field.
  affinity: 'vitality',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 1.5 },
}

export const playerParty = makeParty('player', [
  {
    id: 'buffer',
    defence: 20,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-cast', // AOE ignores this script's (enemy-flavored) targeting field.
    equippedSpells: [BUFF_SPELL],
  },
  {
    id: 'ally',
    attack: 20,
    defence: 10,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    defence: 0,
    speed: 1,
    health: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BUFFER },
  {
    type: 'SpellCast',
    targetShape: 'aoe',
    casterId: BUFFER,
    gemSlot: 0,
    targetIds: [BUFFER, ALLY],
  },
  {
    type: 'StatModifierApplied',
    sourceId: BUFFER,
    targetId: BUFFER,
    stat: 'defence',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  {
    type: 'StatModifierApplied',
    sourceId: BUFFER,
    targetId: ALLY,
    stat: 'defence',
    factor: 1.5,
    effectiveBefore: 10,
    effectiveAfter: 15,
  },
  { type: 'TurnEnded', creatureId: BUFFER },
  { type: 'TurnStarted', creatureId: ALLY },
  { type: 'AttackDeclared', attackerId: ALLY, targetId: FOE },
  {
    type: 'DamageDealt',
    sourceId: ALLY,
    targetId: FOE,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'TurnEnded', creatureId: ALLY },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
