// Golden: the Additional's 20%-of-max-HP bound (Phase 4.1-H2a, ASSUMPTION 110). Hand-derived.
// A level-1 attacker's cap is 10, but the target's max Health is only 20, so the 20% bound binds:
//   additional = min( floor(20 x 20 / 100) = 4, max(0, 10 - 0) = 10 ) = 4.
//
// ATTACKER (level 1, Attack 20, speed 10) -> TARGET (health 20, defence 5, always-wait): off 20,
// core 15, chip 0.2 -> raw 15.2 -> 15; final 15 + 4 = 19. TARGET 20 -> 1 (it survives: the bound
// is what keeps a fresh enemy alive through a first hit; without it the cap's 10 would deal 25).
// All vitality, neutral x1.0. TURN_STEPS = 1.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'

export const SEED = 8102 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const ATTACKER = createCreatureId('attacker')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  { id: 'attacker', level: 1, attack: 20, speed: 10, scriptId: 'always-attack' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'target', health: 20, defence: 5, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: TARGET,
    rawDamage: 15.2,
    finalDamage: 19,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 1,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
]
