import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import type { Script } from '../scripting-types'

export const SEED = 7007

const ROLLER = createCreatureId('roller')
const E0 = createCreatureId('e0')
const E1 = createCreatureId('e1')
const E2 = createCreatureId('e2')

// Rule 0 never matches (there are only 3 enemies) but references random-enemy targeting
// -- proves zero RNG consumption during lookahead across a full fight, not just a unit
// test. Rule 1 is the real draw, once per roller turn.
export const RANDOM_ROLLER_SCRIPT: Script = {
  id: 'random-roller',
  rules: [
    {
      condition: { kind: 'enemy-count', comparator: '>=', count: 999 },
      action: { kind: 'attack' },
      targeting: { kind: 'random-enemy' },
    },
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'random-enemy' },
    },
  ],
}
export const ALWAYS_WAIT_SCRIPT: Script = {
  id: 'always-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const scripts = new Map([
  [RANDOM_ROLLER_SCRIPT.id, RANDOM_ROLLER_SCRIPT],
  [ALWAYS_WAIT_SCRIPT.id, ALWAYS_WAIT_SCRIPT],
])

export const playerParty = makeParty('player', [
  {
    id: 'roller',
    attack: 10,
    speed: 100,
    health: 20,
    affinity: 'body',
    scriptId: 'random-roller',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'e0',
    defence: 0,
    health: 1,
    speed: 3,
    affinity: 'body',
    scriptId: 'always-wait',
  },
  {
    id: 'e1',
    defence: 0,
    health: 1,
    speed: 2,
    affinity: 'body',
    scriptId: 'always-wait',
  },
  {
    id: 'e2',
    defence: 0,
    health: 1,
    speed: 1,
    affinity: 'body',
    scriptId: 'always-wait',
  },
])

/**
 * Hand-derived. Expected target indices are derived by calling rng.ts's own tested
 * mulberry32 primitive directly with SEED 7007, as the independent calculator (this is
 * the RNG *primitive*, already golden-tested on its own in Phase 1 -- not the
 * interpreter/resolver under test here): draw1=0.5217045086901635 -> floor(draw1*3)=1
 * (of pool [e0,e1,e2]) -> targets e1; draw2=0.008260984206572175 -> floor(draw2*2)=0 (of
 * the round-2 pool [e0,e2], e1 now dead) -> targets e0; draw3=0.1733984888996929 ->
 * floor(draw3*1)=0 (of the round-3 pool [e2] alone) -> targets e2.
 *
 * Roller (Speed 100) always acts first. Every hit: core=max(10-0,0)=10, chip=0.1,
 * raw=10.1 (neutral affinity), final=10 -- lethal against 1 HP. Each round's newly-dead
 * target still gets its own already-queued empty TurnStarted/TurnEnded bracket that
 * round (dead-before-turn skip) unless the fight already ended by then.
 */
export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ROLLER },
  { type: 'AttackDeclared', attackerId: ROLLER, targetId: E1 },
  {
    type: 'DamageDealt',
    sourceId: ROLLER,
    targetId: E1,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
  },
  { type: 'CreatureDied', creatureId: E1 },
  { type: 'TurnEnded', creatureId: ROLLER },
  { type: 'TurnStarted', creatureId: E0 },
  { type: 'Waited', creatureId: E0 },
  { type: 'TurnEnded', creatureId: E0 },
  { type: 'TurnStarted', creatureId: E1 },
  { type: 'TurnEnded', creatureId: E1 },
  { type: 'TurnStarted', creatureId: E2 },
  { type: 'Waited', creatureId: E2 },
  { type: 'TurnEnded', creatureId: E2 },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: ROLLER },
  { type: 'AttackDeclared', attackerId: ROLLER, targetId: E0 },
  {
    type: 'DamageDealt',
    sourceId: ROLLER,
    targetId: E0,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
  },
  { type: 'CreatureDied', creatureId: E0 },
  { type: 'TurnEnded', creatureId: ROLLER },
  { type: 'TurnStarted', creatureId: E0 },
  { type: 'TurnEnded', creatureId: E0 },
  { type: 'TurnStarted', creatureId: E2 },
  { type: 'Waited', creatureId: E2 },
  { type: 'TurnEnded', creatureId: E2 },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: ROLLER },
  { type: 'AttackDeclared', attackerId: ROLLER, targetId: E2 },
  {
    type: 'DamageDealt',
    sourceId: ROLLER,
    targetId: E2,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
  },
  { type: 'CreatureDied', creatureId: E2 },
  { type: 'TurnEnded', creatureId: ROLLER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
