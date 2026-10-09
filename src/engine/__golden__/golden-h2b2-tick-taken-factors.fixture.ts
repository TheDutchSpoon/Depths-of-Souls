// Golden: a status tick passes through the BEARER'S taken factors -- Defend's AND its status/perk
// factors (Phase 4.1-H2b2, ASSUMPTIONS 113, 143). The focused case for the factor list inside
// `applyTickDamage`: Defend's factors (from `resolveDefenceAndTakenFactors`) first, then the
// bearer's own (`gatherTakenFactors`, here Vulnerability x1.5). Dropping the second part leaves
// every other golden green; only this one pins it.
//
//   tick = potency x affinity x prod(bearer's taken factors) - 0.2 x bearer's effective Defence,
//   then MAX(1, floor(...)).
//
// Hand-derived (independent `node -e` calculator). Players: A (the applier; Attack 100, speed 50,
// vitality, waits). Enemy: B (the bearer; health 100, Defence 20, speed 5, vitality). Before any
// turn (turn clock 0, so neither is born) A applies Poison (duration 3) and Vulnerability (the real
// x1.5 taken status) to B. Poison snapshot: applier A, vitality, potency 20% of A's Attack =
// floor(100 x 20 / 100) = 20. Both vitality, so affinity x1.0.
//
//   R1 B turn end: tick = 20 x 1.0 x 1.5 (Vulnerability) - 0.2 x 20 = 30 - 4 = 26 -> raw 26,
//     final 26, B 100 -> 74. (Dropping the bearer's factors: 20 - 4 = 16, B -> 84.)
//   R2 B turn: B Defends (Defence x1.5 = 30, taken factor x0.65, until its next turn). Its turn-end
//     tick = 20 x 1.0 x (0.65 x 1.5) - 0.2 x 30 = 19.5 - 6 = 13.5 -> raw 13.5, final 13, B 74 -> 61.
//     Defend's factor comes first, then Vulnerability; the product is the same either order, but
//     both must be present. (Dropping the bearer's factors: 20 x 0.65 - 6 = 7, B -> 67.)
// Source of both ticks is the living applier A. TURN_STEPS = 4 (A, B in round 1; A, B in round 2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 8310 // No RNG consumed; seed is inert.
export const TURN_STEPS = 4

const A = createCreatureId('a')
const B = createCreatureId('b')

const waitThenDefend: Script = {
  id: 'h2b2-taken-wait-then-defend',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 2 },
      action: { kind: 'defend' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'a', attack: 100, speed: 50, affinity: 'vitality', scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'b',
    health: 100,
    defence: 20,
    speed: 5,
    affinity: 'vitality',
    scriptId: waitThenDefend.id,
  },
])

export const scripts = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [waitThenDefend.id, waitThenDefend],
])
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState => {
  const ctx = createResolutionContext([], newCascade())
  const state = applyStatus(A, B, { statusId: 'poison', duration: 3 }, created, ctx)
  return applyStatus(A, B, { statusId: 'vulnerability', duration: 3 }, state, ctx)
}

const tick = (raw: number, final: number, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: A,
  targetId: B,
  rawDamage: raw,
  finalDamage: final,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'poison',
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Waited', creatureId: B },
  tick(26, 26, 74),
  { type: 'TurnEnded', creatureId: B },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Defended', creatureId: B },
  tick(13.5, 13, 61),
  { type: 'TurnEnded', creatureId: B },
]

export const expectedResult: FightResult | null = null
