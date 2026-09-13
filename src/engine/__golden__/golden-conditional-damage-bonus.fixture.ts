// Golden: the `conditional-damage-bonus` passive EffectDef (Phase 4 Slice E2, Cull the Weak /
// Ambusher / Gloomjaws / Sporch's Reaper-shaped) -- ATTACKER carries +50% dealt, gated on a
// `hp-percent` condition with subject `'target'` (< 50%), evaluated against the CURRENT damage
// target at hit time via gatherConditionalDamageBonus, folded into dealtMods alongside
// gatherDealtMods -- one clean modified hit, never a second `on-damage-dealt` instance.
//
// Explicit BEFORE/AFTER proof on the SAME target across two rounds (Slice B/D discipline for
// formula-touching work): hit 1 lands while TARGET is still above the threshold (byte-identical
// to the pre-Slice-E2 formula -- no bonus); hit 1 itself brings TARGET below the threshold, so
// hit 2 (round 2) lands WITH the bonus, proving the mechanism actually engages once the gate
// opens, on the same fixture, same attacker, same formula inputs otherwise.
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
// ATTACKER (speed 20) acts before TARGET (speed 1, always-wait -- never attacks back).
//
//   Hit 1 (TARGET at 45/45 = 100%, not < 50% -> no bonus): off 30, def 0 -> core 30,
//     chip 0.01*30=0.3 -> raw 30.3 -> final 30. TARGET 45 - 30 -> 15 (15/45 = 33.3%, now < 50%).
//   Hit 2 (TARGET at 15/45 = 33.3%, < 50% -> +50% dealt): core 30, chip 0.3 -> (30.3) x 1.5
//     dealtMultiplier -> raw 45.45 -> final 45. TARGET 15 - 45 -> 0 -> dies. Fight ends in
//     ATTACKER's win on its own round-2 turn (TARGET's round-2 turn is never reached).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8008 // No RNG consumed anywhere in this fixture; seed is inert.

const ATTACKER = createCreatureId('attacker')
const TARGET = createCreatureId('target')

export const CULL_THE_WEAK_FIXTURE: Trait = {
  id: 'cull-the-weak-fixture',
  name: 'Cull the Weak (fixture)',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: {
        kind: 'hp-percent',
        subject: 'target',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 50,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 30,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['cull-the-weak-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 45,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [CULL_THE_WEAK_FIXTURE.id, CULL_THE_WEAK_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: TARGET,
    rawDamage: 30.3,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 15,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: TARGET,
    rawDamage: 45.45,
    finalDamage: 45,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
