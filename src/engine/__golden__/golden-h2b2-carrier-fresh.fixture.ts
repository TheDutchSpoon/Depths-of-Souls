// Golden: a carrier applying the same status snapshots FRESH from itself (Phase 4.1-H2b2, ASSUMPTION
// 143). Only a status's OWN effect passes its snapshot on (Spore's spread, golden-h2b2-spore-spread).
// A creature that merely CARRIES Spore and applies Spore through a trait of its own -- here a real
// Sporecloud Seeder, which infects whoever it attacks -- is an ordinary applier: the new Spore
// carries the Seeder's snapshot, not the one on the Seeder.
//
// Hand-derived (independent `node -e` calculator). Player: S (the Seeder; Attack 20, Defence 20,
// Speed 40, wit, carries the real Sporecloud Seeder trait, always-attack). Enemies: X (the original
// applier; health 1000, Speed 100, VITALITY, waits) and T (the target; health 100, Defence 20, Speed
// 5, wit, waits). X applies Spore to S before any turn (turn clock 0): snapshot = applier X,
// vitality, potency floor(100 x 15 / 100) = 15.
//   R1 X waits. R1 S attacks the lowest-HP enemy: T (100) < X (1000). Direct hit: core 20 - 20 = 0,
//   chip 0.2 -> raw 0.2 -> the minimum 1 (chip-only): T 100 -> 99. The Seeder's on-attack (which fires before the hit lands) infects T: a FRESH snapshot from S: applier S, wit, potency floor(40 x 15 / 100) = 6.
//   S turn end: S's own Spore (X's snapshot) ticks: 15 x 1.0 (vitality vs wit, neutral) - 0.2 x 20
//   = 11, source X (alive), S 100 -> 89.
//   R1 T turn end: T's Spore (applied in S's turn, so not born for T) ticks S's snapshot:
//   6 x 1.0 (wit vs wit) - 0.2 x 20 = 2, source S (alive), T 99 -> 97. (If the carrier passed X's
//   snapshot on, the tick would be 15 - 4 = 11, source X.)
// TURN_STEPS = 3 (X, S, T).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { SPORECLOUD_SEEDER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'

export const SEED = 8310 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3

const S = createCreatureId('s')
const X = createCreatureId('x')
const T = createCreatureId('t')

export const playerParty = makeParty('player', [
  {
    id: 's',
    health: 100,
    speed: 40,
    affinity: 'wit',
    scriptId: 'always-attack',
    innateTraitIds: [SPORECLOUD_SEEDER_TRAIT.id],
  },
])
export const enemyParty = makeParty('enemy', [
  { id: 'x', health: 1000, speed: 100, affinity: 'vitality', scriptId: 'always-wait' },
  { id: 't', health: 100, speed: 5, affinity: 'wit', scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState =>
  applyStatus(
    X,
    S,
    { statusId: 'spore', duration: 3 },
    created,
    createResolutionContext([], newCascade()),
  )

const tick = (
  source: typeof S,
  target: typeof S,
  damage: number,
  remainingHp: number,
): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: source,
  targetId: target,
  rawDamage: damage,
  finalDamage: damage,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'spore',
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: X },
  { type: 'Waited', creatureId: X },
  { type: 'TurnEnded', creatureId: X },
  { type: 'TurnStarted', creatureId: S },
  { type: 'AttackDeclared', attackerId: S, targetId: T },
  {
    type: 'TriggerFired',
    sourceId: S,
    hook: 'on-attack',
    effectId: SPORECLOUD_SEEDER_TRAIT.id,
  },
  { type: 'StatusApplied', targetId: T, statusId: 'spore', duration: 3, sourceId: S },
  {
    type: 'DamageDealt',
    sourceId: S,
    targetId: T,
    rawDamage: 0.2,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 99,
    damageSource: 'attack',
  },
  tick(X, S, 11, 89),
  { type: 'TurnEnded', creatureId: S },
  { type: 'TurnStarted', creatureId: T },
  { type: 'Waited', creatureId: T },
  tick(S, T, 2, 97),
  { type: 'TurnEnded', creatureId: T },
]

export const expectedResult: FightResult | null = null
