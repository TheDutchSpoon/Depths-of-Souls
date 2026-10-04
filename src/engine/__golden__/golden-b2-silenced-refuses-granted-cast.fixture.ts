// Golden: B2.2 (Phase 4.1-C2c) -- Silence (a scoped Cast lock) refuses a granted cast, and a
// refused action DRAWS NOTHING (not even the gem draw). The Silenced creature still attacks (a
// scoped lock leaves other actions choosable) and the granted cast's chance is still rolled.
// Hand-derived.
//
// CASTER (player, speed 20, Attack 10, Int 20, HP 40, defence 0, script `always-attack`): trait
// `b2-silenced-granted-caster-fixture` = [on-turn-end perform-action(self, cast 'random') at
// chancePercent 100 (4.1-E; was `bonus-cast`), a trait-borne passive `action-lock` scope 'cast'
// (4.1-F1: was a permanent on-turn-start suppression)] -- a fixture stand-in for Silenced
// (authored content lands in F3), like golden-scoped-suppression's. Slots after createCombat
// (asserted): exactly [BOLT].
// Round 1, CASTER: (4.1-F1: the lock is passive, so no turn-start TriggerFired any more; scoped,
// so it does NOT skip the turn), it attacks the lowest-HP enemy (E2 30 < E1 40): core 10 - 0,
// chip 0.1 -> raw 10.1 -> final 10; E2 30 -> 20. Turn end: granted cast rolls (draw #1) -> then runAction's checkLegality refuses the
// Cast lock -> no gem draw, no SpellCast.
//
// LATER RNG CONSUMER: E1 (speed 10, Attack 10, `random-attack`) picks among player creatures
// [CASTER, D1, D2] with floor(r * 3). Seed 9211's draws: #1 0.4014, #2 0.2864, #3 0.4192.
//   - As built: #1 = grant roll, E1's pick = #2 = 0.2864 -> floor(0.86) = 0 -> CASTER.
//   - Draw-the-gem-THEN-refuse (mutation): the gem draw takes #2, E1's pick = #3 = 0.4192 ->
//     floor(1.26) = 1 -> D1. Different log.
//   - checkLegality removed from runAction: the cast lands (SpellCast + DamageDealt on E2/E1).
// E1's hit: 10 vs def 0 -> raw 10.1 -> 10; CASTER 40 - 10 = 30 (no clamp). All vitality.
// Order: CASTER 20, E1 10, D1 5, D2 4, E2 1; TURN_STEPS = 2.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 9211
export const TURN_STEPS = 2 // CASTER (attacks, no granted cast), E1

const CASTER = createCreatureId('caster')
const E1 = createCreatureId('e1')
const E2 = createCreatureId('e2')

export const BOLT: Spell = {
  id: 'bolt-fixture',
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
      spellPower: 0.5,
    },
  ],
}

export const RANDOM_ATTACK_SCRIPT: Script = {
  id: 'random-attack-fixture',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'random-enemy' },
    },
  ],
}

export const SILENCED_GRANTED_CASTER: Trait = {
  id: 'b2-silenced-granted-caster-fixture',
  name: 'Silenced Granted Caster (fixture)',
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
    { category: 'action-lock', scope: 'cast' },
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
    equippedSpells: [BOLT],
    innateTraitIds: [SILENCED_GRANTED_CASTER.id],
  },
  { id: 'd1', health: 40, defence: 0, speed: 5, scriptId: 'always-wait' },
  { id: 'd2', health: 40, defence: 0, speed: 4, scriptId: 'always-wait' },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'e1',
    health: 40,
    attack: 10,
    defence: 0,
    speed: 10,
    scriptId: RANDOM_ATTACK_SCRIPT.id,
  },
  { id: 'e2', health: 30, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [RANDOM_ATTACK_SCRIPT.id, RANDOM_ATTACK_SCRIPT],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SILENCED_GRANTED_CASTER.id, SILENCED_GRANTED_CASTER],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'AttackDeclared', attackerId: CASTER, targetId: E2 },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: E2,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 20,
    damageSource: 'attack',
  },
  // The grant's trigger fired (chance rolled, draw #1) and the grant was then refused by the Cast
  // lock when it ran: no ActionGranted, no SpellCast, nothing else (4.1-E: a refused grant emits
  // nothing of its own; this TriggerFired is the one new event).
  {
    type: 'TriggerFired',
    sourceId: CASTER,
    hook: 'on-turn-end',
    effectId: SILENCED_GRANTED_CASTER.id,
  },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: E1 },
  // E1's random pick = draw #2 (0.2864) -> index 0 = CASTER.
  { type: 'AttackDeclared', attackerId: E1, targetId: CASTER },
  {
    type: 'DamageDealt',
    sourceId: E1,
    targetId: CASTER,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 30,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: E1 },
]
