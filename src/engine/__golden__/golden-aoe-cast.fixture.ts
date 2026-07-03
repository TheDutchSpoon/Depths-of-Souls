import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import type { Script } from '../scripting-types'
import type { Spell } from '../types'

export const SEED = 3003

const CASTER = createCreatureId('caster')
const E1 = createCreatureId('e1')
const E2 = createCreatureId('e2')

export const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  spellPower: 0.3,
}

export const CAST_AOE_SCRIPT: Script = {
  id: 'cast-aoe',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
}

export const scripts = new Map([[CAST_AOE_SCRIPT.id, CAST_AOE_SCRIPT]])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    intelligence: 20,
    speed: 100,
    health: 30,
    affinity: 'body',
    scriptId: 'cast-aoe',
    equippedSpells: [CINDER_NOVA],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e1', defence: 0, health: 5, speed: 2, affinity: 'body' },
  { id: 'e2', defence: 0, health: 5, speed: 1, affinity: 'body' },
])

/**
 * Hand-derived, not generated from the implementation. Caster acts first (Speed 100).
 * offStat = Intelligence(20) x spellPower(0.3) = 6. Both enemies: core=max(6-0,0)=6,
 * chip=0.01*6=0.06, raw=6.06 (neutral affinity, x1.0), final=6 -- lethal against 5 HP
 * each. The frozen AOE target set is [e1, e2] (slot order); both are hit and die inside
 * caster's own turn, before either enemy ever gets a turn -- the fight ends as a win
 * right there.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'aoe',
    casterId: CASTER,
    gemSlot: 0,
    targetIds: [E1, E2],
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: E1,
    rawDamage: 6.06,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'cast',
  },
  { type: 'CreatureDied', creatureId: E1 },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: E2,
    rawDamage: 6.06,
    finalDamage: 6,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'cast',
  },
  { type: 'CreatureDied', creatureId: E2 },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
