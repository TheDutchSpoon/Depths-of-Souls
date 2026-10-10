// Golden: a tick from a LIVING applier offers no `triggering-source`, so no retaliator answers it,
// while `on-damage-taken` itself still fires (Phase 4.1-H2b2, CONVENTIONS "`triggering-source`
// never resolves to the firing creature itself", ASSUMPTIONS 113, 146). Moving a tick's source to
// the applier would otherwise open retaliation: Snapback (the real Snapjaw Jaws) would strike the
// applier on every tick and the Wretch's Madness Touch would confuse it.
//
// Hand-derived (independent `node -e` calculator). Player: A (the applier; Attack 100, speed 50).
// Enemy: B (the bearer; Defence 20, speed 5) carries the real Snapjaw Jaws ("Snapback":
// on-damage-taken -> deal-damage at triggering-source, 30% of its Attack since 4.1-H2c, 60% before; never evaluated here) and the real Hollowkin Wretch
// ("Madness Touch": on-damage-taken -> apply Confusion at triggering-source), and is ASLEEP (the
// real Sleep status: action-lock + an on-damage-taken wake-up). A applies Poison and Sleep (duration
// 3) to B before any turn: Poison snapshot = applier A, vitality, potency floor(100 x 20 / 100) =
// 20. All vitality (neutral): tick = 20 - 0.2 x 20 = 16.
//
//   R1 A waits. R1 B: the turn is skipped by Sleep (TurnSkipped). B's turn-end hooks still run: the
//   Poison tick 16 from the LIVING applier A, B 100 -> 84. The tick offers no source, so:
//     - on-damage-taken STILL fires for each of B's three reactions, in effect order (innate traits
//       first, then statuses in application order): Snapback and Madness Touch each emit their
//       TriggerFired, then resolve `triggering-source` to NOTHING -- no DamageDealt on A, no
//       StatusApplied(confusion) on A;
//     - Sleep's wake-up fires (TriggerFired 'sleep', then StatusExpired): a tick wakes the sleeper.
//   (If a tick offered its applier as the source, A would take Snapback's hit and be Confused.)
// TURN_STEPS = 2 (A, B).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import {
  HOLLOWKIN_WRETCH_TRAIT,
  SNAPJAW_JAWS_TRAIT,
  TRAIT_REGISTRY,
} from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'

export const SEED = 8307 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

const A = createCreatureId('a')
const B = createCreatureId('b')

export const playerParty = makeParty('player', [
  { id: 'a', attack: 100, speed: 50, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'b',
    health: 100,
    defence: 20,
    speed: 5,
    scriptId: 'always-wait',
    innateTraitIds: [SNAPJAW_JAWS_TRAIT.id, HOLLOWKIN_WRETCH_TRAIT.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState => {
  const ctx = createResolutionContext([], newCascade())
  const state = applyStatus(A, B, { statusId: 'poison', duration: 3 }, created, ctx)
  return applyStatus(A, B, { statusId: 'sleep', duration: 3 }, state, ctx)
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'TurnSkipped', creatureId: B, effectId: 'sleep' },
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: B,
    rawDamage: 16,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 84,
    damageSource: 'dot',
    statusId: 'poison',
  },
  {
    type: 'TriggerFired',
    sourceId: B,
    hook: 'on-damage-taken',
    effectId: SNAPJAW_JAWS_TRAIT.id,
  },
  {
    type: 'TriggerFired',
    sourceId: B,
    hook: 'on-damage-taken',
    effectId: HOLLOWKIN_WRETCH_TRAIT.id,
  },
  { type: 'TriggerFired', sourceId: B, hook: 'on-damage-taken', effectId: 'sleep' },
  { type: 'StatusExpired', creatureId: B, statusId: 'sleep' },
  { type: 'TurnEnded', creatureId: B },
]

export const expectedResult: FightResult | null = null
