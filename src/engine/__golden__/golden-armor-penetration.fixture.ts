// Golden: the `armor-penetration` passive EffectDef (Phase 4 Slice B) -- ATTACKER ignores 50%
// of DEFENDER's Defence, applied before the subtractive core:
// effDefForCore = effDef x (1 - armorPenetrationPercent).
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
//
//   effDefForCore = 20 x (1 - 0.5) = 10.
//   ATTACKER->DEFENDER (off 30, effDef 10): core 20, chip 0.01*30=0.3 -> raw 20.3 -> final 20.
//   DEFENDER health 20 - 20 -> 0 -> dies. One hit, one round.
//
// (Without armor-pen the same hit would be core 10, chip 0.3, raw 10.3, final 10 -- less than
// half -- so this golden also serves as the mechanism's own before/after proof.)

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 3003 // No RNG consumed; seed is inert.

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const ARMOR_PIERCE: Trait = {
  id: 'armor-pierce-fixture',
  name: 'Armor Pierce',
  effects: [{ category: 'armor-penetration', percent: 0.5 }],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 30,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['armor-pierce-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'defender',
    health: 20,
    defence: 20,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ARMOR_PIERCE.id, ARMOR_PIERCE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 20.3,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: DEFENDER },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
