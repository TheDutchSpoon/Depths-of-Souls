// Golden: a tick whose applier has DIED (Phase 4.1-H2b2, ASSUMPTIONS 113, 146). Its amount is still
// the frozen snapshot, but the logged source falls back to the BEARER, and that fallback is not a
// dealer: the bearer's own dealer-side hook (on-damage-dealt) does not fire. A tick is also never
// self-inflicted, applier alive or dead: an ally's cost observer (the real Flickerling Flare) stays
// silent on both ticks.
//
// Hand-derived (independent `node -e` calculator). Players: A (the applier; Attack 100, health 100
// wounded to 1, speed 50) and P2 (waits, speed 3, keeps the player side alive). Enemies: C (Attack
// 60, speed 40: waits in round 1, attacks the lowest-HP player in round 2), B (the bearer; Defence
// 20, speed 5, carries a fixture on-damage-dealt trait "Dealer": Attack x1.1 on itself) and F
// (speed 4, carries the REAL Flickerling Flare). A applies Poison (duration 3) to B before any
// turn: snapshot = applier A, vitality, potency floor(100 x 20 / 100) = 20. All vitality (neutral):
// tick = 20 x 1.0 - 0.2 x 20 = 16.
//
//   R1 B turn end: A is alive -> tick 16, source A, B 100 -> 84. A is the dealer, not B: B's Dealer
//     trait is silent. F's Flare is silent (the tick is not a cost).
//   R2: A waits. C attacks the lowest-HP player: A (1) < P2 (100): core 60 - 20 = 40, chip 0.6 ->
//     40.6 -> floor 40: A 1 -> 0, dies.
//   R2 B turn end: A is dead -> the same 16 (frozen), but the source is the bearer B, B 84 -> 68.
//     B is the logged source only, NOT a dealer: its Dealer trait stays silent (were the fallback a
//     dealer it would fire here). F's Flare is silent again.
// TURN_STEPS = 10 (A, C, B, F, P2 in each of two rounds).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { FLICKERLING_FLARE_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import { holdPotency } from '../__fixtures__/held-statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 8305 // No RNG consumed; seed is inert.
export const TURN_STEPS = 10

const A = createCreatureId('a')
const P2 = createCreatureId('p2')
const C = createCreatureId('c')
const B = createCreatureId('b')
const F = createCreatureId('f')

export const DEALER: Trait = {
  id: 'h2b2-dead-dealer',
  name: 'Dealer (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-dealt',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    },
  ],
}

const waitThenAttack: Script = {
  id: 'h2b2-dead-wait-then-attack',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 2 },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'a', health: 100, attack: 100, speed: 50, scriptId: 'always-wait' },
  { id: 'p2', speed: 3, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  { id: 'c', attack: 60, speed: 40, scriptId: waitThenAttack.id },
  {
    id: 'b',
    health: 100,
    defence: 20,
    speed: 5,
    scriptId: 'always-wait',
    innateTraitIds: [DEALER.id],
  },
  {
    id: 'f',
    speed: 4,
    scriptId: 'always-wait',
    innateTraitIds: [FLICKERLING_FLARE_TRAIT.id],
  },
])

export const scripts = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [waitThenAttack.id, waitThenAttack],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  ...TRAIT_REGISTRY,
  [DEALER.id, DEALER],
])
// Pinned at Poison 20% of Attack, the value this golden's arithmetic uses (4.1-H2d, ASSUMPTION 147: tuning
// never changes a mechanism golden). The status is otherwise the real one.
export const statuses = holdPotency(STATUS_REGISTRY, { poison: 20 })

export const setup = (created: CombatState): CombatState => {
  const state = applyStatus(
    A,
    B,
    { statusId: 'poison', duration: 3 },
    created,
    createResolutionContext([], newCascade()),
  )
  return updateCreature(state, A, { currentHp: 1 })
}

type Id = typeof A
const turn = (who: Id, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: Id): CombatEvent => ({ type: 'Waited', creatureId: who })
const tick = (source: Id, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: source,
  targetId: B,
  rawDamage: 16,
  finalDamage: 16,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'poison',
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(A, waited(A)),
  ...turn(C, waited(C)),
  ...turn(B, waited(B), tick(A, 84)),
  ...turn(F, waited(F)),
  ...turn(P2, waited(P2)),
  { type: 'RoundStarted', round: 2 },
  ...turn(A, waited(A)),
  ...turn(
    C,
    { type: 'AttackDeclared', attackerId: C, targetId: A },
    {
      type: 'DamageDealt',
      sourceId: C,
      targetId: A,
      rawDamage: 40.6,
      finalDamage: 40,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp: 0,
      damageSource: 'attack',
    },
    { type: 'CreatureDied', creatureId: A },
  ),
  ...turn(B, waited(B), tick(B, 68)),
  ...turn(F, waited(F)),
  ...turn(P2, waited(P2)),
]

export const expectedResult: FightResult | null = null
