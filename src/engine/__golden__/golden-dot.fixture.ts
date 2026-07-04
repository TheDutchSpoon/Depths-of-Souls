// Golden: the DoT lifecycle end-to-end -- a spell-applied status (VENOM_BOLT -> Poison),
// StatusApplied, three on-round-end ticks (flat, bypassing Defence/affinity/pools, no
// TriggerFired), StatusExpired on the tick that also happens to kill the target, and win/loss
// checked once after that round-end sweep (GAME_DESIGN's round-end status lifecycle).
//
// Hand-derived (independent `node -e` calculator). CASTER casts venom-bolt on round 1 only (a
// custom script), then waits forever so poison is never refreshed. TARGET always-waits.
//
//   Cast: offStat = 40 (int) * 0.4 (spellPower) = 16. core = max(16-5,0) = 11. chip = 0.01*16 =
//   0.16. raw = 11.16 -> final 11. TARGET 20 -> 9.
//   Poison (duration 3, 1 stack): flatAmount 3/stack -> each tick = 3 (integer, no float).
//     R1 end: 9 -> 6, duration 3 -> 2.
//     R2 end: 6 -> 3, duration 2 -> 1.
//     R3 end: 3 -> 0 (dies), duration 1 -> 0 -> StatusExpired. Enemy wiped -> win, checked
//     right after the sweep (no round-4 ever starts).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { VENOM_BOLT } from '../../data/spells'
import { STATUS_REGISTRY } from '../../data/statuses'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 8008 // No RNG consumed (deterministic targeting); seed is inert.

const CASTER = createCreatureId('caster')
const TARGET = createCreatureId('target')

const castOnceThenWait: Script = {
  id: 'cast-once-then-wait',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    intelligence: 40,
    speed: 20,
    scriptId: 'cast-once-then-wait',
    equippedSpells: [VENOM_BOLT],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'target', health: 20, defence: 5, speed: 10, scriptId: 'always-wait' },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [castOnceThenWait.id, castOnceThenWait],
])
export const statuses = STATUS_REGISTRY

function dotTick(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: TARGET,
    targetId: TARGET,
    rawDamage: 3,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'dot',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: TARGET,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: TARGET,
    rawDamage: 11.16,
    finalDamage: 11,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 9,
    damageSource: 'cast',
  },
  {
    type: 'StatusApplied',
    targetId: TARGET,
    statusId: 'poison',
    stacks: 1,
    duration: 3,
    sourceId: CASTER,
  },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  dotTick(6),
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  dotTick(3),
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  dotTick(0),
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'StatusExpired', creatureId: TARGET, statusId: 'poison' },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
