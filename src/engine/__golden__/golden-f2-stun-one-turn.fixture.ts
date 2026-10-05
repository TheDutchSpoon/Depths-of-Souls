// Golden: Stun 1 skips exactly ONE turn of its bearer, whichever side of the applier the bearer
// acts on (Phase 4.1-F2; CONVENTIONS "Status lifecycle": durations count the bearer's own turns).
// Hand-derived.
//
// STRIKER (player, speed 30) carries a fixture trait: on-turn-start, round 1 only, apply Stun for
// 1 turn to all enemies. FAST (enemy, speed 40) acts BEFORE STRIKER; SLOW (enemy, speed 10) acts
// AFTER it. Everybody else just waits, so a skipped turn is the only difference between turns.
// The Stun is applied in STRIKER's turn, so for FAST and SLOW it is never born in their own turn.
//
//   Round 1 (queue FAST 40, STRIKER 30, SLOW 10): FAST waits (no Stun yet). STRIKER's turn-start
//     trigger Stuns both (slot order: FAST then SLOW). SLOW's R1 turn is skipped (TurnSkipped),
//     then its cleanup counts the Stun down 1 -> 0 and it expires, inside SLOW's bracket.
//   Round 2: FAST's turn is skipped (TurnSkipped) and the Stun expires in its cleanup -- one
//     skipped turn, not zero (the old round-end countdown expired it before FAST ever acted again)
//     and not two. SLOW acts normally.
//   Round 3: everybody waits.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4201 // No RNG consumed; seed is inert.
export const TURN_STEPS = 9 // three rounds of three turns

const STRIKER = createCreatureId('striker')
const FAST = createCreatureId('fast')
const SLOW = createCreatureId('slow')

export const STUNNER_TRAIT: Trait = {
  id: 'f2-stunner-fixture',
  name: 'Stunner (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'stun', duration: 1 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'striker',
    speed: 30,
    scriptId: 'always-wait',
    innateTraitIds: [STUNNER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'fast', speed: 40, scriptId: 'always-wait' },
  { id: 'slow', speed: 10, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [STUNNER_TRAIT.id, STUNNER_TRAIT],
])
export const statuses = STATUS_REGISTRY

const turn = (who: typeof FAST, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: typeof FAST): CombatEvent => ({ type: 'Waited', creatureId: who })
const skipped = (who: typeof FAST): CombatEvent[] => [
  { type: 'TurnSkipped', creatureId: who, effectId: 'stun' },
  { type: 'StatusExpired', creatureId: who, statusId: 'stun' },
]
const stunApplied = (who: typeof FAST): CombatEvent => ({
  type: 'StatusApplied',
  targetId: who,
  statusId: 'stun',
  stacks: 1,
  duration: 1,
  sourceId: STRIKER,
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(FAST, waited(FAST)),
  ...turn(
    STRIKER,
    {
      type: 'TriggerFired',
      sourceId: STRIKER,
      hook: 'on-turn-start',
      effectId: STUNNER_TRAIT.id,
    },
    stunApplied(FAST),
    stunApplied(SLOW),
    waited(STRIKER),
  ),
  ...turn(SLOW, ...skipped(SLOW)),
  { type: 'RoundStarted', round: 2 },
  ...turn(FAST, ...skipped(FAST)),
  ...turn(STRIKER, waited(STRIKER)),
  ...turn(SLOW, waited(SLOW)),
  { type: 'RoundStarted', round: 3 },
  ...turn(FAST, waited(FAST)),
  ...turn(STRIKER, waited(STRIKER)),
  ...turn(SLOW, waited(SLOW)),
]

export const expectedResult: FightResult | null = null
