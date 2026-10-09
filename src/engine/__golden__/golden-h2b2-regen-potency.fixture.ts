// Golden: Regen is the HEAL site of the applier snapshot (Phase 4.1-H2b2, ASSUMPTIONS 3, 113, 143,
// 144, 146). A Regen tick heals the instance's potency -- 10% of the HEALER's (applier's) Health at
// application -- not a percent of the bearer's own Health, frozen at application, credited to the
// healer while it lives and to the bearer once the healer is dead (the same tick rule as damage).
//
// Hand-derived (independent `node -e` calculator). Players: H (the healer; health 80, Defence 0,
// speed 50, wounded to 1 HP) and R (the bearer; health 30 wounded to 10, speed 30). Enemy: E
// (Attack 60, speed 40) waits in round 1 and attacks the lowest-HP player in round 2. H applies
// Regen (duration 3) to R before any turn (turn clock 0, so never born): snapshot = applier H,
// potency floor(80 x 10 / 100) = 8. (R's own 10% of Health would be floor(30 x 10 / 100) = 3.)
//
//   R1 H turn: Halve (a fixture trait): H's Health x0.5, 80 -> 40 (a LIVE read of H's Health would
//     now give 4; the frozen snapshot is unaffected). H's current HP 1 is below the new max, so
//     no HpClamped. Waits.
//   R1 R turn end: Regen heals the snapshot potency 8, source H (alive): R 10 -> 18.
//   R2: H waits. E attacks the lowest-HP player: H (1) < R (18). Direct hit: core 60 - 0 = 60,
//     chip 0.6 -> 60.6 -> floor 60 (the Additional is 0 at the fixture level 11): H 1 -> 0, dies.
//   R2 R turn end: Regen heals 8 again (the frozen potency, though H is dead), the source falling
//     back to the bearer R (the applier is dead): R 18 -> 26.
// TURN_STEPS = 6 (H, E, R in each of two rounds).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 8304 // No RNG consumed; seed is inert.
export const TURN_STEPS = 6

const H = createCreatureId('h')
const R = createCreatureId('r')
const E = createCreatureId('e')

export const HALVE: Trait = {
  id: 'h2b2-regen-halve',
  name: 'Halve Health (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'health',
        factor: 0.5,
      },
    },
  ],
}

const waitThenAttack: Script = {
  id: 'h2b2-wait-then-attack',
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
  {
    id: 'h',
    health: 80,
    defence: 0,
    speed: 50,
    scriptId: 'always-wait',
    innateTraitIds: [HALVE.id],
  },
  { id: 'r', health: 30, speed: 30, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e', attack: 60, speed: 40, scriptId: waitThenAttack.id },
])

export const scripts = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [waitThenAttack.id, waitThenAttack],
])
export const traits: ReadonlyMap<string, Trait> = new Map([[HALVE.id, HALVE]])
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState => {
  const ctx = createResolutionContext([], newCascade())
  let state = applyStatus(H, R, { statusId: 'regen', duration: 3 }, created, ctx)
  state = updateCreature(state, H, { currentHp: 1 })
  return updateCreature(state, R, { currentHp: 10 })
}

const turn = (who: typeof H, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: typeof H): CombatEvent => ({ type: 'Waited', creatureId: who })
const regen = (source: typeof H, remainingHp: number): CombatEvent => ({
  type: 'HealApplied',
  sourceId: source,
  targetId: R,
  amount: 8,
  remainingHp,
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(
    H,
    { type: 'TriggerFired', sourceId: H, hook: 'on-turn-start', effectId: HALVE.id },
    {
      type: 'StatModifierApplied',
      sourceId: H,
      targetId: H,
      stat: 'health',
      factor: 0.5,
      effectiveBefore: 80,
      effectiveAfter: 40,
    },
    waited(H),
  ),
  ...turn(E, waited(E)),
  ...turn(R, waited(R), regen(H, 18)),
  { type: 'RoundStarted', round: 2 },
  ...turn(H, waited(H)),
  ...turn(
    E,
    { type: 'AttackDeclared', attackerId: E, targetId: H },
    {
      type: 'DamageDealt',
      sourceId: E,
      targetId: H,
      rawDamage: 60.6,
      finalDamage: 60,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp: 0,
      damageSource: 'attack',
    },
    { type: 'CreatureDied', creatureId: H },
  ),
  ...turn(R, waited(R), regen(R, 26)),
]

export const expectedResult: FightResult | null = null
