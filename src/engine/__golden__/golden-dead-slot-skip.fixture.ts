// Golden: a creature that is dead when its slot comes up gets nothing -- no TurnStarted/TurnEnded
// bracket, no turn-clock bump, no Web roll -- on a board where a Web is present, so a roll in the
// dead slot would show as an extra RNG draw. Hand-derived.
//
// HERO (player, speed 30, Attack 20, Defence 0, HP 50, always-attack = lowest-HP enemy).
// D (enemy, speed 20, HP 1, Defence 0, always-wait). E (enemy, speed 10, HP 100, Defence 0,
// always-wait): its trait applies a Web to itself on fight start (duration 99, 0% break-free
// chance, so the Web never breaks and a roll shows only as a draw, not as an event). The Web is
// applied before any turn, so it is never born in a turn: every cleanup rolls it.
// All vitality: affinity multiplier x1.0 everywhere.
//
// Queue (speed desc, frozen at round 1): [HERO, D, E].
//
// Call 1, HERO's turn: attacks D (lowest HP: 1 < 100). core 20 - 0 = 20, chip 0.01 * 20 = 0.2 ->
//   raw 20.2 -> final 20; D 1 - 20 -> 0, dies. E survives, so the fight goes on. HERO has no
//   statuses to count down. Web roll #1 (E's Web, 0%): no break, no event.
// Call 2, D's slot: dead, skipped with nothing emitted; the same call dequeues E and resolves E's
//   turn: it waits. E's Web counts down 99 -> 98 (no event). Web roll #2: no break, no event.
//
// Every RNG draw in the two calls: the two Web rolls and nothing else (the target pick is the
// lowest-HP selector, the attack has no random term, the fight-start trait has no chance), so the
// expected position is 2 draws past the seed. A Web roll in D's slot would make it 3.
// The frozen queue still lists D, and the cursor has moved past all three entries.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { StatusDef, Trait } from '../effect-types'

export const SEED = 4101 // Inert: the 0% Web never breaks, whatever the draws are.
export const TURN_STEPS = 2 // HERO's turn, then E's (the second call steps past D's dead slot)

const HERO = createCreatureId('hero')
const D = createCreatureId('d')
const E = createCreatureId('e')

const WEB_STATUS_ID = 'dead-slot-web-fixture'

export const WEB_FIXTURE: StatusDef = {
  statusId: WEB_STATUS_ID,
  polarity: 'debuff',
  defaultDuration: 3,
  effects: [{ category: 'turn-order', position: 'last', breakChancePercent: 0 }],
}

export const WEB_SELF_FIXTURE: Trait = {
  id: 'dead-slot-web-self-fixture',
  name: 'Web Self (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: WEB_STATUS_ID, duration: 99 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    speed: 30,
    attack: 20,
    defence: 0,
    health: 50,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'd',
    speed: 20,
    defence: 0,
    health: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
  {
    id: 'e',
    speed: 10,
    defence: 0,
    health: 100,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [WEB_SELF_FIXTURE.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [WEB_SELF_FIXTURE.id, WEB_SELF_FIXTURE],
])
export const statuses: ReadonlyMap<string, StatusDef> = new Map([
  [WEB_FIXTURE.statusId, WEB_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: E,
    hook: 'on-fight-start',
    effectId: WEB_SELF_FIXTURE.id,
  },
  {
    type: 'StatusApplied',
    targetId: E,
    statusId: WEB_STATUS_ID,
    duration: 99,
    sourceId: E,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: D },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: D,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: D },
  { type: 'TurnEnded', creatureId: HERO },
  // D's slot: nothing. E's turn follows in the same call.
  { type: 'TurnStarted', creatureId: E },
  { type: 'Waited', creatureId: E },
  { type: 'TurnEnded', creatureId: E },
]

/** The Web rolls in the window: HERO's cleanup and E's cleanup. */
export const expectedDraws = 2

/** HERO's turn and E's turn each bump the clock once at the action slot; D's dead slot doesn't
 * (a bump there would make it 3). */
export const expectedTurnClock = 2

/** The frozen queue keeps the dead entry; the cursor has passed all three. */
export const expectedQueue = [HERO, D, E]
export const expectedCursor = 3
