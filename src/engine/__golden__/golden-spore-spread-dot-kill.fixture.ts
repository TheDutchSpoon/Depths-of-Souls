// Golden: PR #64 review fix 1 -- Spore spreads when its OWN round-end DoT tick kills the host,
// not just when an outside hit does (golden-spore-spread.fixture.ts's own scenario). Before the
// fix, both of Spore's triggers (the on-round-end DoT tick and the on-death spread) shared the
// status's single `instanceId` as their self-re-entry guard key -- the DoT tick's own firing
// added that instanceId to `cascade.activeInstances` and had not yet removed it by the time its
// own lethal damage cascaded into `on-death`, so the guard skipped the spread trigger as if it
// were trying to re-enter ITSELF. `effectsForHook` (effects.ts) now derives a distinct guard
// identity per trigger (`${instanceId}#trigger#${index}`), so the DoT tick and the spread no
// longer collide.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). BEARER starts the fight
// already carrying Spore (applied via a direct `applyStatus` call before any turn resolves, into
// a throwaway events array -- mirrors the PR #64 repro's own setup idiom) and wounded to 1 HP, so
// its own first DoT tick is lethal. P (speed 30) acts before BEARER (speed 20) before MATE (speed
// 10); all three `always-wait` through round 1 uneventfully. The round-end sweep (bundled into
// the 4th `resolveTurn` call, alongside round 2's setup and P's own round-2 turn, since a sweep
// only runs when the NEXT call finds the queue exhausted) is where the fix fires:
//
//   Sweep order (tie-break: player -> slot -> id) = P, BEARER, MATE. P has no on-round-end effect.
//   BEARER's Spore DoT tick (in the start-of-sweep snapshot, not reapplied yet this sweep, so
//     fix 2's gate allows it): flatAmount 4% of BEARER's own max HP [100] * 1 stack = 4.
//     applyFlatDamage floors (already integer): finalDamage 4 (MAX(1,...) doesn't matter here).
//     BEARER 1 - 4 -> clamped to 0 -> dies. No TriggerFired for the tick itself
//     (emitTriggerFired: false).
//   CreatureDied(BEARER) -> on-death fires Spore's OWN spread trigger (a DIFFERENT guard identity
//     now, per the fix) -> TriggerFired(BEARER, on-death, spore) -> random-ally-without-status
//     relative to BEARER: MATE is BEARER's only living ally and doesn't carry Spore -> the sole
//     candidate (pool size 1, so the draw is deterministic regardless of RNG value) ->
//     StatusApplied(MATE, spore, 1 stack, duration 3, source BEARER).
//   Still within the SAME sweep pass, MATE is then visited for its OWN on-round-end candidates --
//     MATE's activeEffects are re-read fresh at that point and NOW include the Spore just applied
//     above, so a naive implementation WOULD tick it; fix 2's own gate (`random-ally-without-
//     status`'s target is not in the sweep's start-of-sweep snapshot) skips it -- nothing fires
//     for MATE this sweep (proven by this golden's own event log having no second DamageDealt).
//   decrementAndExpireSnapshot: BEARER's own (pre-existing, snapshotted) Spore instance decrements
//     3 -> 2 (no expiry, no event) -- MATE's brand-new instance is untouched (not in the snapshot).
//   Not wiped (MATE survives) -> round 2 begins: queue = [P, MATE] (BEARER excluded, dead) ->
//     RoundStarted{round:2} -> P's turn (always-wait) -> Waited.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

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

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 4 // P/BEARER/MATE's round-1 turns, then the round-end sweep (bundled
// with round 2's setup and P's own round-2 turn).

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Waited', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: BEARER },
  { type: 'TurnStarted', creatureId: MATE },
  { type: 'Waited', creatureId: MATE },
  { type: 'TurnEnded', creatureId: MATE },
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
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
]
