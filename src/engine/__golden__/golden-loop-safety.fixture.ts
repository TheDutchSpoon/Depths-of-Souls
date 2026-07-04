// Golden: loop safety — the instance-level, stack-scoped self-re-entry guard.
// X has RECKLESS (on-damage-taken → deal 30% Attack to ITSELF). When A hits X, X's reckless
// fires and damages X, whose on-damage-taken would fire the SAME reckless instance again — but
// it is already unwinding on the resolution stack, so the guard blocks the re-entry. Reckless
// therefore strikes exactly ONCE per incoming hit, never looping. (And it does not fire on the
// lethal hit — death pre-empts on-damage-taken.)
//
// The proof is in what's ABSENT: after the first "TriggerFired reckless" + self DamageDealt there
// is no second one, and the round-2 killing hit produces no reckless at all.
//
// Hand-derived (independent `node -e` calculator). Both bodies → neutral ×1.0. A (speed 10) first.
//   A→X (off 20, def 5):            core 15, chip 0.20 → raw 15.20 → 15.
//   X reckless→X (off 20×0.3=6, def 5): core 1, chip 0.06 → raw 1.06 → 1.
// X 20 → 5 (−15) → 4 (−1 self) in round 1; killed by A's round-2 hit (4 − 15).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 6006 // No RNG consumed; seed is inert.

const A = createCreatureId('striker')
const X = createCreatureId('reckless-one')

export const playerParty = makeParty('player', [
  {
    id: 'striker',
    health: 40,
    attack: 20,
    defence: 5,
    speed: 10,
    affinity: 'body',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'reckless-one',
    health: 20,
    attack: 20,
    defence: 5,
    speed: 5,
    affinity: 'body',
    scriptId: 'always-wait',
    innateTraitIds: ['reckless'],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

function aHit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: A,
    targetId: X,
    rawDamage: 15.2,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: X },
  aHit(5),
  // Reckless fires ONCE; its self-hit's own on-damage-taken re-entry is blocked by the guard.
  { type: 'TriggerFired', sourceId: X, hook: 'on-damage-taken', effectId: 'reckless' },
  {
    type: 'DamageDealt',
    sourceId: X,
    targetId: X,
    rawDamage: 1.06,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 4,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: X },
  { type: 'Waited', creatureId: X },
  { type: 'TurnEnded', creatureId: X },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: X },
  aHit(0),
  // No reckless here: the hit killed X (death pre-empts on-damage-taken).
  { type: 'CreatureDied', creatureId: X },
  { type: 'TurnEnded', creatureId: A },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
