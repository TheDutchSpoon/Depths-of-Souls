// Golden: the `splashing` passive EffectDef category (Phase 4 Slice C, Proficient Warrior) --
// an Attack's main hit against the lowest-HP enemy in a 3-enemy lineup also splashes onto both
// living neighbors, each via its OWN recomputed damage formula (own Defence), never a copy of
// the main hit's number. Attacks only (brute.md) -- a Splashing Cast never splashes, see
// combat.ts's executeCastSingle / this slice's dedicated Cast-no-splash unit test.
//
// Hand-derived (independent calculator). ATTACKER: effective Attack 20 x spellPower(Attack)
// 1.0 = effOffStat 20; all four creatures share the default 'vitality' affinity -> neutral
// x1.0; no armor-pen/cross-stat/dealt-mods/taken-factors anywhere in this fixture.
//
//   effOffStat = 20 always. chipFloor = 0.01 * 20 = 0.2 always.
//   MIDDLE (health 15, lowest -> the script's lowest-hp-enemy pick; defence 8):
//     core = max(20-8,0) = 12; raw = 12.2 -> final 12. remainingHp = 15-12 = 3 (survives).
//   LEFT   (health 40, defence 4): core = 16; raw = 16.2 -> final 16. remainingHp = 40-16 = 24.
//   RIGHT  (health 40, defence 2): core = 18; raw = 18.2 -> final 18. remainingHp = 40-18 = 22.
//
// Splash order = adjacentLivingTargets(MIDDLE, enemyParty) = [LEFT, RIGHT] (slot-order
// neighbors of MIDDLE, index 1, within [LEFT, MIDDLE, RIGHT]). Distinct final damage per
// target (12 / 16 / 18) proves each hit is its own recomputed formula against that target's
// own Defence, not a copy of the main hit's number.
//
// One resolveTurn step (ATTACKER, highest Speed, acts first) -- always-wait enemies never
// retaliate, so this golden only needs the attacker's single turn, not a full/naturally-ending
// fight.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 5005 // No RNG consumed (single-target Attack, no provokers, no Confusion).

const ATTACKER = createCreatureId('attacker')
const LEFT = createCreatureId('left')
const MIDDLE = createCreatureId('middle')
const RIGHT = createCreatureId('right')

export const SPLASHING_TRAIT: Trait = {
  id: 'splashing-golden-fixture',
  name: 'Splashing (golden fixture)',
  effects: [{ category: 'splashing' }],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 20,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: [SPLASHING_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'left',
    health: 40,
    defence: 4,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
  {
    id: 'middle',
    health: 15,
    defence: 8,
    speed: 3,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
  {
    id: 'right',
    health: 40,
    defence: 2,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SPLASHING_TRAIT.id, SPLASHING_TRAIT],
])

export const TURN_STEPS = 1 // ATTACKER's single turn

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: MIDDLE },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: MIDDLE,
    rawDamage: 12.2,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 3,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: LEFT,
    rawDamage: 16.2,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 24,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: RIGHT,
    rawDamage: 18.2,
    finalDamage: 18,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 22,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
]
