// Golden: the Web break-free roll runs in turn-end cleanup and skips a Web applied THIS turn
// (Phase 4.1-F2, ASSUMPTIONS 15 and 18). Real Web (10% per bearer per creature's turn). Hand-derived.
//
// A (player, speed 30) casts a fixture status-only spell on round 1: apply-status(cast-target,
// web) on E. B (player, speed 20) and E (enemy, speed 10) wait. SEED 7's mulberry32 sequence
// (independent `node -e` trace of rng.ts): 0.0117, 0.0620, ... -- both under 0.10, so ANY roll
// of E's Web breaks it. The spell draws nothing (single lowest-HP enemy).
//   A's turn: SpellCast, StatusApplied(web, E, duration 3). A's cleanup: the Web is born this
//     turn (applied since the action slot) -> NOT rolled: no draw, no StatusExpired.
//   B's turn: Waited; B's cleanup rolls E's Web (draw #1 = 0.0117 < 0.10) -> StatusExpired inside
//     B's bracket, before TurnEnded. (Rolled at A's cleanup, draw #1 would have broken it there.)
//   E's turn: Waited (the frozen queue still has E in its slot).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 7
export const TURN_STEPS = 3

const A = createCreatureId('a')
const B = createCreatureId('b')
const E = createCreatureId('e')

export const WEB_CAST: Spell = {
  id: 'f2-web-cast-fixture',
  name: 'Web Cast (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'web' },
    },
  ],
}

const castOnceThenWait: Script = {
  id: 'f2-cast-once-then-wait',
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
  { id: 'a', speed: 30, scriptId: castOnceThenWait.id, equippedSpells: [WEB_CAST] },
  { id: 'b', speed: 20, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e', speed: 10, scriptId: 'always-wait' },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [castOnceThenWait.id, castOnceThenWait],
])
export const statuses = STATUS_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'SpellCast', targetShape: 'single', casterId: A, gemSlot: 0, targetId: E },
  {
    type: 'StatusApplied',
    targetId: E,
    statusId: 'web',
    stacks: 1,
    duration: 3,
    sourceId: A,
  },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Waited', creatureId: B },
  { type: 'StatusExpired', creatureId: E, statusId: 'web' },
  { type: 'TurnEnded', creatureId: B },
  { type: 'TurnStarted', creatureId: E },
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
]

export const expectedResult: FightResult | null = null
