// Golden: Sleep's two-trigger composition (Phase 4 Slice E2) -- a `ConditionStatusDef` carrying
// BOTH `on-turn-start -> suppress-action` (like Stun, so the sleeper's own turn is actually
// skipped) AND `on-damage-taken -> remove-status(self, sleep-fixture)` (the wake-up, firing
// POST-damage so the waking hit still lands #1's vs-Sleeping bonus). Fixture-shaped, not real
// Sleep content (that's H1's job) -- proves the underlying `triggers[]` + `remove-status`
// mechanism end-to-end, composed with #1's `conditional-damage-bonus`.
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
// SLEEPER carries a self-inflicted Sleep (an `on-fight-start -> apply-status(self)` trait --
// a fixture stand-in for "starts the fight asleep"). ATTACKER (speed 20) acts before SLEEPER
// (speed 10) in round 1.
//
//   on-fight-start: SLEEPER's own trait applies Sleep to itself (StatusApplied).
//   ATTACKER->SLEEPER (off 20, def 0, +50% dealt -- SLEEPER carries Sleep, has-status subject
//     'target' is true at hit time, BEFORE the wake-up fires): core 20, chip 0.01*20=0.2 ->
//     (20.2) x 1.5 dealtMultiplier -> raw 30.299999999999997 -> final 30. SLEEPER 100 - 30 -> 70,
//     survives -> on-damage-taken fires -> Sleep's wake-up trigger removes it (StatusExpired).
//   SLEEPER's own turn: on-turn-start finds NO Sleep left (removed on ATTACKER's turn, same
//     round) -> no suppression -> SLEEPER acts normally. SLEEPER->ATTACKER (off 15, def 0, no
//     bonus -- ATTACKER never carries Sleep): core 15, chip 0.01*15=0.15 -> raw 15.15 ->
//     final 15. ATTACKER 100 - 15 -> 85.
//
// Captured as exactly round 1's two turns (two explicit resolveTurn steps, mirroring
// golden-on-action-hooks' style) -- neither creature dies, so there's nothing further to prove
// by running the fight to completion.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { ConditionStatusDef, StatusDef, Trait } from '../effect-types'

export const SEED = 4004 // No RNG consumed anywhere in this fixture; seed is inert.

const ATTACKER = createCreatureId('attacker')
const SLEEPER = createCreatureId('sleeper')

const SLEEP_STATUS_ID = 'sleep-fixture'

export const SLEEP_FIXTURE: ConditionStatusDef = {
  category: 'condition-status',
  statusId: SLEEP_STATUS_ID,
  cap: 1,
  triggers: [
    { hook: 'on-turn-start', response: { kind: 'suppress-action' } },
    {
      hook: 'on-damage-taken',
      response: {
        kind: 'remove-status',
        target: { kind: 'self' },
        filter: { statusId: SLEEP_STATUS_ID },
      },
    },
  ],
  polarity: 'debuff',
  defaultDuration: 3,
}

export const SLEEP_SELF_FIXTURE: Trait = {
  id: 'sleep-self-fixture',
  name: 'Sleep Self (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: SLEEP_STATUS_ID, duration: 5 },
      },
    },
  ],
}

export const REAPER_FIXTURE: Trait = {
  id: 'reaper-fixture',
  name: 'Reaper (fixture)',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: { kind: 'has-status', subject: 'target', statusId: SLEEP_STATUS_ID },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 20,
    health: 100,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['reaper-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'sleeper',
    attack: 15,
    health: 100,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['sleep-self-fixture'],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SLEEP_SELF_FIXTURE.id, SLEEP_SELF_FIXTURE],
  [REAPER_FIXTURE.id, REAPER_FIXTURE],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [SLEEP_FIXTURE.statusId, SLEEP_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: SLEEPER,
    hook: 'on-fight-start',
    effectId: 'sleep-self-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: SLEEPER,
    statusId: SLEEP_STATUS_ID,
    stacks: 1,
    duration: 5,
    sourceId: SLEEPER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: SLEEPER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: SLEEPER,
    rawDamage: 30.299999999999997,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 70,
    damageSource: 'attack',
  },
  {
    type: 'TriggerFired',
    sourceId: SLEEPER,
    hook: 'on-damage-taken',
    effectId: SLEEP_STATUS_ID,
  },
  { type: 'StatusExpired', creatureId: SLEEPER, statusId: SLEEP_STATUS_ID },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'TurnStarted', creatureId: SLEEPER },
  { type: 'AttackDeclared', attackerId: SLEEPER, targetId: ATTACKER },
  {
    type: 'DamageDealt',
    sourceId: SLEEPER,
    targetId: ATTACKER,
    rawDamage: 15.15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 85,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: SLEEPER },
]
