import type { CombatEvent, FightResult } from '../types'
import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'

export const SEED = 4004

// All six players share stats (only id/slot/speed differ) so every hit uses the same
// damage-formula inputs -- one hand calculation covers all six kills. p5's Speed (35)
// deliberately ties e0's Speed (35) to exercise "player side wins ties" in a real
// fixture, not just the turn-order unit test.
const PLAYER_STATS = { attack: 30, defence: 10, health: 50, affinity: 'body' } as const
const ENEMY_STATS = { attack: 5, defence: 5, health: 10, affinity: 'body' } as const // neutral

export const playerParty = makeParty('player', [
  { id: 'p0', speed: 60, ...PLAYER_STATS },
  { id: 'p1', speed: 55, ...PLAYER_STATS },
  { id: 'p2', speed: 50, ...PLAYER_STATS },
  { id: 'p3', speed: 45, ...PLAYER_STATS },
  { id: 'p4', speed: 40, ...PLAYER_STATS },
  { id: 'p5', speed: 35, ...PLAYER_STATS }, // ties e0 on Speed
])

export const enemyParty = makeParty('enemy', [
  { id: 'e0', speed: 35, ...ENEMY_STATS }, // ties p5 on Speed -- player wins, acts first
  { id: 'e1', speed: 30, ...ENEMY_STATS },
  { id: 'e2', speed: 25, ...ENEMY_STATS },
  { id: 'e3', speed: 20, ...ENEMY_STATS },
  { id: 'e4', speed: 15, ...ENEMY_STATS },
  { id: 'e5', speed: 10, ...ENEMY_STATS },
])

/**
 * Hand-derived. Turn order (Speed desc, tie -> player first): p0,p1,p2,p3,p4,p5,
 * e0,e1,e2,e3,e4,e5 -- every player outranks every enemy, including the p5/e0 tie.
 *
 * Every hit: core = max(30-5,0) = 25, chip = 0.01*30 = 0.3, raw = 25.3, final = 25
 * (neutral affinity, x1.0). Every enemy has 10 HP, so every player one-shots its
 * target. Default targeting always picks the first living enemy by slot, so as each
 * enemy dies, the next player's attack falls through to the next slot: p0->e0, p1->e1,
 * p2->e2, p3->e3, p4->e4, p5->e5. After p5's kill (the sixth and last enemy), the fight
 * ends as a win immediately -- none of the six enemies ever get a turn.
 */
const PLAYER_IDS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'].map(createCreatureId)
const ENEMY_IDS = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'].map(createCreatureId)

function attackTurn(attackerIndex: number): CombatEvent[] {
  const attackerId = PLAYER_IDS[attackerIndex]
  const targetId = ENEMY_IDS[attackerIndex]
  if (!attackerId || !targetId) throw new Error('fixture construction error')

  return [
    { type: 'TurnStarted', creatureId: attackerId },
    { type: 'AttackDeclared', attackerId, targetId },
    {
      type: 'DamageDealt',
      sourceId: attackerId,
      targetId,
      rawDamage: 25.3,
      finalDamage: 25,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp: 0,
      damageSource: 'attack',
    },
    { type: 'CreatureDied', creatureId: targetId },
    { type: 'TurnEnded', creatureId: attackerId },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...attackTurn(0),
  ...attackTurn(1),
  ...attackTurn(2),
  ...attackTurn(3),
  ...attackTurn(4),
  ...attackTurn(5),
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
