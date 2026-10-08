// Golden: the Additional on EVERY direct hit of a spell (Phase 4.1-H2a, ASSUMPTION 135): each
// target of an AOE, each `deal-damage` effect in a spell's list, and a single-target cast.
// Hand-derived. All vitality, neutral x1.0; all targets Defence 0.
//
// CASTER (level 1, Int 20, speed 100) casts NOVA (AOE, two effects: spellPower 0.3 then 0.5);
// CASTER2 (level 1, Int 20, speed 90) casts BOLT (single, one effect: spellPower 0.2). Level 1:
// cap 10. Targets: E1 (health 100, speed 2), E2 (health 60, speed 1), always-wait. 20% of 100 = 20
// and of 60 = 12, so the cap (10) is the additional on both.
//
//   NOVA on [E1, E2] (frozen slot order); per target the effect list runs in order:
//     effect 1: off 20 x 0.3 = 6 -> raw 6.06 -> 6, + 10 = 16.    effect 2: off 20 x 0.5 = 10 ->
//     raw 10.1 -> 10, + 10 = 20.
//     E1: 100 -> 84 -> 64.      E2: 60 -> 44 -> 24.
//   BOLT at the lowest-HP enemy, E2 (24 < 64): off 20 x 0.2 = 4 -> raw 4.04 -> 4, + 10 = 14. E2 -> 10.
// TURN_STEPS = 2 (CASTER, then CASTER2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import type { CombatEvent, Spell } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 8105 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

const CASTER = createCreatureId('caster')
const CASTER2 = createCreatureId('caster2')
const E1 = createCreatureId('e1')
const E2 = createCreatureId('e2')

export const NOVA: Spell = {
  id: 'h2a-nova',
  name: 'Nova (fixture)',
  targetShape: 'aoe',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.3,
    },
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}

export const BOLT: Spell = {
  id: 'h2a-bolt',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.2,
    },
  ],
}

export const CAST_SLOT_0: Script = {
  id: 'h2a-cast-slot-0',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
}

export const ALWAYS_WAIT: Script = {
  id: 'h2a-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const scripts = new Map([
  [CAST_SLOT_0.id, CAST_SLOT_0],
  [ALWAYS_WAIT.id, ALWAYS_WAIT],
])

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    level: 1,
    intelligence: 20,
    speed: 100,
    scriptId: CAST_SLOT_0.id,
    equippedSpells: [NOVA],
  },
  {
    id: 'caster2',
    level: 1,
    intelligence: 20,
    speed: 90,
    scriptId: CAST_SLOT_0.id,
    equippedSpells: [BOLT],
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e1', health: 100, defence: 0, speed: 2, scriptId: ALWAYS_WAIT.id },
  { id: 'e2', health: 60, defence: 0, speed: 1, scriptId: ALWAYS_WAIT.id },
])

function hit(
  source: typeof CASTER,
  target: typeof E1,
  rawDamage: number,
  finalDamage: number,
  remainingHp: number,
): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: source,
    targetId: target,
    rawDamage,
    finalDamage,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'cast',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'aoe',
    casterId: CASTER,
    gemSlot: 0,
    targetIds: [E1, E2],
  },
  hit(CASTER, E1, 6.06, 16, 84),
  hit(CASTER, E1, 10.1, 20, 64),
  hit(CASTER, E2, 6.06, 16, 44),
  hit(CASTER, E2, 10.1, 20, 24),
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: CASTER2 },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER2,
    gemSlot: 0,
    targetId: E2,
  },
  hit(CASTER2, E2, 4.04, 14, 10),
  { type: 'TurnEnded', creatureId: CASTER2 },
]
