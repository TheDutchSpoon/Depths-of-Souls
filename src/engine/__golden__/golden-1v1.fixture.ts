import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'

export const SEED = 1001

const HERO = createCreatureId('hero')
const GOBLIN = createCreatureId('goblin')

export const playerParty = makeParty('player', [
  { id: 'hero', attack: 22, defence: 14, speed: 18, health: 30, affinity: 'body' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'goblin', attack: 16, defence: 10, speed: 12, health: 24, affinity: 'body' },
])

/**
 * Hand-derived, not generated from the implementation. Hero acts first every round
 * (Speed 18 > 12), same affinity throughout (neutral, x1.0).
 *
 * Hero's hit:   core = max(22-10,0) = 12, chip = 0.01*22 = 0.22, raw = 12.22, final = 12.
 * Goblin's hit: core = max(16-14,0) = 2,  chip = 0.01*16 = 0.16, raw = 2.16,  final = 2.
 *
 * Round 1: hero hits goblin (24 -> 12); goblin hits back (30 -> 28).
 * Round 2: hero hits goblin again (12 -> 0, dies) -- the fight ends as a win right there,
 * before goblin's round-2 turn.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: GOBLIN },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: GOBLIN,
    rawDamage: 12.22,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 12,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: GOBLIN },
  { type: 'AttackDeclared', attackerId: GOBLIN, targetId: HERO },
  {
    type: 'DamageDealt',
    sourceId: GOBLIN,
    targetId: HERO,
    rawDamage: 2.16,
    finalDamage: 2,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 28,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: GOBLIN },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: GOBLIN },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: GOBLIN,
    rawDamage: 12.22,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: GOBLIN },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
