// Golden: a FLAT-mode response on ANOTHER creature is INDIRECT damage (Phase 4.1-H2a, ASSUMPTIONS
// 112, 134): the flat amount is the magnitude, and there is no Defence bypass and no true-damage
// channel. Hand-derived. All vitality (neutral x1.0), no dealt/taken mods, so
//   raw = flat - 0.2 x Defence;  final = MAX(1, floor(raw)).
//
// Players (always-wait): U1 (health 100, Defence 20, speed 10), U2 (health 50, Defence 20, speed 5).
// Enemies (always-wait), each with an on-turn-start flat hit (default tag 'dot', no statusId, so
// NOT a status tick): R1 (speed 2) flat 20 at the highest-HP enemy (U1); R2 (speed 1) flat 3 at the
// lowest-HP enemy (U2).
//   R1 -> U1: 20 - 0.2 x 20 = 16 -> final 16. U1 100 -> 84.   (Before H2a: 20, Defence ignored.)
//   R2 -> U2: 3 - 4 = -1 -> raw -1 -> MAX(1, floor(-1)) = 1.   U2 50 -> 49.
//     (Before H2a: 3. A flat 3 against Defence 20 now deals the minimum of 1.)
// TURN_STEPS = 4 (U1, U2, R1, R2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8108 // No RNG consumed; seed is inert.
export const TURN_STEPS = 4

const U1 = createCreatureId('u1')
const U2 = createCreatureId('u2')
const R1 = createCreatureId('r1')
const R2 = createCreatureId('r2')

function flatTrait(
  id: string,
  selectorKind: 'highest-hp-enemy' | 'lowest-hp-enemy',
  flatAmount: number,
): Trait {
  return {
    id,
    name: `${id} (fixture)`,
    effects: [
      {
        category: 'triggered',
        hook: 'on-turn-start',
        response: {
          kind: 'deal-damage',
          target: { kind: 'selector', selector: { kind: selectorKind } },
          flatAmount,
        },
      },
    ],
  }
}

export const FLAT_20: Trait = flatTrait('h2a-flat-20', 'highest-hp-enemy', 20)
export const FLAT_3: Trait = flatTrait('h2a-flat-3', 'lowest-hp-enemy', 3)

export const playerParty = makeParty('player', [
  { id: 'u1', health: 100, defence: 20, speed: 10, scriptId: 'always-wait' },
  { id: 'u2', health: 50, defence: 20, speed: 5, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'r1', speed: 2, scriptId: 'always-wait', innateTraitIds: [FLAT_20.id] },
  { id: 'r2', speed: 1, scriptId: 'always-wait', innateTraitIds: [FLAT_3.id] },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [FLAT_20.id, FLAT_20],
  [FLAT_3.id, FLAT_3],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: U1 },
  { type: 'Waited', creatureId: U1 },
  { type: 'TurnEnded', creatureId: U1 },
  { type: 'TurnStarted', creatureId: U2 },
  { type: 'Waited', creatureId: U2 },
  { type: 'TurnEnded', creatureId: U2 },
  { type: 'TurnStarted', creatureId: R1 },
  { type: 'TriggerFired', sourceId: R1, hook: 'on-turn-start', effectId: FLAT_20.id },
  {
    type: 'DamageDealt',
    sourceId: R1,
    targetId: U1,
    rawDamage: 16,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 84,
    damageSource: 'dot',
  },
  { type: 'Waited', creatureId: R1 },
  { type: 'TurnEnded', creatureId: R1 },
  { type: 'TurnStarted', creatureId: R2 },
  { type: 'TriggerFired', sourceId: R2, hook: 'on-turn-start', effectId: FLAT_3.id },
  {
    type: 'DamageDealt',
    sourceId: R2,
    targetId: U2,
    rawDamage: -1,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 49,
    damageSource: 'dot',
  },
  { type: 'Waited', creatureId: R2 },
  { type: 'TurnEnded', creatureId: R2 },
]
