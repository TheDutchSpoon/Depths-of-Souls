// Golden: B6 (Phase 4.1-C, D6) -- a provoking creature Stunned before its next turn stops
// provoking at that turn's start, with no stale redirect afterward. Before this fix, turn-start
// cleanup only ran inside the `!suppressed` decide+action gate, so a Stunned/Sleeping creature
// kept Defend/Provoke through its own skipped turn -- Provoke would have kept redirecting HERO's
// attacks at PROVOKER in round 2 even after it was Stunned.
//
// PROVOKER carries a fixture trait that self-inflicts a Stun-shaped status (on-turn-start ->
// suppress-action, scope 'all') the instant it takes damage (on-damage-taken -> apply-status).
// WEAKLING has less HP than PROVOKER throughout, so HERO's "attack the lowest-HP enemy" rule is
// the discriminator: whichever enemy it actually hits reveals whether Provoke's redirect is still
// active.
//
// Hand-derived (independent `node -e` calculator). Turn order every round (Speed desc):
// provoker(30), hero(20), weakling(10). No random selectors/chancePercent anywhere -- SEED is
// inert (the sole provoker forces the redirect's RNG-drawn index to 0 regardless of its value).
//
//   Round 1: PROVOKER provokes. HERO's own rule would naturally pick WEAKLING (10 HP) as the
//     lowest-HP enemy, but PROVOKER is provoking (the sole provoker) -- redirected to PROVOKER
//     instead: off=10, def=0: core=10, chip=0.01*10=0.1 -> raw=10.1 -> final=10. PROVOKER
//     30 -> 20, survives -> on-damage-taken fires -> self-applies the stun-fixture status
//     (StatusApplied). WEAKLING waits.
//   Round 2: PROVOKER's turn-start hooks fire the stun-fixture's on-turn-start -> suppress-action
//     (TriggerFired, suppressed=true). Turn-start cleanup runs regardless (B6): PROVOKER's
//     `provoking` flag (still true from round 1) is cleared, emitting
//     ActionStateEnded{defending:false, provoking:true}. No action follows (empty bracket -- the
//     turn was skipped). HERO's rule now resolves NORMALLY (no provoker left) -> the lowest-HP
//     enemy is WEAKLING (10 HP) vs PROVOKER (20 HP) -- HERO hits WEAKLING, not PROVOKER, proving
//     the redirect did not stick: off=10, def=0: raw=10.1, final=10. WEAKLING 10 -> 0, dies.
//     PROVOKER is still alive, so the fight doesn't end here. WEAKLING's own round-2 turn is an
//     empty dead-before-turn bracket.
//
// Captured as exactly 6 explicit resolveTurn steps (provoker/hero/weakling x 2 rounds), mirroring
// golden-on-action-hooks' TURN_STEPS style -- this golden is about the turn-start sequencing, not
// the fight's eventual outcome.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import type { CombatEvent } from '../types'
import type { ConditionStatusDef, StatusDef, Trait } from '../effect-types'
import type { Script } from '../scripting-types'

export const SEED = 6660 // No RNG-sensitive branch anywhere; seed is inert.

const PROVOKER = createCreatureId('provoker')
const HERO = createCreatureId('hero')
const WEAKLING = createCreatureId('weakling')

const STUN_STATUS_ID = 'b6-stun-fixture'

export const STUN_FIXTURE: ConditionStatusDef = {
  category: 'condition-status',
  statusId: STUN_STATUS_ID,
  cap: 1,
  triggers: [{ hook: 'on-turn-start', response: { kind: 'suppress-action' } }],
  polarity: 'debuff',
  defaultDuration: 3,
}

export const STUN_ON_HIT_FIXTURE: Trait = {
  id: 'b6-stun-on-hit-fixture',
  name: 'Stun On Hit (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: STUN_STATUS_ID, duration: 3 },
      },
    },
  ],
}

export const ATTACK_LOWEST_SCRIPT: Script = {
  id: 'b6-attack-lowest',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}
export const ALWAYS_PROVOKE_SCRIPT: Script = {
  id: 'b6-always-provoke',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'provoke' } }],
}
export const ALWAYS_WAIT_SCRIPT: Script = {
  id: 'b6-always-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    attack: 10,
    defence: 0,
    health: 50,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'b6-attack-lowest',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'provoker',
    defence: 0,
    health: 30,
    speed: 30,
    affinity: 'vitality',
    scriptId: 'b6-always-provoke',
    innateTraitIds: [STUN_ON_HIT_FIXTURE.id],
  },
  {
    id: 'weakling',
    defence: 0,
    health: 10,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'b6-always-wait',
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  [ATTACK_LOWEST_SCRIPT.id, ATTACK_LOWEST_SCRIPT],
  [ALWAYS_PROVOKE_SCRIPT.id, ALWAYS_PROVOKE_SCRIPT],
  [ALWAYS_WAIT_SCRIPT.id, ALWAYS_WAIT_SCRIPT],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [STUN_ON_HIT_FIXTURE.id, STUN_ON_HIT_FIXTURE],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [STUN_FIXTURE.statusId, STUN_FIXTURE],
])

export const TURN_STEPS = 6 // provoker/hero/weakling x 2 rounds

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: PROVOKER },
  { type: 'Provoked', creatureId: PROVOKER },
  { type: 'TurnEnded', creatureId: PROVOKER },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: PROVOKER },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: PROVOKER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 20,
    damageSource: 'attack',
  },
  {
    type: 'TriggerFired',
    sourceId: PROVOKER,
    hook: 'on-damage-taken',
    effectId: STUN_ON_HIT_FIXTURE.id,
  },
  {
    type: 'StatusApplied',
    targetId: PROVOKER,
    statusId: STUN_STATUS_ID,
    stacks: 1,
    duration: 3,
    sourceId: PROVOKER,
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: WEAKLING },
  { type: 'Waited', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: WEAKLING },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: PROVOKER },
  {
    type: 'TriggerFired',
    sourceId: PROVOKER,
    hook: 'on-turn-start',
    effectId: STUN_STATUS_ID,
  },
  // B6 fix: cleanup runs even though the turn is suppressed -- PROVOKER's stale `provoking`
  // flag from round 1 is cleared here, not carried into a redirect that no longer applies.
  { type: 'ActionStateEnded', creatureId: PROVOKER, defending: false, provoking: true },
  // No action: the turn was suppressed (empty bracket).
  { type: 'TurnEnded', creatureId: PROVOKER },
  { type: 'TurnStarted', creatureId: HERO },
  // No provoker left -- HERO's rule resolves normally to the actual lowest-HP enemy (WEAKLING,
  // not PROVOKER): the redirect did not stick.
  { type: 'AttackDeclared', attackerId: HERO, targetId: WEAKLING },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: WEAKLING,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: WEAKLING },
  { type: 'TurnEnded', creatureId: WEAKLING },
]
