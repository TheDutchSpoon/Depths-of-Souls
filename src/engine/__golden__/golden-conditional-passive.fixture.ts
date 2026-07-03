// Golden: a conditional passive (BLOODLUST: +25% Attack while at full HP) folded at READ time.
// HERO carries bloodlust. At full HP its effective Attack is 20 × 1.25 = 25; once it has taken
// any damage the predicate goes false and Attack folds back to 20 — so the SAME creature's later
// hit is weaker (12 vs 17), with no explicit state change. This pins read-time stat folding.
//
// Hand-derived (independent `node -e` calculator, not by running the resolver). Both bodies →
// neutral affinity ×1.0; empty pools ×1.0. HERO (speed 10) acts before FOE (speed 5) each round.
//
//   R1 HERO→FOE (full HP, off = 20×1.25 = 25, def 8): core 17, chip 0.25 → raw 17.25 → 17. FOE 25→8.
//   R1 FOE→HERO (off 18, def 5):                       core 13, chip 0.18 → raw 13.18 → 13. HERO 30→17.
//   R2 HERO→FOE (17<30 HP, off 20, def 8):             core 12, chip 0.20 → raw 12.20 → 12. FOE 8→0, dies.
//
// HERO wins in round 2 before FOE's second turn (win/loss checked after each action).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 3003 // No RNG is consumed (deterministic targeting, no provokers); seed is inert.

const HERO = createCreatureId('hero')
const FOE = createCreatureId('foe')

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    health: 30,
    attack: 20,
    defence: 5,
    speed: 10,
    affinity: 'body',
    scriptId: 'always-attack',
    innateTraitIds: ['bloodlust'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    health: 25,
    attack: 18,
    defence: 8,
    speed: 5,
    affinity: 'body',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: FOE },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: FOE,
    rawDamage: 17.25,
    finalDamage: 17,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 8,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'AttackDeclared', attackerId: FOE, targetId: HERO },
  {
    type: 'DamageDealt',
    sourceId: FOE,
    targetId: HERO,
    rawDamage: 13.18,
    finalDamage: 13,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 17,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: FOE },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: FOE,
    rawDamage: 12.2,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
