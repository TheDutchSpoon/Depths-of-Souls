// Golden: a SELF-APPLIED tick (applier = bearer, alive) (Phase 4.1-H2b2, ASSUMPTIONS 115, 142,
// 146). The bearer is the applier, so it IS the dealer: its own dealer-side hook (on-damage-dealt)
// fires. And the tick is still not self-inflicted: an ally cost observer (Flare-shaped:
// relationship 'ally', selfInflicted true) stays silent -- self-inflicted is the cost branch's own
// classification, never "the dealer is the bearer" (the id inference H2b1 refused, in its other
// spelling).
//
// Hand-derived (independent `node -e` calculator). Players: S (health 100, Attack 100, Defence 20,
// speed 20, carries a fixture "Dealer": on-damage-dealt -> its own Attack x1.5) and W (speed 10,
// carries the Flare-shaped observer answering with Attack x1.5 on itself -- any TriggerFired from W
// would show). Enemy E waits (speed 1). S applies Poison (duration 3) to ITSELF before any turn:
// snapshot = applier S, vitality, potency floor(100 x 20 / 100) = 20. All vitality (neutral).
//   S turn end: tick = 20 x 1.0 - 0.2 x 20 = 16, source S (alive), S 100 -> 84. S is the dealer:
//     its Dealer trait fires (TriggerFired, Attack 100 -> 150). W is silent.
// TURN_STEPS = 3 (S, W, E).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8306 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3

const S = createCreatureId('s')
const W = createCreatureId('w')
const E = createCreatureId('e')

export const DEALER: Trait = {
  id: 'h2b2-self-dealer',
  name: 'Dealer (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-dealt',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.5,
      },
    },
  ],
}

export const WATCH_COSTS: Trait = {
  id: 'h2b2-self-watch',
  name: 'Watch costs (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-observed',
      observationFilter: { relationship: 'ally', selfInflicted: true },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.5,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 's',
    health: 100,
    attack: 100,
    defence: 20,
    speed: 20,
    scriptId: 'always-wait',
    innateTraitIds: [DEALER.id],
  },
  { id: 'w', speed: 10, scriptId: 'always-wait', innateTraitIds: [WATCH_COSTS.id] },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e', speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [DEALER.id, DEALER],
  [WATCH_COSTS.id, WATCH_COSTS],
])
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState =>
  applyStatus(
    S,
    S,
    { statusId: 'poison', duration: 3 },
    created,
    createResolutionContext([], newCascade()),
  )

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: S },
  { type: 'Waited', creatureId: S },
  {
    type: 'DamageDealt',
    sourceId: S,
    targetId: S,
    rawDamage: 16,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 84,
    damageSource: 'dot',
    statusId: 'poison',
  },
  { type: 'TriggerFired', sourceId: S, hook: 'on-damage-dealt', effectId: DEALER.id },
  {
    type: 'StatModifierApplied',
    sourceId: S,
    targetId: S,
    stat: 'attack',
    factor: 1.5,
    effectiveBefore: 100,
    effectiveAfter: 150,
  },
  // (W is silent: the tick's dealer is its bearer, but it is not a cost)
  { type: 'TurnEnded', creatureId: S },
  { type: 'TurnStarted', creatureId: W },
  { type: 'Waited', creatureId: W },
  { type: 'TurnEnded', creatureId: W },
  { type: 'TurnStarted', creatureId: E },
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
]

export const expectedResult: FightResult | null = null
