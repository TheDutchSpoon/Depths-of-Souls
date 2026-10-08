// Golden: the Additional (Phase 4.1-H2a, brief ASSUMPTIONS 110, 135) on DIRECT hits, at three
// attacker levels. Hand-derived. The Additional is added after the formula's MAX(1, floor(...)):
//   additional = min( floor(20% x target max HP), max(0, 10 - (attacker level - 1)) )
// and nothing modifies it. rawDamage stays the formula's pre-clamp value (ASSUMPTION 136).
//
// Setup. Three player attackers, each Attack 20, all vitality (neutral x1.0), scripted
// `attack-highest-hp` so each hits a DIFFERENT dummy (the highest-HP enemy at that moment). Three
// always-wait dummies, all Defence 5 (health 100, 99, 98 -- 20% of each is 20, 19, 19, so the
// level cap, not the 20%, is what binds in this golden; the 20% bound has its own golden). Every
// base hit is the same: off 20, def 5 -> core 15, chip 0.01 x 20 = 0.2 -> raw 15.2 -> 15.
//
//   Turn 1, L1 (speed 30) -> T100 (highest, 100): cap = max(0, 10 - 0) = 10; 20% = 20; additional
//     min(20, 10) = 10. final 15 + 10 = 25. T100 100 -> 75.
//   Turn 2, L8 (speed 20) -> T99 (highest of 75, 99, 98): cap = max(0, 10 - 7) = 3; 20% = floor(19.8)
//     = 19; additional min(19, 3) = 3. final 15 + 3 = 18. T99 99 -> 81.   (the cap FADES by 1 a level)
//   Turn 3, L11 (speed 10) -> T98 (highest of 75, 81, 98): cap = max(0, 10 - 10) = 0; additional 0.
//     final 15. T98 98 -> 83.                                             (gone from level 11)
// TURN_STEPS = 3: the three attackers' turns (the dummies, speeds 1-3, would act after).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 8101 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3

const L1 = createCreatureId('l1')
const L8 = createCreatureId('l8')
const L11 = createCreatureId('l11')
const T100 = createCreatureId('t100')
const T99 = createCreatureId('t99')
const T98 = createCreatureId('t98')

export const ATTACK_HIGHEST_HP: Script = {
  id: 'attack-highest-hp',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'highest-hp-enemy' },
    },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'l1', level: 1, attack: 20, speed: 30, scriptId: 'attack-highest-hp' },
  { id: 'l8', level: 8, attack: 20, speed: 20, scriptId: 'attack-highest-hp' },
  { id: 'l11', level: 11, attack: 20, speed: 10, scriptId: 'attack-highest-hp' },
])

export const enemyParty = makeParty('enemy', [
  { id: 't100', health: 100, defence: 5, speed: 3, scriptId: 'always-wait' },
  { id: 't99', health: 99, defence: 5, speed: 2, scriptId: 'always-wait' },
  { id: 't98', health: 98, defence: 5, speed: 1, scriptId: 'always-wait' },
])

export const scripts = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [ATTACK_HIGHEST_HP.id, ATTACK_HIGHEST_HP],
])

function turn(
  attacker: typeof L1,
  target: typeof T100,
  finalDamage: number,
  remainingHp: number,
): CombatEvent[] {
  return [
    { type: 'TurnStarted', creatureId: attacker },
    { type: 'AttackDeclared', attackerId: attacker, targetId: target },
    {
      type: 'DamageDealt',
      sourceId: attacker,
      targetId: target,
      rawDamage: 15.2,
      finalDamage,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp,
      damageSource: 'attack',
    },
    { type: 'TurnEnded', creatureId: attacker },
  ]
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(L1, T100, 25, 75),
  ...turn(L8, T99, 18, 81),
  ...turn(L11, T98, 15, 83),
]
