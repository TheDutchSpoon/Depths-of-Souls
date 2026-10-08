// Golden: a fight-start wipe ends the fight before RoundStarted (Phase 4.1-F3, ASSUMPTION 61):
// FightStarted ... FightEnded, with no round and no turn. Hand-derived.
//
// HERO (player, speed 20) carries a fixture trait with ONE on-fight-start effect: a flat 999 hit
// on the lowest-HP enemy (no TriggerFired suppression, so one TriggerFired). FOE (enemy, 30 HP) is
// the only enemy: the hit kills it, the enemy side is empty, and the fight ends at once. A flat
// deal-damage is tagged 'dot' (default for flatAmount) and carries no statusId; remainingHp
// clamps at 0. Flat mode on another creature is INDIRECT damage (4.1-H2a): the flat 999 is the
// magnitude, so 999 x 1 x 1 x 1 - 0.2 x FOE's defence 20 (the fixture default) = 995, no chip:
// raw 995 -> final 995 (still far above FOE's 30 HP). The win check runs right after the hook pass and its drain, before the round starts.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4305

const HERO = createCreatureId('hero')
const FOE = createCreatureId('foe')

export const OPENING_STRIKE_TRAIT: Trait = {
  id: 'f3-opening-strike-fixture',
  name: 'Opening Strike (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
        flatAmount: 999,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    speed: 20,
    scriptId: 'always-attack',
    innateTraitIds: [OPENING_STRIKE_TRAIT.id],
  },
])
export const enemyParty = makeParty('enemy', [
  { id: 'foe', health: 30, speed: 10, scriptId: 'always-attack' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [OPENING_STRIKE_TRAIT.id, OPENING_STRIKE_TRAIT],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: HERO,
    hook: 'on-fight-start',
    effectId: OPENING_STRIKE_TRAIT.id,
  },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: FOE,
    rawDamage: 995,
    finalDamage: 995,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'dot',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
