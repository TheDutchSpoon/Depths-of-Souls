// Golden: B1 (Phase 4.1-C2b) -- an ENEMY support caster whose script is the stock `always-cast`
// (no explicit targeting any more) casting an ALLY-side heal heals its OWN lowest-HP ally, never
// the opposing side (the review's finding B1, probe inverted). Hand-derived.
//
// All vitality (x1.0). Player: HERO (attack 15, speed 30, HP 100, always-attack). Enemy: SUPPORT
// (slot 0, HP 50, Int 10, speed 20, always-cast, slot 0 = ally-side heal, spellPower 1) and WARD
// (slot 1, HP 40, speed 10, always-wait). Three turns (one round): hero, support, ward.
//
// HERO -> lowest-HP enemy: {support 50, ward 40} -> WARD. core 15 - 0 = 15, chip 0.15 -> raw
//   15.15 -> final 15. WARD 40 - 15 = 25 (SUPPORT stays at full 50, so "lowest-HP ally" is a
//   real, contested extremum: {support 50, ward 25}).
// SUPPORT (always-cast, no targeting): the heal is ally-side, so the default is lowest-hp-ally
//   -> WARD (25 < 50). heal = Int 10 x spellPower 1 = 10; WARD 25 + 10 = 35 <= max 40, so NO
//   clamp hides the amount: HealApplied.amount 10, remainingHp 35.
// WARD waits.
//
// With the retired explicit `lowest-hp-enemy` selector the heal would land on HERO (full 100 HP:
// amount 0, remainingHp 100) -- a different log.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'

export const SEED = 9102 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3 // hero, support, ward

const HERO = createCreatureId('hero')
const SUPPORT = createCreatureId('support')
const WARD = createCreatureId('ward')

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

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    attack: 15,
    defence: 0,
    speed: 30,
    health: 100,
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'support',
    health: 50,
    intelligence: 10,
    defence: 0,
    speed: 20,
    scriptId: 'always-cast',
    equippedSpells: [HEAL_SPELL],
  },
  { id: 'ward', health: 40, defence: 0, speed: 10, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: WARD },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: WARD,
    rawDamage: 15.15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 25,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: SUPPORT },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: SUPPORT,
    gemSlot: 0,
    targetId: WARD,
  },
  {
    type: 'HealApplied',
    sourceId: SUPPORT,
    targetId: WARD,
    amount: 10,
    remainingHp: 35,
  },
  { type: 'TurnEnded', creatureId: SUPPORT },
  { type: 'TurnStarted', creatureId: WARD },
  { type: 'Waited', creatureId: WARD },
  { type: 'TurnEnded', creatureId: WARD },
]
