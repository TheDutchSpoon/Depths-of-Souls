// Golden: Thorn Volley, the shipped AOE damage-only spell, on the real `THORN_VOLLEY`
// (a content golden: it reads the data spell, so its number lives only in
// `data/spells/overgrowth.ts` and a change to it fails here;
// `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`).
//
// Hand-derived (independent `node -e` calculator). CASTER (Violence, Intelligence 100, Speed 100,
// level 11 so the Additional is 0, `spec/combat.md#damage-channels-and-the-additional`) casts the
// spell once on its turn (TURN_STEPS = 1) at all three living enemies, frozen in slot order
// [e1, e2, e3]. The enemies wait. They differ in Defence, and two of them in affinity matchup
// (`spec/combat.md#affinity-advantage`: Vitality beats Violence beats Wit), so each hit is
// distinct (`spec/combat.md#damage-formula`, `spec/combat.md#aoe-cast`).
//
//   offStat = Intelligence 100 x spellPower 0.45 = 45; chip = 0.01 x 45 = 0.45 for every target.
//   e1 (Wit, Defence 15): Violence beats Wit, x1.25. core = 45 - 15 = 30. raw = (30 + 0.45) x
//     1.25 = 38.0625, final 38. Health 60 -> 22.
//   e2 (Vitality, Defence 5): Vitality beats Violence, x0.75. core = 45 - 5 = 40. raw =
//     (40 + 0.45) x 0.75 = 30.337500000000002 (float artifact of the exact IEEE-754 product),
//     final 30. Health 60 -> 30.
//   e3 (Endurance, Defence 25): no matchup, x1. core = 45 - 25 = 20. raw = 20.45, final 20.
//     Health 60 -> 40.
//
// At spellPower 0.3 (offStat 30) the finals would be 19 / 18 / 5, and at 0.5 (offStat 50) 44 /
// 34 / 25, so a different coefficient moves every hit.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { THORN_VOLLEY } from '../../data/spells'
import type { CombatEvent } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 3004 // No RNG consumed (an AOE cast, waiting enemies); seed is inert.
export const TURN_STEPS = 1

const CASTER = createCreatureId('caster')
const E1 = createCreatureId('e1')
const E2 = createCreatureId('e2')
const E3 = createCreatureId('e3')

const CAST_SLOT_0: Script = {
  id: 'thorn-volley-cast',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
}

const ALWAYS_WAIT: Script = {
  id: 'thorn-volley-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const scripts = new Map([
  [CAST_SLOT_0.id, CAST_SLOT_0],
  [ALWAYS_WAIT.id, ALWAYS_WAIT],
])

// The caster's affinity is set explicitly: `makeCreature` defaults to Vitality, which would turn
// every matchup.
export const playerParty = makeParty('player', [
  {
    id: 'caster',
    affinity: 'violence',
    intelligence: 100,
    speed: 100,
    scriptId: CAST_SLOT_0.id,
    equippedSpells: [THORN_VOLLEY],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'e1',
    affinity: 'wit',
    defence: 15,
    health: 60,
    speed: 3,
    scriptId: ALWAYS_WAIT.id,
  },
  {
    id: 'e2',
    affinity: 'vitality',
    defence: 5,
    health: 60,
    speed: 2,
    scriptId: ALWAYS_WAIT.id,
  },
  {
    id: 'e3',
    affinity: 'endurance',
    defence: 25,
    health: 60,
    speed: 1,
    scriptId: ALWAYS_WAIT.id,
  },
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'aoe',
    casterId: CASTER,
    gemSlot: 0,
    targetIds: [E1, E2, E3],
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: E1,
    rawDamage: 38.0625,
    finalDamage: 38,
    affinityMultiplier: 1.25,
    wasChipOnly: false,
    remainingHp: 22,
    damageSource: 'cast',
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: E2,
    rawDamage: 30.337500000000002,
    finalDamage: 30,
    affinityMultiplier: 0.75,
    wasChipOnly: false,
    remainingHp: 30,
    damageSource: 'cast',
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: E3,
    rawDamage: 20.45,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 40,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CASTER },
]
