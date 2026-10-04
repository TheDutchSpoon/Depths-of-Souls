// Golden: 4.1-E (A2) -- an echo chain through the SAME Overtone, every hop, truncated by the real
// cascade cap (MAX_TRIGGER_CASCADE_DEPTH = 500) with a mandatory CascadeTruncated. Hand-derived:
// the per-hop template below is derived by hand once; the loop only REPEATS that template, and
// nothing in the expected log comes from running the engine. The test also asserts explicit
// checkpoints (hops 1, 2, 499, 500 and the truncation) written out independently of the loop.
//
// SETUP. One player creature, BEARER: Int 20, Defence 10, HP 100, speed 20, `always-cast`, one
// equipped spell BOLT (enemy-side single target, spellPower 0.5), and the fixture trait
// `e-overtone-fixture` = an Overtone-shaped trigger: on-action-observed (relationship 'ally',
// actionKind 'cast'), chancePercent 100, stacks false, response perform-action(triggering-source,
// cast 'random' at a 'random' target). BEARER is its own observer AND the observed caster (an
// `ally` observation includes self), so EVERY hop passes through the very same effect instance.
// One enemy, TARGET: HP 1000, Defence 10, speed 1, `always-wait`. Gem and target pools are of size
// one, so no draw value matters; the chance (100%) always passes. Only the cap can end the chain
// (TARGET survives it: 501 hits of 1 against 1000 HP).
//
// DAMAGE (every hit identical): off = Int 20 x spellPower 0.5 = 10, vs Defence 10: core
// MAX(10 - 10, 0) = 0, chip 0.01 x 10 = 0.1 -> rawDamage 0.1 -> final MAX(1, floor(0.1)) = 1,
// wasChipOnly true (core is 0). All vitality (x1.0). HP: 1000 - 1 per hit.
//
// CHAIN (depth arithmetic). The original cast runs at depth 0. Its on-action-observed pass: the
// Overtone checks depth + 1 = 1 <= 500 -> TriggerFired; the response QUEUES grant 1 carrying the
// trigger's own depth, 1. The original's hit lands (999), then the queue drains: grant k runs at
// depth k -> ActionGranted, a real SpellCast, whose own observation checks depth k + 1: for
// k < 500 that passes (TriggerFired, grant k + 1 queued at depth k + 1); for k = 500 it is 501 >
// 500 -> CascadeTruncated { creatureId: BEARER, effectId: the trait, depth: 501 } and no grant 501.
// So: 500 echoes, 501 casts in all, 500 TriggerFireds, 500 ActionGranteds, ONE CascadeTruncated.
//
// LOG. FightStarted, RoundStarted, TurnStarted(BEARER), then the original cast:
//   SpellCast, TriggerFired (grant 1), DamageDealt (rem 999),
// then, for k = 1..500, the hop template:
//   ActionGranted, SpellCast, (TriggerFired if k < 500, else CascadeTruncated), DamageDealt
//   (rem 999 - k),
// then TurnEnded (TURN_STEPS = 1; the TARGET never acts). 6 + 500 x 4 + 1 = 2007 events. Final
// TARGET HP 1000 - 501 = 499.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4101
export const TURN_STEPS = 1 // BEARER's turn: the original cast and the whole chain

export const BEARER = createCreatureId('bearer')
export const TARGET = createCreatureId('target')

/** The real cap this golden is derived against (config.ts's MAX_TRIGGER_CASCADE_DEPTH). Written
 * out here, not imported, so the derivation above stays independent of the engine. */
export const CAP = 500

export const BOLT: Spell = {
  id: 'bolt-fixture',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}

export const OVERTONE_FIXTURE: Trait = {
  id: 'e-overtone-fixture',
  name: 'Overtone (fixture, 100%)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      chancePercent: 100,
      stacks: false,
      response: {
        kind: 'perform-action',
        actor: 'triggering-source',
        intent: {
          action: { kind: 'cast', gemSlot: 'random' },
          targeting: { kind: 'random' },
        },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'bearer',
    health: 100,
    intelligence: 20,
    defence: 10,
    speed: 20,
    scriptId: 'always-cast',
    equippedSpells: [BOLT],
    innateTraitIds: [OVERTONE_FIXTURE.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'target', health: 1000, defence: 10, speed: 1, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [OVERTONE_FIXTURE.id, OVERTONE_FIXTURE],
])

const castEvent: CombatEvent = {
  type: 'SpellCast',
  targetShape: 'single',
  casterId: BEARER,
  gemSlot: 0,
  targetId: TARGET,
}
const triggerFired: CombatEvent = {
  type: 'TriggerFired',
  sourceId: BEARER,
  hook: 'on-action-observed',
  effectId: OVERTONE_FIXTURE.id,
}
function hit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: BEARER,
    targetId: TARGET,
    rawDamage: 0.1,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp,
    damageSource: 'cast',
  }
}
const actionGranted: CombatEvent = {
  type: 'ActionGranted',
  sourceId: BEARER,
  actorId: BEARER,
  effectId: OVERTONE_FIXTURE.id,
}
const truncated: CombatEvent = {
  type: 'CascadeTruncated',
  creatureId: BEARER,
  effectId: OVERTONE_FIXTURE.id,
  depth: CAP + 1,
}

/** One echo hop k (1-based) -- the hand-derived template; the loop below only repeats it. */
function hop(k: number): CombatEvent[] {
  return [actionGranted, castEvent, k < CAP ? triggerFired : truncated, hit(999 - k)]
}

const hops: CombatEvent[] = []
for (let k = 1; k <= CAP; k++) hops.push(...hop(k))

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BEARER },
  castEvent, // the original cast
  triggerFired, // its observation: grant 1 queued at depth 1
  hit(999), // the original's hit lands BEFORE any echo runs
  ...hops,
  { type: 'TurnEnded', creatureId: BEARER },
]
