// Golden: INDIRECT damage (Phase 4.1-H2a, ASSUMPTION 112): a trait response is not an Attack or
// Cast, so it uses the response's own magnitude and meets only a fifth of the target's Defence:
//   raw = magnitude x affinity x (1 + sum dealt) x prod(taken) - 0.2 x Defence;  MAX(1, floor(raw))
// with no chip floor and no Additional. Hand-derived. All vitality (neutral x1.0), no dealt mods.
//
// Setup. Players: D (health 100, Defence 20, speed 10, `always-defend`) and U (health 50, Defence
// 20, speed 5, `always-wait`). Enemies (always-wait, each carries an on-turn-start trait hitting
// for `offStat 'attack'` x spellPower 1, tagged 'attack' -- the tag is a display label, not the
// channel): R1 (Attack 30, speed 2) aims at the highest-HP enemy (D); R2 (Attack 30, speed 1,
// Defence 40, plus a Shield Bash-shaped cross-stat passive, +0.5 x its Defence = +20 to a DIRECT
// Attack's offence) aims at the lowest-HP enemy (U).
//
//   D's turn: Defend -> D is defending until its next turn: effective Defence 20 x 1.5 = 30,
//     and a x0.65 factor in its taken pool.
//   R1 -> D (turn start): magnitude 30 x 1 x 1 x 0.65 = 19.5; - 0.2 x 30 = 6 -> raw 13.5 -> final 13.
//     (As direct damage it would be core max(30-30,0) = 0 -> chip-only, 1.) D 100 -> 87.
//   U waits.   R2 -> U (turn start): magnitude 30 (cross-stat is DIRECT-only, ASSUMPTION 134: the
//     +20 is NOT added); x1 x1 x1; - 0.2 x 20 = 4 -> raw 26 -> final 26. U 50 -> 24.
//     (With cross-stat included it would be 50 - 4 = 46; as direct damage 10-ish.)
// Neither hit is chip-only; neither carries the Additional. TURN_STEPS = 4 (D, U, R1, R2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8107 // No RNG consumed; seed is inert.
export const TURN_STEPS = 4

const D = createCreatureId('d')
const U = createCreatureId('u')
const R1 = createCreatureId('r1')
const R2 = createCreatureId('r2')

function hitTrait(
  id: string,
  selectorKind: 'highest-hp-enemy' | 'lowest-hp-enemy',
): Trait {
  return {
    id,
    name: `${id} (fixture)`,
    effects: [
      {
        category: 'triggered',
        hook: 'on-turn-start',
        response: {
          kind: 'deal-damage',
          target: { kind: 'selector', selector: { kind: selectorKind } },
          offStat: 'attack',
          spellPower: 1.0,
        },
      },
    ],
  }
}

export const HIT_HIGHEST: Trait = hitTrait('h2a-hit-highest', 'highest-hp-enemy')
export const HIT_LOWEST: Trait = hitTrait('h2a-hit-lowest', 'lowest-hp-enemy')
export const SHIELD_BASH: Trait = {
  id: 'h2a-shield-bash',
  name: 'Shield Bash (fixture)',
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
  { id: 'd', health: 100, defence: 20, speed: 10, scriptId: 'always-defend' },
  { id: 'u', health: 50, defence: 20, speed: 5, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'r1',
    attack: 30,
    speed: 2,
    scriptId: 'always-wait',
    innateTraitIds: [HIT_HIGHEST.id],
  },
  {
    id: 'r2',
    attack: 30,
    defence: 40,
    speed: 1,
    scriptId: 'always-wait',
    innateTraitIds: [SHIELD_BASH.id, HIT_LOWEST.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [HIT_HIGHEST.id, HIT_HIGHEST],
  [HIT_LOWEST.id, HIT_LOWEST],
  [SHIELD_BASH.id, SHIELD_BASH],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: D },
  { type: 'Defended', creatureId: D },
  { type: 'TurnEnded', creatureId: D },
  { type: 'TurnStarted', creatureId: U },
  { type: 'Waited', creatureId: U },
  { type: 'TurnEnded', creatureId: U },
  { type: 'TurnStarted', creatureId: R1 },
  { type: 'TriggerFired', sourceId: R1, hook: 'on-turn-start', effectId: HIT_HIGHEST.id },
  {
    type: 'DamageDealt',
    sourceId: R1,
    targetId: D,
    rawDamage: 13.5,
    finalDamage: 13,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 87,
    damageSource: 'attack',
  },
  { type: 'Waited', creatureId: R1 },
  { type: 'TurnEnded', creatureId: R1 },
  { type: 'TurnStarted', creatureId: R2 },
  { type: 'TriggerFired', sourceId: R2, hook: 'on-turn-start', effectId: HIT_LOWEST.id },
  {
    type: 'DamageDealt',
    sourceId: R2,
    targetId: U,
    rawDamage: 26,
    finalDamage: 26,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 24,
    damageSource: 'attack',
  },
  { type: 'Waited', creatureId: R2 },
  { type: 'TurnEnded', creatureId: R2 },
]
