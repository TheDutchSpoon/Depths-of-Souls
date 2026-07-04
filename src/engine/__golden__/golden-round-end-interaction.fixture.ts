// Golden: the round-end sweep's interaction rules (GAME_DESIGN's status lifecycle), all in one
// fixture. P1 carries CATASTROPHIC_COLLAPSE: three effects on ONE trait --
//   (1) on-round-end: a lethal self-hit (999 flat, no TriggerFired -- matches DoT convention).
//   (2) on-round-end: would hit the lowest-HP ally -- MUST be skipped, since (1) already killed
//       P1 earlier in this SAME per-creature effect pass (fireHook's fresh per-effect alive-check).
//   (3) on-death: applies Weaken to the lowest-HP ally -- fires regardless (on-death always fires
//       for the creature that just died), proving on-death still runs mid-sweep.
// The Weaken it applies is BORN mid-sweep, so it must NOT be touched by THIS sweep's decrement
// (it keeps full duration, starts counting at the NEXT round-end) -- and win/loss must be checked
// once, after the WHOLE sweep (P1's death alone doesn't wipe the player side, since P2 survives).
//
// Hand-derived (independent `node -e` calculator). All same affinity (neutral, x1).
//   P2->E1, no weaken (round 1): off 20, def 5. core 15, chip 0.2 -> raw 15.2 -> final 15.
//   P2->E1, with weaken (-20% dealt; rounds 2 & 3): raw = 15.2 * 0.8 = 12.16 -> final 12.
//   E1 health 30: R1 30->15. R2 15->3. R3 3-12 clamped to 0 -> dies. Win, checked post-action
//   (a normal in-turn kill, not a sweep-triggered one).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 10010 // No RNG consumed; seed is inert.

const P1 = createCreatureId('p1')
const P2 = createCreatureId('p2')
const E1 = createCreatureId('e1')

export const playerParty = makeParty('player', [
  {
    id: 'p1',
    health: 50,
    speed: 5,
    scriptId: 'always-wait',
    innateTraitIds: ['catastrophic-collapse'],
  },
  { id: 'p2', attack: 20, speed: 20, scriptId: 'always-attack' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e1', health: 30, defence: 5, speed: 10, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

function p2Hit(finalDamage: number, rawDamage: number, remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: P2,
    targetId: E1,
    rawDamage,
    finalDamage,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  // Speed order: P2 (20) > E1 (10) > P1 (5).
  { type: 'TurnStarted', creatureId: P2 },
  { type: 'AttackDeclared', attackerId: P2, targetId: E1 },
  p2Hit(15, 15.2, 15),
  { type: 'TurnEnded', creatureId: P2 },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'Waited', creatureId: E1 },
  { type: 'TurnEnded', creatureId: E1 },
  { type: 'TurnStarted', creatureId: P1 },
  { type: 'Waited', creatureId: P1 },
  { type: 'TurnEnded', creatureId: P1 },
  // -- round-end sweep (tie-break order: P1, P2, E1) --
  // P1's effect (1): lethal self-hit, no TriggerFired (matches DoT convention).
  {
    type: 'DamageDealt',
    sourceId: P1,
    targetId: P1,
    rawDamage: 999,
    finalDamage: 999,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'dot',
  },
  { type: 'CreatureDied', creatureId: P1 },
  // on-death fires (self-destruct's lethal hit pre-empted P1's own on-damage-taken, but
  // on-death always fires for the creature that just died).
  {
    type: 'TriggerFired',
    sourceId: P1,
    hook: 'on-death',
    effectId: 'catastrophic-collapse',
  },
  {
    type: 'StatusApplied',
    targetId: P2,
    statusId: 'weaken',
    stacks: 1,
    duration: 2,
    sourceId: P1,
  },
  // P1's effect (2) -- "would hit the lowest-HP ally" -- is SKIPPED: P1 is already dead by the
  // time this per-effect loop reaches it (fireHook's fresh alive-check), so no TriggerFired and
  // no DamageDealt for it appear here.
  { type: 'RoundStarted', round: 2 },
  // P1 is dead -> excluded from the round-2 queue entirely.
  { type: 'TurnStarted', creatureId: P2 },
  { type: 'AttackDeclared', attackerId: P2, targetId: E1 },
  // Weaken (-20% dealt) is already active -- applied last sweep, in effect immediately even
  // though its OWN duration hasn't decremented yet (it was born mid-sweep, untouched by it).
  p2Hit(12, 12.16, 3),
  { type: 'TurnEnded', creatureId: P2 },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'Waited', creatureId: E1 },
  { type: 'TurnEnded', creatureId: E1 },
  // -- round-end sweep: P2's weaken (born mid-sweep last time) is NOW in the snapshot ->
  // decremented 2 -> 1, still active, not yet expired. --
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: P2 },
  { type: 'AttackDeclared', attackerId: P2, targetId: E1 },
  p2Hit(12, 12.16, 0),
  { type: 'CreatureDied', creatureId: E1 },
  { type: 'TurnEnded', creatureId: P2 },
  // Win/loss checked after this ordinary action -- not sweep-triggered this time.
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
