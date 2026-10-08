// Golden: a spell effect that lands on its own CASTER is DIRECT damage (Phase 4.1-H2a, ASSUMPTIONS
// 132, 137): the channel follows the action, not the target, so it is never a cost and never
// indirect. Confusion's AOE redirect does exactly this to real casters. Hand-derived.
//
// CASTER (LEVEL 1, health 60, Intelligence 40, Defence 8, vitality, speed 10, `cast-slot-0`) casts
// SELF_HIT: a single-target enemy-side spell (the cast itself is aimed at FOE) whose one
// `deal-damage` effect targets `self` (the caster), `offStat 'cast'` x spellPower 0.5: off = 40 x
// 0.5 = 20. FOE (health 100, always-wait, speed 1) is not hurt.
//   direct (what it is): core = max(20 - 8, 0) = 12, chip 0.01 x 20 = 0.2 -> raw 12.2 -> 12;
//     the Additional reads the CASTER's own level and max Health: min(floor(60 x 20 / 100) = 12,
//     max(0, 10 - 0) = 10) = 10. finalDamage 12 + 10 = 22; CASTER 60 -> 38. rawDamage 12.2.
//   (as indirect it would be 20 - 0.2 x 8 = 18.4 -> 18; as a cost, the exact 20.)
// TURN_STEPS = 1.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import type { CombatEvent, Spell } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 8111 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1

const CASTER = createCreatureId('caster')
const FOE = createCreatureId('foe')

export const SELF_HIT: Spell = {
  id: 'h2a-self-hit',
  name: 'Self hit (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    { kind: 'deal-damage', target: { kind: 'self' }, offStat: 'cast', spellPower: 0.5 },
  ],
}

export const CAST_SLOT_0: Script = {
  id: 'h2a-cast-slot-0',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
}
export const WAIT: Script = {
  id: 'h2a-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const scripts = new Map([
  [CAST_SLOT_0.id, CAST_SLOT_0],
  [WAIT.id, WAIT],
])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    level: 1,
    health: 60,
    intelligence: 40,
    defence: 8,
    speed: 10,
    scriptId: CAST_SLOT_0.id,
    equippedSpells: [SELF_HIT],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', health: 100, speed: 1, scriptId: WAIT.id },
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: FOE,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: CASTER,
    rawDamage: 12.2,
    finalDamage: 22,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 38,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CASTER },
]
