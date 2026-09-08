// Golden: the `cheat-death` passive EffectDef (Phase 4 Slice D, Last Stand-shaped) -- intercepted
// inside applyDamageAndEmit at the instant a hit would reduce a living target to 0 HP, BEFORE
// CreatureDied/on-death fire. Two rigged seeds against the IDENTICAL parties/scripts, proving
// both branches of the one seeded RNG roll:
//
//   ATTACKER (off 20, def 0) -> DEFENDER (health 20, def 0): core 20, chip 0.01*20=0.2 ->
//   raw 20.2 -> final 20 -- EXACTLY lethal. DEFENDER carries a 50% cheat-death passive.
//
// SEED 7's first RNG draw is 0.0117... (< 0.5 -> the roll SUCCEEDS): DEFENDER survives at
// exactly 1 HP (ASSUMPTION 19), no CreatureDied/on-death. DEFENDER then takes its own turn
// (still alive) and attacks back: off 15 (DEFENDER's own Attack), def 0 -> core 15, chip
// 0.01*15=0.15 -> raw 15.15 -> final 15 -- EXACTLY ATTACKER's health (15), which has no
// cheat-death of its own, so it dies normally. DEFENDER's side wins.
//
// SEED 1's first RNG draw is 0.6271... (>= 0.5 -> the roll FAILS): DEFENDER dies normally on
// the very first hit, one hit one round, ATTACKER's side wins -- the "normal death path
// unaffected when cheat-death doesn't proc" case.
//
// (Both first-draw values hand-verified via an independent `node -e` mulberry32 trace against
// rng.ts's exact algorithm -- no other mechanism in this fixture consumes RNG: always-attack's
// targeting is RNG-free, and neither side provokes/confuses, so the cheat-death check is
// provably the very first draw of the fight.)

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED_SUCCESS = 7
export const SEED_FAIL = 1

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const LAST_STAND_FIXTURE: Trait = {
  id: 'last-stand-fixture',
  name: 'Last Stand (fixture)',
  effects: [{ category: 'cheat-death', chancePercent: 50 }],
}

export const playerParty = makeParty('player', [
  {
    id: 'defender',
    health: 20,
    attack: 15,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['last-stand-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'attacker',
    health: 15,
    attack: 20,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [LAST_STAND_FIXTURE.id, LAST_STAND_FIXTURE],
])

export const expectedEventsSuccess: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 20.2,
    finalDamage: 20, // unchanged (ASSUMPTION 19) -- only remainingHp reflects the save
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 1,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'TurnStarted', creatureId: DEFENDER },
  { type: 'AttackDeclared', attackerId: DEFENDER, targetId: ATTACKER },
  {
    type: 'DamageDealt',
    sourceId: DEFENDER,
    targetId: ATTACKER,
    rawDamage: 15.15,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: ATTACKER },
  { type: 'TurnEnded', creatureId: DEFENDER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResultSuccess: FightResult = 'win'

export const expectedEventsFail: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: DEFENDER },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'loss' },
]

export const expectedResultFail: FightResult = 'loss'
