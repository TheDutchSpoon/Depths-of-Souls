import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import type { Script } from '../scripting-types'

export const SEED = 8008

const CASTER = createCreatureId('caster')
const FOE = createCreatureId('foe')

// Rule 0 always matches its condition but its action is invalid (empty gem slot) --
// skip to rule 1. Zero SpellCast events should ever appear in the log.
export const CAST_THEN_ATTACK_SCRIPT: Script = {
  id: 'cast-then-attack',
  rules: [
    { condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } },
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

export const scripts = new Map([[CAST_THEN_ATTACK_SCRIPT.id, CAST_THEN_ATTACK_SCRIPT]])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    attack: 10,
    speed: 20,
    health: 20,
    affinity: 'body',
    scriptId: 'cast-then-attack',
    equippedSpells: [null],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', defence: 0, health: 10, speed: 10, affinity: 'body' },
])

/**
 * Hand-derived. Caster's slot 0 is empty, so rule 0 (Cast) is invalid and skipped every
 * turn -- the interpreter falls through to rule 1 (Attack) instead. Caster's hit:
 * core=max(10-0,0)=10, chip=0.01*10=0.1, raw=10.1 (neutral affinity), final=10 --
 * lethal against foe's 10 HP, ending the fight in a single hit.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'AttackDeclared', attackerId: CASTER, targetId: FOE },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: FOE,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
  },
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
