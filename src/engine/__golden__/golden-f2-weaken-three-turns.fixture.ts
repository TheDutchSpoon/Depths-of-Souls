// Golden: a 3-turn Weaken covers its bearer's next three turns whether it was applied before or
// after the bearer acted that round (Phase 4.1-F2, CONVENTIONS "Status lifecycle"). Under round-end
// counting a Weaken applied after the bearer acted covered only two of its three turns. The
// modifier math is unchanged (Weaken -20% dealt, additive into the dealt pool); only WHICH turns it
// covers moves. Hand-derived.
//
// TANK (player, speed 30, health 200, defence 5) waits; its fixture trait applies Weaken (default
// duration 3) to all enemies at its round-1 turn start. FAST (speed 40) acts BEFORE TANK, SLOW
// (speed 10) AFTER; both always-attack TANK (attack 20, TANK defence 5).
//   Unweakened hit: core 20-5 = 15, chip 0.01*20 = 0.2 -> raw 15.2 -> final 15.
//   Weakened hit:   raw = 15.2 * (1 - 0.2) = 12.16 -> final 12.
// Weaken is applied in TANK's turn, so for FAST and SLOW it is never born in their own turn and
// counts down in each one's own cleanup.
//   FAST (acts before TANK in round 1): R1 unweakened (Weaken not applied yet). Weakened in its
//     next three turns R2, R3, R4; expires in R4's cleanup; R5 unweakened.
//   SLOW (acts after TANK in round 1): weakened in R1, R2, R3; expires in R3's cleanup; R4, R5
//     unweakened.
// TANK HP: 200 -> R1: FAST 15 -> 185, SLOW 12 -> 173 | R2: 12 -> 161, 12 -> 149 | R3: 12 -> 137,
//   12 -> 125 (SLOW's Weaken expires) | R4: 12 -> 113 (FAST's expires), 15 -> 98 | R5: 15 -> 83,
//   15 -> 68.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4203 // No RNG consumed; seed is inert.
export const TURN_STEPS = 15 // five rounds of three turns

const TANK = createCreatureId('tank')
const FAST = createCreatureId('fast')
const SLOW = createCreatureId('slow')

export const WEAKENER_TRAIT: Trait = {
  id: 'f2-weakener-fixture',
  name: 'Weakener (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'weaken' },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'tank',
    health: 200,
    defence: 5,
    speed: 30,
    scriptId: 'always-wait',
    innateTraitIds: [WEAKENER_TRAIT.id],
  },
])
export const enemyParty = makeParty('enemy', [
  { id: 'fast', attack: 20, speed: 40, scriptId: 'always-attack' },
  { id: 'slow', attack: 20, speed: 10, scriptId: 'always-attack' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [WEAKENER_TRAIT.id, WEAKENER_TRAIT],
])
export const statuses = STATUS_REGISTRY

const hit = (who: typeof FAST, weakened: boolean, remainingHp: number): CombatEvent[] => [
  { type: 'AttackDeclared', attackerId: who, targetId: TANK },
  {
    type: 'DamageDealt',
    sourceId: who,
    targetId: TANK,
    rawDamage: weakened ? 15.2 * 0.8 : 15.2,
    finalDamage: weakened ? 12 : 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
    statusId: undefined,
  },
]
const turn = (who: typeof FAST, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const expired = (who: typeof FAST): CombatEvent => ({
  type: 'StatusExpired',
  creatureId: who,
  statusId: 'weaken',
})
const weakenApplied = (who: typeof FAST): CombatEvent => ({
  type: 'StatusApplied',
  targetId: who,
  statusId: 'weaken',
  stacks: 1,
  duration: 3,
  sourceId: TANK,
})
const tankWaits = (round: number): CombatEvent[] =>
  turn(
    TANK,
    ...(round === 1
      ? [
          {
            type: 'TriggerFired',
            sourceId: TANK,
            hook: 'on-turn-start',
            effectId: WEAKENER_TRAIT.id,
          } as CombatEvent,
          weakenApplied(FAST),
          weakenApplied(SLOW),
        ]
      : []),
    { type: 'Waited', creatureId: TANK },
  )

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(FAST, ...hit(FAST, false, 185)),
  ...tankWaits(1),
  ...turn(SLOW, ...hit(SLOW, true, 173)),
  { type: 'RoundStarted', round: 2 },
  ...turn(FAST, ...hit(FAST, true, 161)),
  ...tankWaits(2),
  ...turn(SLOW, ...hit(SLOW, true, 149)),
  { type: 'RoundStarted', round: 3 },
  ...turn(FAST, ...hit(FAST, true, 137)),
  ...tankWaits(3),
  ...turn(SLOW, ...hit(SLOW, true, 125), expired(SLOW)),
  { type: 'RoundStarted', round: 4 },
  ...turn(FAST, ...hit(FAST, true, 113), expired(FAST)),
  ...tankWaits(4),
  ...turn(SLOW, ...hit(SLOW, false, 98)),
  { type: 'RoundStarted', round: 5 },
  ...turn(FAST, ...hit(FAST, false, 83)),
  ...tankWaits(5),
  ...turn(SLOW, ...hit(SLOW, false, 68)),
]

export const expectedResult: FightResult | null = null
