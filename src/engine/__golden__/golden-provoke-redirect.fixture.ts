import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import type { Script } from '../scripting-types'

export const SEED = 5005

const HERO = createCreatureId('hero')
const PROVOKER = createCreatureId('provoker')
const WEAKLING = createCreatureId('weakling')

export const ATTACK_LOWEST_SCRIPT: Script = {
  id: 'attack-lowest',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}
export const ALWAYS_PROVOKE_SCRIPT: Script = {
  id: 'always-provoke',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'provoke' } }],
}
export const ALWAYS_WAIT_SCRIPT: Script = {
  id: 'always-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const scripts = new Map([
  [ATTACK_LOWEST_SCRIPT.id, ATTACK_LOWEST_SCRIPT],
  [ALWAYS_PROVOKE_SCRIPT.id, ALWAYS_PROVOKE_SCRIPT],
  [ALWAYS_WAIT_SCRIPT.id, ALWAYS_WAIT_SCRIPT],
])

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    attack: 10,
    defence: 10,
    health: 50,
    speed: 20,
    affinity: 'body',
    scriptId: 'attack-lowest',
  },
])

// weakling has lower HP than provoker -- what lowest-hp-enemy would naturally pick
// absent an active Provoke.
export const enemyParty = makeParty('enemy', [
  {
    id: 'provoker',
    defence: 0,
    health: 20,
    speed: 30,
    affinity: 'body',
    scriptId: 'always-provoke',
  },
  {
    id: 'weakling',
    defence: 0,
    health: 10,
    speed: 10,
    affinity: 'body',
    scriptId: 'always-wait',
  },
])

/**
 * Hand-derived, not generated from the implementation. Turn order (Speed desc):
 * provoker(30), hero(20), weakling(10). Every hero hit: core=max(10-0,0)=10,
 * chip=0.01*10=0.1, raw=10.1 (neutral affinity, x1.0), final=10.
 *
 * Rounds 1-2: provoker provokes every turn (the sole provoker throughout), so hero's
 * lowest-hp-enemy selector is overridden -- with exactly one provoker the RNG draw's
 * index is forced to 0, so hero attacks provoker (20 HP) instead of the naturally
 * lower-HP weakling (10 HP), needing 2 hits to kill it (20 -> 10 -> 0).
 *
 * Round 3: provoker is dead (excluded from the round-start queue entirely), so the
 * override no longer applies -- hero's selector resolves normally to weakling (the only
 * living enemy), killing it in one hit and ending the fight as a win, before weakling
 * ever gets a round-3 turn.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: PROVOKER },
  { type: 'Provoked', creatureId: PROVOKER },
  { type: 'TurnEnded', creatureId: PROVOKER },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: PROVOKER },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: PROVOKER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 10,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: WEAKLING },
  { type: 'Waited', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: WEAKLING },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: PROVOKER },
  { type: 'Provoked', creatureId: PROVOKER },
  { type: 'TurnEnded', creatureId: PROVOKER },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: PROVOKER },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: PROVOKER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: PROVOKER },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: WEAKLING },
  { type: 'Waited', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: WEAKLING },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: WEAKLING },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: WEAKLING,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
