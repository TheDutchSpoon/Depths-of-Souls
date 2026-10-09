// Golden: a DoT tick is not a cost, so a cost observer stays silent (Phase 4.1-H2b1, ASSUMPTIONS
// 115, 131, 137; 4.1-H2b2: the tick is a snapshot-potency status tick, ASSUMPTION 144).
// Hand-derived. Its own golden on purpose: H2b2 moved the tick's source to the applier and made it
// indirect, so this case changed alone, while the ordinary-hit, spell-on-caster and zero-cost cases
// (golden-h2b1-observed-silent) stayed byte-identical.
//
// Players (speed order O 10, P 5; both always-wait), enemy E (health 100, always-wait, speed 1):
//   O (health 40) carries the Flare-shaped observer (`relationship 'ally'`, `selfInflicted true`)
//     answering with Attack x1.5 on itself -- any TriggerFired from O would show.
//   P (health 40) is poisoned by itself at fight start (duration 3): its status declares a potency
//     of 5% of the applier's Health and carries an on-turn-end snapshot-potency tick.
// Snapshot (applier P, vitality): potency floor(40 x 5 / 100) = 2. P's turn end: indirect, 2 x 1.0
// - 0.2 x P's Defence 20 = -2, raised to the tick minimum of 1: rawDamage -2, finalDamage 1, tagged
// 'dot' WITH statusId, credited to P (the applier, alive). P 40 -> 39. The bearer is both source and
// target of the tick, but the tick is not a cost (it never took the cost branch), so O is SILENT.
// (Reading "self-inflicted" as `source === target`, or passing true from the tick path, fires O.)
// TURN_STEPS = 2 (O's turn, P's turn).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 8203 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

const O = createCreatureId('o')
const P = createCreatureId('p')

export const MINI_POISON: StatusDef = {
  statusId: 'h2b1-mini-poison',
  polarity: 'debuff',
  defaultDuration: 3,
  potency: { ofStat: 'health', percent: 5 },
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
        emitTriggerFired: false,
        damageSource: 'dot',
      },
    },
  ],
}

export const POISON_SELF: Trait = {
  id: 'h2b1-poison-self',
  name: 'Poison self at fight start (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: MINI_POISON.statusId, duration: 3 },
      },
    },
  ],
}

export const WATCH: Trait = {
  id: 'h2b1-tick-watch',
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
  { id: 'o', health: 40, speed: 10, scriptId: 'always-wait', innateTraitIds: [WATCH.id] },
  {
    id: 'p',
    health: 40,
    speed: 5,
    scriptId: 'always-wait',
    innateTraitIds: [POISON_SELF.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 100, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [WATCH.id, WATCH],
  [POISON_SELF.id, POISON_SELF],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [MINI_POISON.statusId, MINI_POISON],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'TriggerFired', sourceId: P, hook: 'on-fight-start', effectId: POISON_SELF.id },
  {
    type: 'StatusApplied',
    targetId: P,
    statusId: MINI_POISON.statusId,
    duration: 3,
    sourceId: P,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: O },
  { type: 'Waited', creatureId: O },
  { type: 'TurnEnded', creatureId: O },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Waited', creatureId: P },
  {
    type: 'DamageDealt',
    sourceId: P,
    targetId: P,
    rawDamage: -2,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 39,
    damageSource: 'dot',
    statusId: MINI_POISON.statusId,
  },
  // (O is silent: the tick's bearer is both source and target, but it is not a cost)
  { type: 'TurnEnded', creatureId: P },
]
