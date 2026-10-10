// Golden: PR #64 review fix 3 -- `triggering-source` never resolves to the firing creature
// itself. A SELF-APPLIED DoT tick (applier = bearer) has the bearer as its source; before the fix,
// `on-damage-taken`'s hook context then had `context.source === context.self`. (4.1-H2b2: a tick now
// offers no `triggering-source` at all, applier alive or not -- golden-h2b2-tick-no-retaliation covers
// a living OTHER applier; this golden keeps the self-applied case.) Before the fix, Hollowkin Wretch's real
// `on-damage-taken -> apply-status(triggering-source, confusion)` trait would resolve
// `triggering-source` to WRETCH itself and confuse its own bearer off its own Poison tick.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). P (speed 20) acts before
// WRETCH (speed 10, real Hollowkin Wretch base stats -- its Attack 14, Intelligence 12 and Defence 20;
// the speed and the Health 100 are the fixture's own, the real ones being 14 and 33) -- both `always-wait` through round 1
// uneventfully. WRETCH starts the fight already carrying Poison (applied via a direct
// `applyStatus` call before any turn resolves, into a throwaway events array, at turn clock 0 --
// so it is never born in any turn). Re-derived in 4.1-F2: the tick is no longer a round-end sweep
// step but a trigger in the bearer's OWN turn-end hooks.
//
//   WRETCH's turn end (round 1): Poison's tick, snapshot at application (applier WRETCH, endurance,
//     potency 20% of its Attack 14 = floor(14 x 20 / 100) = 2). Indirect: 2 x 1.0 (endurance vs
//     endurance) - 0.2 x Defence 20 = 2 - 4 = -2, raised to the minimum 1. WRETCH 100 - 1 = 99, survives (no TriggerFired for the tick itself --
//     emitTriggerFired: false).
//   WRETCH survived -> on-damage-taken fires: Madness Touch's trigger fires
//     (TriggerFired(WRETCH, on-damage-taken, madness-touch)), but `triggering-source` resolves to
//     [] (a tick offers no source) -- no StatusApplied follows. WRETCH is
//     NOT confused by its own tick. Cleanup then counts Poison down (3 -> 2, no event); TurnEnded.
//   Round 2 begins: queue = [P, WRETCH] -> RoundStarted{round:2} -> P's turn (always-wait) ->
//     Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
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

export const scripts = FIXTURE_SCRIPTS_BY_ID
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
    rawDamage: -2,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 99,
    damageSource: 'dot',
    statusId: 'poison',
  },
  {
    type: 'TriggerFired',
    sourceId: WRETCH,
    hook: 'on-damage-taken',
    effectId: HOLLOWKIN_WRETCH_TRAIT.id,
  },
  // No StatusApplied -- triggering-source fizzles: a tick offers no source.
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
