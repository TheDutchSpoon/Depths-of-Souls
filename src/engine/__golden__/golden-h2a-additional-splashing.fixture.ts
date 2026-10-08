// Golden: the Additional on EVERY Splashing hit (Phase 4.1-H2a, ASSUMPTION 135). Hand-derived.
// ATTACKER (level 1, Attack 20, Splashing, speed 10) attacks the lowest-HP enemy, MIDDLE; both
// living neighbours are splashed, each through its OWN recomputed formula (own Defence). All
// vitality, neutral x1.0; effOffStat 20, chip 0.2 every time.
//   MIDDLE (health 90, defence 8): core 12, raw 12.2 -> 12; additional min(floor(18) = 18, 10) = 10
//     -> 22. 90 -> 68.
//   LEFT   (health 100, defence 4): core 16, raw 16.2 -> 16; additional min(20, 10) = 10 -> 26.
//     100 -> 74.
//   RIGHT  (health 100, defence 2): core 18, raw 18.2 -> 18; additional min(20, 10) = 10 -> 28.
//     100 -> 72.
// Splash order = [LEFT, RIGHT] (slot-order neighbours of MIDDLE). TURN_STEPS = 1.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8104 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const ATTACKER = createCreatureId('attacker')
const LEFT = createCreatureId('left')
const MIDDLE = createCreatureId('middle')
const RIGHT = createCreatureId('right')

export const SPLASHING_TRAIT: Trait = {
  id: 'h2a-splashing',
  name: 'Splashing (fixture)',
  effects: [{ category: 'splashing' }],
}

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    level: 1,
    attack: 20,
    speed: 10,
    scriptId: 'always-attack',
    innateTraitIds: [SPLASHING_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'left', health: 100, defence: 4, speed: 1, scriptId: 'always-wait' },
  { id: 'middle', health: 90, defence: 8, speed: 3, scriptId: 'always-wait' },
  { id: 'right', health: 100, defence: 2, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SPLASHING_TRAIT.id, SPLASHING_TRAIT],
])

function hit(
  target: typeof LEFT,
  rawDamage: number,
  finalDamage: number,
  remainingHp: number,
): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: target,
    rawDamage,
    finalDamage,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: MIDDLE },
  hit(MIDDLE, 12.2, 22, 68),
  hit(LEFT, 16.2, 26, 74),
  hit(RIGHT, 18.2, 28, 72),
  { type: 'TurnEnded', creatureId: ATTACKER },
]
