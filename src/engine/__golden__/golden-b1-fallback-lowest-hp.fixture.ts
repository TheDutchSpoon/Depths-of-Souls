// Golden: B1 (Phase 4.1-C2b) -- the implicit fallback is an ordinary intent (`{ action: attack }`,
// no targeting), so it resolves through the pipeline's SIDE-AWARE default: the LOWEST-HP enemy,
// not Phase 1's first-living-by-slot. Hand-derived.
//
// HERO is script-less (scriptId null -> the fallback every turn), attack 40, all vitality (x1.0).
// Enemies: A (slot 0, HP 25) and B (slot 1, HP 15). Slot 0 has MORE HP than slot 1, so the two
// rules disagree: first-by-slot = A, lowest-HP = B. (Two distinct candidates: the extremum is
// actually contested; damage 40 >= both HPs, so the pick shows in the log via targetId, and no
// clamp hides it -- the covered value is WHICH enemy, not the damage number.)
//
// Round 1 (queue by speed: hero 20, B 2, A 1):
//   HERO -> B (lowest HP, 15 < 25): core 40 - 0 = 40, chip 0.01*40 = 0.4 -> raw 40.4 -> final 40;
//     B 15 - 40 -> 0, dies. B's own queued turn is an empty bracket (dead before its turn).
//   A waits (always-wait).
// Round 2: HERO -> A (the only living enemy): raw 40.4 -> 40; A 25 - 40 -> 0, dies. Win.
//
// With the retired first-by-slot default, round 1 would hit A instead (targetId A) -- this golden
// fails if that default returns.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 9101 // No RNG consumed; seed is inert.

const HERO = createCreatureId('hero')
const A = createCreatureId('a')
const B = createCreatureId('b')

export const playerParty = makeParty('player', [
  { id: 'hero', attack: 40, defence: 0, speed: 20, health: 40, scriptId: null },
])

export const enemyParty = makeParty('enemy', [
  { id: 'a', health: 25, defence: 0, speed: 1, scriptId: 'always-wait' },
  { id: 'b', health: 15, defence: 0, speed: 2, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: B },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: B,
    rawDamage: 40.4,
    finalDamage: 40,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: B },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: B },
  { type: 'TurnEnded', creatureId: B },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: A },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: A,
    rawDamage: 40.4,
    finalDamage: 40,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: A },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
