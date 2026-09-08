// Golden: the `cross-stat` passive EffectDef (Phase 4 Slice B) -- ATTACKER's own Defence feeds
// its Attack damage (Shield Bash-shaped): a flat bonus added to effOffStat AFTER spellPower,
// BEFORE the subtractive core (and feeding the chip floor, since that scales off the same
// effOffStat).
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
//
//   crossStatBonus = percentPerRank(0.5) x effective(Defence)(40) = 20.
//   effOffStat = off(Attack, 10) + crossStatBonus(20) = 30.
//   ATTACKER->DEFENDER (effOffStat 30, def 5): core 25, chip 0.01*30=0.3 -> raw 25.3 -> final 25.
//   DEFENDER health 25 - 25 -> 0 -> dies. One hit, one round.
//
// (Without the cross-stat bonus the same hit would be core 5, chip 0.1, raw 5.1, final 5 -- a
// fifth of the bonus'd hit -- so this golden also serves as the mechanism's before/after proof.)

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4004 // No RNG consumed; seed is inert.

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const SHIELD_BASH: Trait = {
  id: 'shield-bash-fixture',
  name: 'Shield Bash',
  effects: [
    {
      category: 'cross-stat',
      fromStat: 'defence',
      percentPerRank: 0.5,
      appliesTo: 'attack',
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 10,
    defence: 40,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['shield-bash-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'defender',
    health: 25,
    defence: 5,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([[SHIELD_BASH.id, SHIELD_BASH]])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 25.3,
    finalDamage: 25,
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
