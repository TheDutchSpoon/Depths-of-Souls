// Golden: `accumulation: 'additive'` on a `taken`-direction `damage-modifier` (Phase 4 Slice D,
// PR #47 review amendment -- real Bulwark-SHAPED: specializations/shieldbarer.md's actual
// "-5% damage taken (cap 80%) for each time the creature has Defended this battle," unchanged
// under this decision). Companion to golden-defend-count, which pins the `'multiplicative'`
// (default) mode: a purely multiplicative `magnitude ** count` does NOT implement Bulwark's hard
// cap -- it sails past 80% toward 100% as count grows (`0.95 ** 32 ≈ 0.19`, an 81% reduction) --
// so `'additive'` sums the per-unit reduction × count and hard-clamps it instead.
//
// BEARER starts the fight having ALREADY defended 15 times this battle (Creature.defendCount
// preset via the fixture, standing in for 15 earlier rounds this golden doesn't need to spend --
// keeps the fixture small per CONVENTIONS' testing discipline while still reaching the cap for
// real). Two more real Defends in this fight push defendCount to exactly 16 (the count at which
// `(1 - 0.95) × 16 = 0.8` reaches the cap precisely) and then to 17 (one PAST the cap), proving
// the clamp actually holds rather than merely being asymptotically close.
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
//
//   Round 1 (defendCount 16 by the time STRIKER's hit lands):
//     perUnitReduction = 1 - 0.95 = 0.05. totalReduction = min(0.05 × 16, 0.8) = 0.8 (exactly the
//     cap). bulwarkFactor = 1 - 0.8 = 0.19999999999999996.
//     off 40, effDef 10*1.5=15 (defending): core 25, chip 0.4 -> core+chip 25.4.
//     takenFactors: Defend 0.65 × bulwarkFactor(0.19999999999999996) = 0.12999999999999998.
//     raw = 25.4 × 0.12999999999999998 = 3.301999999999999 -> final 3.
//     BEARER health 6 - 3 -> 3, alive.
//   Round 2 (defendCount 17 -- ONE PAST the count that reaches the cap):
//     totalReduction = min(0.05 × 17, 0.8) = min(0.85, 0.8) = 0.8 -- STILL clamped, identical to
//     round 1's reading (the clamp holding, not merely a coincidence of the input numbers).
//     bulwarkFactor/taken/raw/final are therefore IDENTICAL to round 1: final 3.
//     BEARER health 3 - 3 -> 0 -> dies. Fight ends mid-round -- STRIKER's side wins.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { DamageModifierDef, Trait } from '../effect-types'

export const SEED = 1002 // No RNG consumed; seed is inert.

const BEARER = createCreatureId('bearer')
const STRIKER = createCreatureId('striker')

const BULWARK_STATUS_ID = 'bulwark-additive-fixture-status'

export const BULWARK_ADDITIVE_FIXTURE: Trait = {
  id: 'bulwark-additive-fixture',
  name: 'Bulwark, additive-capped (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: BULWARK_STATUS_ID, duration: 10 },
      },
    },
  ],
}

export const BULWARK_ADDITIVE_STATUS: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: BULWARK_STATUS_ID,
  cap: 1, // applied exactly once -- magnitudeSource, not re-application, drives the scaling
  direction: 'taken',
  magnitude: 0.95, // same per-unit-factor authoring as the multiplicative fixture
  magnitudeSource: { kind: 'count', of: 'self-defend-count' },
  accumulation: 'additive',
  reductionCap: 0.8, // shieldbarer.md's real "cap 80%"
}

export const playerParty = makeParty('player', [
  {
    id: 'bearer',
    health: 6,
    defence: 10,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-defend',
    innateTraitIds: ['bulwark-additive-fixture'],
    defendCount: 15, // 15 earlier Defends this battle, preset so the golden stays small
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'striker',
    attack: 40,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [BULWARK_ADDITIVE_FIXTURE.id, BULWARK_ADDITIVE_FIXTURE],
])
export const statuses = new Map([
  [BULWARK_ADDITIVE_STATUS.statusId, BULWARK_ADDITIVE_STATUS],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-fight-start',
    effectId: 'bulwark-additive-fixture',
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: BULWARK_STATUS_ID,
    stacks: 1,
    duration: 10,
    sourceId: BEARER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Defended', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: BEARER },
  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: BEARER },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: BEARER,
    rawDamage: 3.301999999999999,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 3,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: BEARER },
  { type: 'Defended', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: BEARER },
  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: BEARER },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: BEARER,
    rawDamage: 3.301999999999999, // IDENTICAL to round 1 -- the clamp holding, not coincidence
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: BEARER },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'FightEnded', result: 'loss' },
]

export const expectedResult: FightResult = 'loss'
