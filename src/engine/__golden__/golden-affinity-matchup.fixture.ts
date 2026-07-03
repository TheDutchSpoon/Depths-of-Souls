import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'

export const SEED = 3003

const HERO = createCreatureId('hero')
const WISP = createCreatureId('wisp')

// Body beats Spirit in the cycle (Body > Spirit > Mind > Void > Primal > Body), so
// hero's outgoing hits get the x1.25 advantage and wisp's return hits get the x0.75
// disadvantage -- the same pairing, viewed from both directions.
export const playerParty = makeParty('player', [
  { id: 'hero', attack: 20, defence: 10, speed: 15, health: 30, affinity: 'body' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'wisp', attack: 15, defence: 8, speed: 10, health: 25, affinity: 'spirit' },
])

/**
 * Hand-derived. Hero acts first every round (Speed 15 > 10).
 *
 * Hero's hit (body -> spirit, advantage x1.25):
 *   core = max(20-8,0) = 12, chip = 0.01*20 = 0.2, base = 12.2, raw = 12.2*1.25 = 15.25,
 *   final = 15.
 * Wisp's hit (spirit -> body, disadvantage x0.75):
 *   core = max(15-10,0) = 5, chip = 0.01*15 = 0.15, base = 5.15,
 *   raw = 5.15*0.75 = 3.8625000000000003 (float artifact -- exact IEEE-754 result of
 *   5.15*0.75 in JS, not a typo), final = 3.
 *
 * Round 1: hero hits wisp (25 -> 10); wisp hits back (30 -> 27).
 * Round 2: hero hits wisp again (10 -> 0, dies) -- win, before wisp's round-2 turn.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: WISP },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: WISP,
    rawDamage: 15.25,
    finalDamage: 15,
    affinityMultiplier: 1.25,
    wasChipOnly: false,
    remainingHp: 10,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: WISP },
  { type: 'AttackDeclared', attackerId: WISP, targetId: HERO },
  {
    type: 'DamageDealt',
    sourceId: WISP,
    targetId: HERO,
    rawDamage: 3.8625000000000003,
    finalDamage: 3,
    affinityMultiplier: 0.75,
    wasChipOnly: false,
    remainingHp: 27,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: WISP },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: WISP },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: WISP,
    rawDamage: 15.25,
    finalDamage: 15,
    affinityMultiplier: 1.25,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: WISP },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
