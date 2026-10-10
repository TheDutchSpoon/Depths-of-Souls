// Golden: a status tick is INDIRECT damage from the applier's snapshot, credited to the LIVING
// applier (Phase 4.1-H2b2, ASSUMPTIONS 113, 143, 144, 146). It is the focused case for the tick
// formula and its inputs:
//   tick = potency x affinity(snapshot vs bearer) x prod(bearer's taken factors)
//          - 0.2 x bearer's effective Defence, then MAX(1, floor(...)).
// No dealt pool, no cross-stat, no armour penetration, no Additional. The source is the applier
// while it lives, so its dealer-side hooks (on-damage-dealt) fire.
//
// Hand-derived (independent `node -e` calculator). Players: A (the applier; health 100 wounded to
// 50, Attack 100, speed 50, vitality). Enemy: B (the bearer; health 100, Attack 20, Defence 20,
// speed 5, VIOLENCE). A applies Poison (duration 3) to B before any turn (turn clock 0, so never
// born): snapshot = applier A, vitality, potency 20% of A's Attack = floor(100 x 20 / 100) = 20.
// Affinity: vitality beats violence, so snapshot -> bearer is x1.25 while bearer -> applier would
// be x0.75 (asymmetric on purpose: a dropped, neutral or reversed affinity each changes the tick).
// A also carries, to prove they are NOT read by a tick: Weaken (-20% dealt, applied before any turn)
// and a conditional-damage-bonus (+50% dealt vs a Poisoned target); a Surge trait that triples A's
// Attack in round 1 (so a LIVE read of the applier's stat would differ from the frozen snapshot);
// and a lifesteal-shaped on-damage-dealt trait (heal self 5) to prove the living applier's
// dealer-side hooks fire.
//
//   R1 A turn: Surge: Attack 100 -> 300 (StatModifierApplied). Waits.
//   R1 B turn end: tick = 20 x 1.25 (affinity) x 1 (no taken factors) - 0.2 x 20 (Defence) =
//     25 - 4 = 21 -> raw 21, final 21, B 100 -> 79. Source A. Then A's on-damage-dealt trait heals
//     A by 5: 50 -> 55. (Live Attack 300 would give potency 60; the bearer's Attack 20 would give
//     potency 4; neutral affinity 20 - 4 = 16; no Defence term 25; the Weaken pool
//     20 x 1.25 x 0.8 - 4 = 16; the +50% bonus 20 x 1.25 x 1.5 - 4 = 33.5 -> 33.)
//   R2 B turn: B Defends (Defence x1.5 = 30, taken factor x0.65, until its next turn). Its turn-end
//     tick = 20 x 1.25 x 0.65 - 0.2 x 30 = 16.25 - 6 = 10.25 -> raw 10.25, final 10, B 79 -> 69.
//     Source A; A heals 5: 55 -> 60.
// TURN_STEPS = 4 (A, B in round 1; A, B in round 2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { holdPotency } from '../__fixtures__/held-statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 8303 // No RNG consumed; seed is inert.
export const TURN_STEPS = 4

const A = createCreatureId('a')
const B = createCreatureId('b')

export const SURGE: Trait = {
  id: 'h2b2-living-surge',
  name: 'Surge (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 3,
      },
    },
  ],
}
export const LIFESTEAL: Trait = {
  id: 'h2b2-living-lifesteal',
  name: 'Lifesteal (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-dealt',
      response: { kind: 'heal', target: { kind: 'self' }, flatAmount: 5 },
    },
  ],
}
export const BONUS_VS_POISON: Trait = {
  id: 'h2b2-living-bonus',
  name: 'Bonus vs Poisoned (fixture)',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: { kind: 'has-status', subject: 'target', statusId: 'poison' },
    },
  ],
}

const waitThenDefend: Script = {
  id: 'h2b2-wait-then-defend',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 2 },
      action: { kind: 'defend' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'a',
    health: 100,
    attack: 100,
    speed: 50,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [SURGE.id, LIFESTEAL.id, BONUS_VS_POISON.id],
  },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'b',
    health: 100,
    attack: 20,
    defence: 20,
    speed: 5,
    affinity: 'violence',
    scriptId: waitThenDefend.id,
  },
])

export const scripts = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [waitThenDefend.id, waitThenDefend],
])
export const traits: ReadonlyMap<string, Trait> = new Map(
  [SURGE, LIFESTEAL, BONUS_VS_POISON].map((t) => [t.id, t]),
)
// Pinned at Poison 20% of Attack, the value this golden's arithmetic uses (4.1-H2d, ASSUMPTION 147: tuning
// never changes a mechanism golden). The status is otherwise the real one.
export const statuses = holdPotency(STATUS_REGISTRY, { poison: 20 })

export const setup = (created: CombatState): CombatState => {
  const ctx = createResolutionContext([], newCascade())
  let state = applyStatus(A, B, { statusId: 'poison', duration: 3 }, created, ctx)
  state = applyStatus(A, A, { statusId: 'weaken', duration: 3 }, state, ctx)
  return updateCreature(state, A, { currentHp: 50 })
}

const tick = (raw: number, final: number, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: A,
  targetId: B,
  rawDamage: raw,
  finalDamage: final,
  affinityMultiplier: 1.25,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'poison',
})
const lifesteal = (remainingHp: number): CombatEvent[] => [
  { type: 'TriggerFired', sourceId: A, hook: 'on-damage-dealt', effectId: LIFESTEAL.id },
  { type: 'HealApplied', sourceId: A, targetId: A, amount: 5, remainingHp },
]

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'TriggerFired', sourceId: A, hook: 'on-turn-start', effectId: SURGE.id },
  {
    type: 'StatModifierApplied',
    sourceId: A,
    targetId: A,
    stat: 'attack',
    factor: 3,
    effectiveBefore: 100,
    effectiveAfter: 300,
  },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Waited', creatureId: B },
  tick(21, 21, 79),
  ...lifesteal(55),
  { type: 'TurnEnded', creatureId: B },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Defended', creatureId: B },
  tick(10.25, 10, 69),
  ...lifesteal(60),
  { type: 'TurnEnded', creatureId: B },
]

export const expectedResult: FightResult | null = null
