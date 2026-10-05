// Golden: the real-status mirror of golden-b2-silenced-refuses-granted-cast (Phase 4.1-F3). Silenced
// is the REAL status, applied by the REAL Silence spell, and a granted cast (a turn-end
// perform-action, chance 100) is refused by the Cast lock -- while the Silenced creature still
// attacks (a scoped lock leaves other actions choosable). The B2 golden (a trait-borne fixture
// lock) stays as it is. Hand-derived.
//
// SILENCER (enemy, speed 30, health 60, defence 0, script: always-cast) holds SILENCE in slot 0.
// CASTER (player, speed 20, health 40, Attack 10, Int 20, defence 0, script always-attack) holds
// BOLT and carries a trait: on-turn-end perform-action(self, cast 'random') at chancePercent 100.
// Round 1:
//   SILENCER: SpellCast (single, target the only player = CASTER), StatusApplied(silenced, 1, 3).
//   CASTER: its own Cast is locked, so always-attack attacks the only enemy: off 10, def 0 -> core
//     10, chip 0.1 -> raw 10.1 -> final 10; SILENCER 60 -> 50. Turn end: the grant's trigger fires
//     (TriggerFired; the chance roll draws #1) and the grant is REFUSED when it runs (the Cast
//     lock): no ActionGranted, no SpellCast, no gem draw. Cleanup: Silenced (applied in another
//     creature's turn) counts down 3 -> 2, no event.
// No other RNG consumer, so the seed is inert.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { SILENCE } from '../../data/spells'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4303
export const TURN_STEPS = 2 // SILENCER, CASTER

const SILENCER = createCreatureId('silencer')
const CASTER = createCreatureId('caster')

export const BOLT: Spell = {
  id: 'f3-bolt-fixture',
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
      spellPower: 1,
    },
  ],
}

export const GRANTED_CAST_TRAIT: Trait = {
  id: 'f3-granted-cast-fixture',
  name: 'Granted Cast (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      chancePercent: 100,
      response: {
        kind: 'perform-action',
        actor: 'self',
        intent: { action: { kind: 'cast', gemSlot: 'random' } },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    health: 40,
    attack: 10,
    intelligence: 20,
    defence: 0,
    speed: 20,
    scriptId: 'always-attack',
    equippedSpells: [BOLT, null, null],
    innateTraitIds: [GRANTED_CAST_TRAIT.id],
  },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'silencer',
    health: 60,
    defence: 0,
    speed: 30,
    scriptId: 'always-cast',
    equippedSpells: [SILENCE, null, null],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [GRANTED_CAST_TRAIT.id, GRANTED_CAST_TRAIT],
])
export const statuses = STATUS_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: SILENCER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: SILENCER,
    gemSlot: 0,
    targetId: CASTER,
  },
  {
    type: 'StatusApplied',
    targetId: CASTER,
    statusId: 'silenced',
    stacks: 1,
    duration: 3,
    sourceId: SILENCER,
  },
  { type: 'TurnEnded', creatureId: SILENCER },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'AttackDeclared', attackerId: CASTER, targetId: SILENCER },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: SILENCER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 50,
    damageSource: 'attack',
    statusId: undefined,
  },
  // The grant fired and was refused by the lock: nothing but this TriggerFired.
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-end',
    effectId: GRANTED_CAST_TRAIT.id,
  },
  { type: 'TurnEnded', creatureId: CASTER },
]

export const expectedResult: FightResult | null = null
