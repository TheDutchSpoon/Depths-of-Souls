// Golden: what INDIRECT damage keeps (Phase 4.1-H2a, ASSUMPTIONS 112, 134, 135). Hand-derived.
// A trait response is indirect:
//   raw = magnitude x affinity x (1 + sum dealt) x prod(taken) - 0.2 x effective Defence;
//   final = MAX(1, floor(raw)). It keeps affinity, the dealt pool (including
//   `conditional-damage-bonus`), the taken pool, Defend and armor penetration; it has NO Additional
//   (a direct-only bonus) and NO chip floor, and cross-stat is direct-only.
// `golden-h2a-indirect` pins the Defence term, Defend and cross-stat; this golden isolates ONE kept
// term per hit, so each wrong wiring changes exactly one hit.
//
// Setup. Six enemy bearers B1..B6 (speeds 60 down to 10, always-wait, ALL LEVEL 1 so a wrongly
// added Additional shows: its cap is 10 and every target's 20% bound is >= 35), each with an
// on-turn-start trait hitting the HIGHEST-HP enemy for `offStat 'attack'` x spellPower 1 (the
// 'attack' tag is a display label). Every bearer has Attack 60, so the magnitude is 60. Six player
// targets T1..T6 (always-wait, speed 1) with health 200, 195, 190, 185, 180, 175 -- each hit leaves
// its target below the next target's health, so bearer k hits target k. Every target has Defence
// above 0 (20, except T6 = 40) and no Defend.
//
//   Hit 1, B1 -> T1 (nothing special): 60 x 1 x 1 x 1 - 0.2 x 20 = 56.   T1 200 -> 144.
//       wrong: + the Additional (min(floor(200 x 20 / 100) = 40, 10) = 10) -> 66.     [M1]
//   Hit 2, B2 (Violence) -> T2 (Vitality): Vitality beats Violence, so B2 is at a disadvantage,
//       x0.75: 60 x 0.75 - 4 = 41.   T2 195 -> 154.     wrong: neutral affinity -> 56.   [M2]
//   Hit 3, B3 has a +50% `damage-modifier` (dealt): 60 x (1 + 0.5) - 4 = 86.   T3 190 -> 104.
//       wrong: the dealt pool dropped -> 56.                                              [M3]
//   Hit 4, B4 has a `conditional-damage-bonus` +25% (condition always, actionKind 'attack': a
//       formula response is Attack-flavoured): 60 x (1 + 0.25) - 4 = 71.   T4 185 -> 114.
//       wrong: the conditional bonus dropped (the plain dealt pool kept) -> 56.           [M4]
//   Hit 5, T5 has a `taken-reduction` x0.5 (not Defend's factor): 60 x 0.5 - 4 = 26.
//       T5 180 -> 154.     wrong: only Defend's factor kept -> 56.                        [M5]
//   Hit 6, B6 has `armor-penetration` 0.75 against T6 (Defence 40): effective Defence 40 x 0.25 =
//       10, term 2: 60 - 2 = 58.   T6 175 -> 117.     wrong: penetration 0 -> 60 - 8 = 52. [M6]
// All values are integers in floating point (every product above is exact), so there is no floor
// boundary. TURN_STEPS = 6 (B1..B6; the targets would act after).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8110 // No RNG consumed; seed is inert.
export const TURN_STEPS = 6

const ids = ['1', '2', '3', '4', '5', '6'] as const
const B = ids.map((n) => createCreatureId(`b${n}`))
const T = ids.map((n) => createCreatureId(`t${n}`))

export const HIT: Trait = {
  id: 'h2a-keeps-hit',
  name: 'Hit the highest-HP enemy (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'highest-hp-enemy' } },
        offStat: 'attack',
        spellPower: 1.0,
      },
    },
  ],
}
export const DEALT_PLUS_50: Trait = {
  id: 'h2a-keeps-dealt',
  name: '+50% dealt (fixture)',
  effects: [{ category: 'damage-modifier', direction: 'dealt', magnitude: 0.5 }],
}
export const CONDITIONAL_PLUS_25: Trait = {
  id: 'h2a-keeps-conditional',
  name: '+25% conditional (fixture)',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.25,
      condition: { kind: 'always' },
      actionKind: 'attack',
    },
  ],
}
export const TAKEN_HALF: Trait = {
  id: 'h2a-keeps-taken',
  name: 'x0.5 taken (fixture)',
  effects: [{ category: 'taken-reduction', magnitude: 0.5 }],
}
export const PENETRATION_75: Trait = {
  id: 'h2a-keeps-penetration',
  name: '75% armor penetration (fixture)',
  effects: [{ category: 'armor-penetration', percent: 0.75 }],
}

function bearer(n: number, speed: number, extra: Trait | null, affinity = 'vitality') {
  return {
    id: `b${n}`,
    level: 1,
    attack: 60,
    speed,
    affinity: affinity as 'vitality' | 'violence',
    scriptId: 'always-wait',
    innateTraitIds: extra ? [HIT.id, extra.id] : [HIT.id],
  }
}

export const enemyParty = makeParty('enemy', [
  bearer(1, 60, null),
  bearer(2, 50, null, 'violence'),
  bearer(3, 40, DEALT_PLUS_50),
  bearer(4, 30, CONDITIONAL_PLUS_25),
  bearer(5, 20, null),
  bearer(6, 10, PENETRATION_75),
])

export const playerParty = makeParty('player', [
  { id: 't1', health: 200, defence: 20, speed: 1, scriptId: 'always-wait' },
  { id: 't2', health: 195, defence: 20, speed: 1, scriptId: 'always-wait' },
  { id: 't3', health: 190, defence: 20, speed: 1, scriptId: 'always-wait' },
  { id: 't4', health: 185, defence: 20, speed: 1, scriptId: 'always-wait' },
  {
    id: 't5',
    health: 180,
    defence: 20,
    speed: 1,
    scriptId: 'always-wait',
    innateTraitIds: [TAKEN_HALF.id],
  },
  { id: 't6', health: 175, defence: 40, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [HIT, DEALT_PLUS_50, CONDITIONAL_PLUS_25, TAKEN_HALF, PENETRATION_75].map(
    (t) => [t.id, t] as const,
  ),
)

function turn(
  k: number,
  raw: number,
  affinityMultiplier: number,
  remainingHp: number,
): CombatEvent[] {
  const b = B[k]!
  return [
    { type: 'TurnStarted', creatureId: b },
    { type: 'TriggerFired', sourceId: b, hook: 'on-turn-start', effectId: HIT.id },
    {
      type: 'DamageDealt',
      sourceId: b,
      targetId: T[k]!,
      rawDamage: raw,
      finalDamage: raw,
      affinityMultiplier,
      wasChipOnly: false,
      remainingHp,
      damageSource: 'attack',
    },
    { type: 'Waited', creatureId: b },
    { type: 'TurnEnded', creatureId: b },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(0, 56, 1, 144),
  ...turn(1, 41, 0.75, 154),
  ...turn(2, 86, 1, 104),
  ...turn(3, 71, 1, 114),
  ...turn(4, 26, 1, 154),
  ...turn(5, 58, 1, 117),
]
