import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import type { Script } from '../scripting-types'

export const SEED = 2002

const HERO = createCreatureId('hero')
const SENTRY = createCreatureId('sentry')

export const DEFEND_THEN_ATTACK_SCRIPT: Script = {
  id: 'defend-then-attack',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '<=', round: 1 },
      action: { kind: 'defend' },
    },
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

export const scripts = new Map([
  [DEFEND_THEN_ATTACK_SCRIPT.id, DEFEND_THEN_ATTACK_SCRIPT],
])

// Hero has no script assigned -- exercises the implicit fallback (Attack the default
// target) rather than an authored rule, same as every Phase 1 fixture.
export const playerParty = makeParty('player', [
  { id: 'hero', attack: 20, defence: 30, speed: 10, health: 20, affinity: 'body' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'sentry',
    attack: 5,
    defence: 10,
    speed: 20,
    health: 13,
    affinity: 'body',
    scriptId: 'defend-then-attack',
  },
])

/**
 * Hand-derived, not generated from the implementation. Sentry acts first every round
 * (Speed 20 > 10). Same affinity throughout (neutral, x1.0).
 *
 * Round 1: sentry's round-number<=1 rule fires -> Defend (defence 10*1.5=15, taken
 * factor 0.65). Hero's hit: core=max(20-15,0)=5, chip=0.01*20=0.2, raw=5.2*0.65=3.38
 * mathematically (5.2 * 0.65 lands on 3.3800000000000003 in IEEE-754 float -- a binary
 * floating-point representation artifact, not an engine bug; see damage.ts's own
 * "floor once, never per-term" note), final=floor(3.38...)=3. Sentry: 13 -> 10.
 *
 * Round 2: sentry's Defend from round 1 expires (cleared before it decides this turn's
 * action), so round-number<=1 is now false -> its fallthrough rule fires -> Attack hero.
 * Sentry's hit: core=max(5-30,0)=0, chip=0.05, raw=0.05 -> final=1 (chip-only). Hero:
 * 20 -> 19. Hero's hit (sentry no longer defending): core=max(20-10,0)=10, chip=0.2,
 * raw=10.2, final=10. Sentry: 10 -> 0, dies -- the fight ends as a win right there,
 * before any further turns.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: SENTRY },
  { type: 'Defended', creatureId: SENTRY },
  { type: 'TurnEnded', creatureId: SENTRY },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: SENTRY },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: SENTRY,
    rawDamage: 3.3800000000000003,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 10,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: SENTRY },
  { type: 'AttackDeclared', attackerId: SENTRY, targetId: HERO },
  {
    type: 'DamageDealt',
    sourceId: SENTRY,
    targetId: HERO,
    rawDamage: 0.05,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 19,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: SENTRY },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: SENTRY },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: SENTRY,
    rawDamage: 10.2,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: SENTRY },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
