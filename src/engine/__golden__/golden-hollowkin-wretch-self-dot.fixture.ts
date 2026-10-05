// Golden: PR #64 review fix 3 -- `triggering-source` never resolves to the firing creature
// itself. A DoT tick's `deal-damage` response targets `{kind:'self'}` (the bearer damages
// itself), so `applyDamageAndEmit`'s `sourceId === targetId` -- `on-damage-taken`'s hook context
// then has `context.source === context.self`. Before the fix, Hollowkin Wretch's real
// `on-damage-taken -> apply-status(triggering-source, confusion)` trait would resolve
// `triggering-source` to WRETCH itself and confuse its own bearer off its own Poison tick.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). P (speed 20) acts before
// WRETCH (speed 10, real Hollowkin Wretch base stats) -- both `always-wait` through round 1
// uneventfully. WRETCH starts the fight already carrying Poison (applied via a direct
// `applyStatus` call before any turn resolves, into a throwaway events array, at turn clock 0 --
// so it is never born in any turn). Re-derived in 4.1-F2: the tick is no longer a round-end sweep
// step but a trigger in the bearer's OWN turn-end hooks.
//
//   WRETCH's turn end (round 1): Poison's tick: flatAmount 3% of WRETCH's own max HP [100] * 1
//     stack = 3. WRETCH 100 - 3 = 97, survives (no TriggerFired for the tick itself --
//     emitTriggerFired: false).
//   WRETCH survived -> on-damage-taken fires: Madness Touch's trigger fires
//     (TriggerFired(WRETCH, on-damage-taken, madness-touch)), but `triggering-source` resolves to
//     [] (context.source === context.self, both WRETCH) -- no StatusApplied follows. WRETCH is
//     NOT confused by its own tick. Cleanup then counts Poison down (3 -> 2, no event); TurnEnded.
//   Round 2 begins: queue = [P, WRETCH] -> RoundStarted{round:2} -> P's turn (always-wait) ->
//     Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { HOLLOWKIN_WRETCH_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 77 // No RNG consumed anywhere in this fixture; seed is inert.

export const P = createCreatureId('p')
export const WRETCH = createCreatureId('hollowkin-wretch')

export const playerParty = makeParty('player', [
  { id: 'p', speed: 20, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'hollowkin-wretch',
    health: 100,
    attack: 14,
    intelligence: 12,
    defence: 20,
    speed: 10,
    affinity: 'endurance',
    scriptId: 'always-wait',
    innateTraitIds: [HOLLOWKIN_WRETCH_TRAIT.id],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 3 // P and WRETCH's round-1 turns, then round 2's setup and P's round-2 turn.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
  { type: 'TurnStarted', creatureId: WRETCH },
  { type: 'Waited', creatureId: WRETCH },
  // 4.1-F2: the tick is in WRETCH's own turn-end hooks, inside its bracket.
  {
    type: 'DamageDealt',
    sourceId: WRETCH,
    targetId: WRETCH,
    rawDamage: 3,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 97,
    damageSource: 'dot',
    statusId: 'poison',
  },
  {
    type: 'TriggerFired',
    sourceId: WRETCH,
    hook: 'on-damage-taken',
    effectId: HOLLOWKIN_WRETCH_TRAIT.id,
  },
  // No StatusApplied -- triggering-source fizzles since the DoT's source IS the bearer.
  { type: 'TurnEnded', creatureId: WRETCH },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
]

/** Post-`createCombat` step: pre-apply Poison to WRETCH before any turn resolves, into a throwaway
 * events array, mirroring the PR #64 repro's own setup idiom. Runs before the first frozen turn. */
export const setup = (created: CombatState): CombatState =>
  applyStatus(
    WRETCH,
    WRETCH,
    { statusId: 'poison' },
    created,
    createResolutionContext([], newCascade()),
  )
