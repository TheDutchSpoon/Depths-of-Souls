// Golden: the COST rule and the DoT-tick exclusion (Phase 4.1-H2a, ASSUMPTIONS 116, 131, 132;
// 4.1-H2b2: the tick is now a snapshot-potency status tick, ASSUMPTION 144).
// Hand-derived. A creature's OWN trait response damaging itself is a cost: the exact magnitude,
// floored once, no Defence/pools/affinity/chip; a cost of 0 is a full no-op. A status tick is
// never a cost: it is indirect damage from the status's snapshot, floor and minimum 1.
//
// Players (speed order S 10, P 5; both always-wait), enemy E (health 100, always-wait, speed 1):
//   S (health 30, Attack 20, Defence 5, vitality) carries two on-turn-start traits, in this order:
//     COST_VIA_SELECTOR: deal-damage at `lowest-hp-ally` (S 30 < P 40, so the selector resolves to
//       S ITSELF -- the target KIND is a selector, not `self`), offStat attack x spellPower 0.5.
//       Cost = floor(20 x 0.5) = 10 exactly (as an indirect hit it would be 10 - 0.2 x 5 = 9).
//       S 30 -> 20. rawDamage 10, finalDamage 10, affinity 1, not chip-only; tagged 'attack'.
//     ZERO_COST_DOT_LABEL: flat 1% of S's own Health, tagged 'dot' with NO statusId (the shape of
//       CATASTROPHIC_COLLAPSE): floor(30 x 1 / 100) = floor(0.3) = 0 -> a cost of 0 is a full
//       no-op: TriggerFired still fires, but NO DamageDealt and no hooks. (Read as a tick it
//       would deal the tick minimum of 1.)
//   P (health 40) is poisoned at fight start by an on-fight-start fixture trait (mini-poison,
//     duration 3): its status declares a potency of 5% of the applier's Health and carries an
//     on-turn-end snapshot-potency tick. Snapshot at application (applier P, vitality):
//     potency floor(40 x 5 / 100) = 2. P's turn end: indirect, 2 x 1.0 - 0.2 x P's Defence 20 =
//     2 - 4 = -2, raised to the tick minimum of 1: rawDamage -2, finalDamage 1, tagged 'dot' WITH
//     statusId, credited to P (the applier, alive; self-applied). P 40 -> 39. (As a cost, a
//     plain flat 2 would deal exactly 2.)
// TURN_STEPS = 2 (S's turn, P's turn).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 8109 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

const S = createCreatureId('s')
const P = createCreatureId('p')

export const COST_VIA_SELECTOR: Trait = {
  id: 'h2a-cost-via-selector',
  name: 'Cost via selector (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        offStat: 'attack',
        spellPower: 0.5,
      },
    },
  ],
}

export const ZERO_COST_DOT_LABEL: Trait = {
  id: 'h2a-zero-cost-dot-label',
  name: 'Zero cost, dot label (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { ofStat: 'health', percent: 1 },
        damageSource: 'dot',
      },
    },
  ],
}

export const MINI_POISON: StatusDef = {
  statusId: 'h2a-mini-poison',
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
  id: 'h2a-poison-self',
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

export const playerParty = makeParty('player', [
  {
    id: 's',
    health: 30,
    attack: 20,
    defence: 5,
    speed: 10,
    scriptId: 'always-wait',
    innateTraitIds: [COST_VIA_SELECTOR.id, ZERO_COST_DOT_LABEL.id],
  },
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
  [COST_VIA_SELECTOR.id, COST_VIA_SELECTOR],
  [ZERO_COST_DOT_LABEL.id, ZERO_COST_DOT_LABEL],
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
  { type: 'TurnStarted', creatureId: S },
  {
    type: 'TriggerFired',
    sourceId: S,
    hook: 'on-turn-start',
    effectId: COST_VIA_SELECTOR.id,
  },
  {
    type: 'DamageDealt',
    sourceId: S,
    targetId: S,
    rawDamage: 10,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 20,
    damageSource: 'attack',
  },
  {
    type: 'TriggerFired',
    sourceId: S,
    hook: 'on-turn-start',
    effectId: ZERO_COST_DOT_LABEL.id,
  },
  // (no DamageDealt: a cost of 0 is a full no-op)
  { type: 'Waited', creatureId: S },
  { type: 'TurnEnded', creatureId: S },
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
  { type: 'TurnEnded', creatureId: P },
]
