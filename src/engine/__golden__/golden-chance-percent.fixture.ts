// Golden: the `chancePercent` probabilistic gate on a `TriggeredDef` (Phase 4 Slice E2,
// Concussive Blows-shaped) -- rolled once per firing, AFTER the cascade-depth check, BEFORE
// TriggerFired/execution, only when present. Two rigged seeds against the IDENTICAL parties/
// scripts, proving both branches of the one seeded RNG roll -- mirrors golden-cheat-death's
// two-seed pattern.
//
// Hand-derived (independent `node -e` mulberry32 trace against rng.ts's exact algorithm --
// verified fresh for this fixture, not merely copied from golden-cheat-death's own comment).
// ATTACKER (speed 20) acts before TARGET (speed 1, always-wait -- never reached, TARGET dies on
// ATTACKER's own hit). No other mechanism in this fixture consumes RNG (always-attack's
// targeting is RNG-free, no provoke/confusion), so the chancePercent roll is provably the very
// first draw of the fight in both branches.
//
//   ATTACKER->TARGET (off 15, def 0): core 15, chip 0.01*15=0.15 -> raw 15.15 -> final 15 --
//   EXACTLY lethal (TARGET health 15) in BOTH branches, unaffected by the roll (the response
//   debuffs TARGET's own Attack, not ATTACKER's outgoing damage) -- isolating the roll's only
//   observable effect to whether TriggerFired/StatModifierApplied happen at all.
//
// SEED 7's first draw is 0.0117... (< 50/100 -> the roll SUCCEEDS): TriggerFired, then
//   StatModifierApplied (TARGET's Attack 20 -> 10, factor 0.5), then the lethal hit lands.
// SEED 1's first draw is 0.6271... (>= 50/100 -> the roll FAILS): skipped silently -- no
//   TriggerFired, no StatModifierApplied -- straight to the identical lethal hit.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED_SUCCESS = 7
export const SEED_FAIL = 1

const ATTACKER = createCreatureId('attacker')
const TARGET = createCreatureId('target')

export const CONCUSSIVE_BLOWS_FIXTURE: Trait = {
  id: 'concussive-blows-fixture',
  name: 'Concussive Blows (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      chancePercent: 50,
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'triggering-source' },
        stat: 'attack',
        factor: 0.5,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 15,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['concussive-blows-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 15,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [CONCUSSIVE_BLOWS_FIXTURE.id, CONCUSSIVE_BLOWS_FIXTURE],
])

const lethalHit: CombatEvent = {
  type: 'DamageDealt',
  sourceId: ATTACKER,
  targetId: TARGET,
  rawDamage: 15.15,
  finalDamage: 15,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp: 0,
  damageSource: 'attack',
}

export const expectedEventsSuccess: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: ATTACKER,
    hook: 'on-attack',
    effectId: 'concussive-blows-fixture',
  },
  {
    type: 'StatModifierApplied',
    sourceId: ATTACKER,
    targetId: TARGET,
    stat: 'attack',
    factor: 0.5,
    effectiveBefore: 20,
    effectiveAfter: 10,
  },
  lethalHit,
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResultSuccess: FightResult = 'win'

export const expectedEventsFail: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: TARGET },
  lethalHit,
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResultFail: FightResult = 'win'
