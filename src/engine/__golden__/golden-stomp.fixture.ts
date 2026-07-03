import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'

export const SEED = 2002

const STOMPER = createCreatureId('stomper')
const WEAKLING = createCreatureId('weakling')

// Stomper is slower on purpose, so the weakling's chip-floor-only hit actually lands
// (and is visible in the log) before the stomper's dominant hit finishes it off.
export const playerParty = makeParty('player', [
  { id: 'stomper', attack: 40, defence: 30, speed: 10, health: 50, affinity: 'body' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'weakling', attack: 5, defence: 1, speed: 20, health: 60, affinity: 'body' },
])

/**
 * Hand-derived. Weakling acts first every round (Speed 20 > 10), same affinity
 * throughout (neutral, x1.0).
 *
 * Weakling's hit: offStat(5) <= stomper's defence(30), so core = 0 -- chip-floor-only.
 *   chip = 0.01*5 = 0.05, raw = 0.05, final = MAX(1, floor(0.05)) = 1, wasChipOnly: true.
 * Stomper's hit: core = max(40-1,0) = 39, chip = 0.01*40 = 0.4, raw = 39.4, final = 39,
 *   wasChipOnly: false -- the core completely dominates.
 *
 * Round 1: weakling chips stomper (50 -> 49); stomper stomps weakling (60 -> 21).
 * Round 2: weakling chips again (49 -> 48); stomper's second stomp (21 -> 0, dies).
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: WEAKLING },
  { type: 'AttackDeclared', attackerId: WEAKLING, targetId: STOMPER },
  {
    type: 'DamageDealt',
    sourceId: WEAKLING,
    targetId: STOMPER,
    rawDamage: 0.05,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 49,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: WEAKLING },
  { type: 'TurnStarted', creatureId: STOMPER },
  { type: 'AttackDeclared', attackerId: STOMPER, targetId: WEAKLING },
  {
    type: 'DamageDealt',
    sourceId: STOMPER,
    targetId: WEAKLING,
    rawDamage: 39.4,
    finalDamage: 39,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 21,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: STOMPER },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: WEAKLING },
  { type: 'AttackDeclared', attackerId: WEAKLING, targetId: STOMPER },
  {
    type: 'DamageDealt',
    sourceId: WEAKLING,
    targetId: STOMPER,
    rawDamage: 0.05,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 48,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: WEAKLING },
  { type: 'TurnStarted', creatureId: STOMPER },
  { type: 'AttackDeclared', attackerId: STOMPER, targetId: WEAKLING },
  {
    type: 'DamageDealt',
    sourceId: STOMPER,
    targetId: WEAKLING,
    rawDamage: 39.4,
    finalDamage: 39,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: STOMPER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
