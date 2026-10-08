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
//   A→X (off 20, def 5):            core 15, chip 0.20 → raw 15.20 → 15. (A's level is the fixture
//     default 11, so the direct hit's Additional is 0.)
//   X reckless→X: X's own response damaging ITSELF is a COST (4.1-H2a): the exact magnitude
//     20×0.3 = 6, floored once, no Defence/pools/chip → 6. (Before 4.1-H2a this was a formula hit
//     of 1; the cost is six times that, so X is 30 HP, not 20, to survive round 1.)
// X 30 → 15 (−15) → 9 (−6 self) in round 1; killed by A's round-2 hit (9 − 15 → 0).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
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
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'reckless-one',
    health: 30,
    attack: 20,
    defence: 5,
    speed: 5,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: ['reckless'],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
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
  aHit(15),
  // Reckless fires ONCE; its self-hit's own on-damage-taken re-entry is blocked by the guard.
  { type: 'TriggerFired', sourceId: X, hook: 'on-damage-taken', effectId: 'reckless' },
  {
    type: 'DamageDealt',
    sourceId: X,
    targetId: X,
    rawDamage: 6,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 9,
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
