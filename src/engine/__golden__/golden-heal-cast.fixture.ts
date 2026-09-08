// Golden: the Support-spell model's `heal` payload (Phase 4 Slice E) -- a single-target
// ally-targeting Cast reuses applyHeal directly (no TriggerFired -- Cast itself is the chosen-
// action context, not a trigger). Magnitude is the SAME resolveSpellOffStat a damage spell would
// compute (scalingStat absent -> remap-aware Intelligence, x spellPower); applied as HP restored,
// clamped to effective max Health (no overheal).
//
// Hand-derived (independent `node -e` calculator). All vitality -> neutral affinity x1.0 on the
// one damage hit in this fixture. ENEMY (speed 30) acts before HEALER (speed 20) before WOUNDED
// (speed 10) -- a single round, three turns, fight over.
//
//   ENEMY->WOUNDED (off 15, def 0):  core 15, chip 0.01*15=0.15 -> raw 15.15 -> final 15.
//     WOUNDED currentHp 30 - 15 -> 15 (strictly the lowest-HP player creature already, at 30 vs
//     HEALER's full 40, so ENEMY's always-attack/lowest-hp-enemy pick is unambiguous).
//   HEALER casts the heal spell at its script's lowest-hp-ally pick: allies {healer: 40 (full),
//     wounded: 15} -> WOUNDED, unambiguously lowest. offStat = getOffensiveStat(healer,'cast',1)
//     = intelligence 20 x 1 = 20. newHp = min(maxHp 30, 15+20=35) = 30 (clamped -- exercises the
//     "no overheal" rule). HealApplied.amount = 30-15 = 15, remainingHp = 30.
//   WOUNDED->ENEMY (off 20, def 0):  core 20, chip 0.01*20=0.2 -> raw 20.2 -> final 20.
//     ENEMY health 10 - 20 -> 0 -> dies. Enemy side empty -> win, on WOUNDED's own turn (ENEMY's
//     queued turn already happened first; no fourth turn is reached).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 5005 // No RNG consumed anywhere in this fixture; seed is inert.

const ENEMY = createCreatureId('enemy')
const HEALER = createCreatureId('healer')
const WOUNDED = createCreatureId('wounded')

export const HEAL_SPELL: Spell = {
  id: 'heal-fixture',
  name: 'Test Heal',
  targetShape: 'single',
  spellPower: 1,
  affinity: 'vitality',
  targetSide: 'ally',
  payload: 'heal',
}

/** Real stock scripts have no ally-targeting rule (ALWAYS_CAST_SCRIPT's targeting is
 * lowest-hp-enemy) -- a fixture-only script authored for this slice's own tests, not real
 * content (per the brief: "at least one demo/fixture spell per new shape... for this slice's
 * own tests; the real spell set is authored in H1-H3"). */
export const HEAL_LOWEST_ALLY_SCRIPT: Script = {
  id: 'heal-lowest-ally-fixture',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-ally' },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'healer',
    intelligence: 20,
    speed: 20,
    health: 40,
    affinity: 'vitality',
    scriptId: 'heal-lowest-ally-fixture',
    equippedSpells: [HEAL_SPELL],
  },
  {
    id: 'wounded',
    attack: 20,
    defence: 0,
    speed: 10,
    health: 30,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'enemy',
    attack: 15,
    defence: 0,
    speed: 30,
    health: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [HEAL_LOWEST_ALLY_SCRIPT.id, HEAL_LOWEST_ALLY_SCRIPT],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ENEMY },
  { type: 'AttackDeclared', attackerId: ENEMY, targetId: WOUNDED },
  {
    type: 'DamageDealt',
    sourceId: ENEMY,
    targetId: WOUNDED,
    rawDamage: 15.15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 15,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ENEMY },
  { type: 'TurnStarted', creatureId: HEALER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: HEALER,
    gemSlot: 0,
    targetId: WOUNDED,
  },
  {
    type: 'HealApplied',
    sourceId: HEALER,
    targetId: WOUNDED,
    amount: 15,
    remainingHp: 30,
  },
  { type: 'TurnEnded', creatureId: HEALER },
  { type: 'TurnStarted', creatureId: WOUNDED },
  { type: 'AttackDeclared', attackerId: WOUNDED, targetId: ENEMY },
  {
    type: 'DamageDealt',
    sourceId: WOUNDED,
    targetId: ENEMY,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: ENEMY },
  { type: 'TurnEnded', creatureId: WOUNDED },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
