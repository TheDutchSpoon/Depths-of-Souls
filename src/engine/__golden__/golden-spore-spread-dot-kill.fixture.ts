// Golden: PR #64 review fix 1 -- Spore spreads when its OWN turn-end DoT tick kills the host,
// not just when an outside hit does (golden-spore-spread.fixture.ts's own scenario). Before the
// fix, both of Spore's triggers (the DoT tick and the on-death spread) shared the status's single
// `instanceId` as their self-re-entry guard key -- the DoT tick's own firing added that instanceId
// to `cascade.activeInstances` and had not yet removed it by the time its own lethal damage
// cascaded into `on-death`, so the guard skipped the spread trigger as if it were trying to
// re-enter ITSELF. `effectsForHook` (effects.ts) now derives a distinct guard identity per trigger
// (`${instanceId}#trigger#${index}`), so the DoT tick and the spread no longer collide.
// Re-derived in 4.1-F2: the tick is a trigger in the bearer's OWN turn-end hooks (it used to be a
// round-end sweep step gated by a start-of-sweep snapshot).
//
// Hand-derived (independent `node -e` calculator, verified via Bash). BEARER starts the fight
// already carrying Spore (applied via a direct `applyStatus` call before any turn resolves, into
// a throwaway events array, at turn clock 0 -- mirrors the PR #64 repro's own setup idiom) and
// wounded to 1 HP, so its own first DoT tick is lethal. P (speed 30) acts before BEARER (speed
// 20) before MATE (speed 10); all three `always-wait`.
//
//   BEARER's turn end (round 1): its Spore is not born (applied before any turn). The tick:
//     flatAmount 4% of BEARER's own max HP [100] * 1 stack = 4. BEARER 1 - 4 -> clamped to 0 ->
//     dies. No TriggerFired for the tick itself (emitTriggerFired: false). Neither side is wiped
//     (P and MATE live), so the turn goes on.
//   CreatureDied(BEARER) -> on-death fires Spore's OWN spread trigger (a DIFFERENT guard identity
//     now, per the fix) -> TriggerFired(BEARER, on-death, spore) -> random-ally-without-status
//     relative to BEARER: MATE is BEARER's only living ally and doesn't carry Spore -> the sole
//     candidate (pool size 1, so the draw is deterministic regardless of RNG value) ->
//     StatusApplied(MATE, spore, 1 stack, duration 3, source BEARER).
//   BEARER's cleanup: a corpse's statuses are inert (no countdown, no StatusExpired). TurnEnded.
//   MATE's turn: the Spore was applied in BEARER's turn, so for MATE it is NOT born this turn: at
//     MATE's own turn end it ticks (4% of 100 = 4, MATE 100 -> 96, no TriggerFired) and then
//     counts down 3 -> 2 (no event). (Under the old sweep it was skipped until round 2.)
//   Round 2 begins: queue = [P, MATE] (BEARER excluded, dead) -> RoundStarted{round:2} -> P's turn
//     (always-wait) -> Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'
import { updateCreature } from '../creature-lookup'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatState } from '../types'

export const SEED = 99 // The one RNG draw (pool size 1) is deterministic regardless of value.

export const P = createCreatureId('p')
export const BEARER = createCreatureId('bearer')
export const MATE = createCreatureId('mate')

/** Applied post-createCombat by the test -- see the header comment above. */
export const BEARER_STARTING_HP = 1

export const playerParty = makeParty('player', [
  { id: 'p', speed: 30, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'bearer', health: 100, speed: 20, scriptId: 'always-wait' },
  { id: 'mate', health: 100, speed: 10, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 4 // P, BEARER and MATE's round-1 turns, then round 2's setup and P's turn.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Waited', creatureId: BEARER },
  {
    type: 'DamageDealt',
    sourceId: BEARER,
    targetId: BEARER,
    rawDamage: 4,
    finalDamage: 4,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'dot',
    statusId: 'spore',
  },
  { type: 'CreatureDied', creatureId: BEARER },
  { type: 'TriggerFired', sourceId: BEARER, hook: 'on-death', effectId: 'spore' },
  {
    type: 'StatusApplied',
    targetId: MATE,
    statusId: 'spore',
    stacks: 1,
    duration: 3,
    sourceId: BEARER,
  },
  { type: 'TurnEnded', creatureId: BEARER },
  { type: 'TurnStarted', creatureId: MATE },
  { type: 'Waited', creatureId: MATE },
  {
    type: 'DamageDealt',
    sourceId: MATE,
    targetId: MATE,
    rawDamage: 4,
    finalDamage: 4,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 96,
    damageSource: 'dot',
    statusId: 'spore',
  },
  { type: 'TurnEnded', creatureId: MATE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
]

/** Post-`createCombat` step (createCombat resets HP/statuses at fight setup); runs before the first
 * frozen turn (see test-utils/golden-runner.ts). */
export const setup = (created: CombatState): CombatState => {
  // Pre-apply Spore to BEARER and wound it to 1 HP, both before any turn resolves -- into a
  // throwaway events array, mirroring the PR #64 repro's own setup idiom (see the fixture's
  // header comment).
  let state = applyStatus(
    P,
    BEARER,
    { statusId: 'spore' },
    created,
    createResolutionContext([], newCascade()),
  )
  state = updateCreature(state, BEARER, { currentHp: BEARER_STARTING_HP })
  return state
}
