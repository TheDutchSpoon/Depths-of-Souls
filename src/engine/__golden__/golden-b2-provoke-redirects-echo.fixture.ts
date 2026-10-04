// Golden: B2.3 (Phase 4.1-C2c) -- an ECHO's target goes through Confusion -> Tunnel Vision ->
// Provoke like any action: an enemy Provoker redirects it. Hand-derived.
//
// Players: CASTER (slot 0, speed 20, Int 20, `always-cast`, slots after createCombat exactly
// [BOLT] -- asserted) and OVERTONE (slot 1, speed 15, always-wait) carrying a fixture echo effect
// = the real Resonant Overtone's shape at chancePercent 50 (not 100: an echoed cast is itself
// observable, so a 100% echo would chain to MAX_TRIGGER_CASCADE_DEPTH; at 50% the seed below
// passes the first roll and fails the second, so the chain is exactly one echo), stacks:false.
// Enemies (HP 100, def 0): P (slot 0, speed 30, `always-provoke`), X (slot 1), Y (slot 2).
// Round 1: P provokes first (speed 30) and stays provoking until ITS next turn.
//
// Seed 9233's draws (independent mulberry32 trace): #1 0.0401, #2 0.1123, #3 0.1048, #4 0.4413,
// #5 0.6661.
//   CASTER's `always-cast` (slot 0, default target lowest-hp-enemy) -> Provoke: one provoker,
//     draw #1 -> index floor(0.0401 * 1) = 0 -> P. SpellCast(P).
//   on-action-observed dispatch #1: OVERTONE's chance roll #2 = 0.1123 < 0.50 -> passes.
//     TriggerFired; the echo is QUEUED (4.1-E: `perform-action(triggering-source)`), and the
//     original cast's own damage lands first: P 100 -> 90.
//   The grant then runs as the CASTER (draw order: chance #2 at trigger time, then when it runs):
//     gem draw #3 (over one castable slot -> slot 0); target `'random'` then the override
//     pipeline: Confusion none, Tunnel Vision none, Provoke: the ECHO'S TARGET DRAW is #4 =
//     0.4413 over the provokers [P] -> P. ActionGranted, then the echo's own SpellCast(P).
//   The echo's own on-action-observed dispatch: OVERTONE rolls #5 = 0.6661 >= 0.50 -> fails; the
//     chain stops. The echo's damage lands: P 90 -> 80.
// WHY THE SEED: before C2c (granted casts skipped the override pipeline) the echo's `'random'` draw #4 = 0.4413 would
// pick uniformly over ALL living enemies [P, X, Y] -> floor(0.4413 * 3) = floor(1.32) = 1 -> X, a
// NON-provoker. Under the override pipeline it is P.
// Damage: BOLT Int 20 x 0.5 = 10 vs def 0 -> raw 10.1 -> 10 per hit: P 100 -> 90 (echo) -> 80.
// Order: P 30, CASTER 20, OVERTONE 15, X 2, Y 1; TURN_STEPS = 2 (P, CASTER).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9233
export const TURN_STEPS = 2 // P (provokes), CASTER (cast + one echo)

const CASTER = createCreatureId('caster')
const OVERTONE = createCreatureId('overtone')
const P = createCreatureId('p')

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

export const ECHO_FIXTURE: Trait = {
  id: 'b2-echo-fixture',
  name: 'Echo (fixture, 50%)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      chancePercent: 50,
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
    id: 'caster',
    health: 40,
    intelligence: 20,
    defence: 0,
    speed: 20,
    scriptId: 'always-cast',
    equippedSpells: [BOLT],
  },
  {
    id: 'overtone',
    health: 40,
    defence: 0,
    speed: 15,
    scriptId: 'always-wait',
    innateTraitIds: [ECHO_FIXTURE.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'p', health: 100, defence: 0, speed: 30, scriptId: 'always-provoke' },
  { id: 'x', health: 100, defence: 0, speed: 2, scriptId: 'always-wait' },
  { id: 'y', health: 100, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ECHO_FIXTURE.id, ECHO_FIXTURE],
])

function hit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: P,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'cast',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'Provoked', creatureId: P },
  { type: 'TurnEnded', creatureId: P },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: P,
  },
  {
    type: 'TriggerFired',
    sourceId: OVERTONE,
    hook: 'on-action-observed',
    effectId: ECHO_FIXTURE.id,
  },
  hit(90), // 4.1-E: the ORIGINAL cast's payload completes first (the echo is queued) ...
  // ... then the grant runs (draws #3 gem, #4 target) and is accepted: ActionGranted, then the
  // echo's own SpellCast, whose target went through Provoke -> P (NOT the random pick X).
  {
    type: 'ActionGranted',
    sourceId: OVERTONE,
    actorId: CASTER,
    effectId: ECHO_FIXTURE.id,
  },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: P,
  },
  hit(80), // the echo's damage (its own re-observation, draw #5, failed to echo again)
  { type: 'TurnEnded', creatureId: CASTER },
]
