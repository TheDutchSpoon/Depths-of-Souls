// Golden: the real Pollen Cloud deals NO damage (Phase 4.1-H2d, ASSUMPTION 150): one AoE, enemy-side
// cast puts Sleep (2 turns) on every target and nothing else -- no `DamageDealt` from the cast. A
// content golden: its subject is one named spell on real data. Before 4.1-H2d the spell also dealt
// 35% damage per target, ahead of the Sleep.
//
// It also shows Sleep's wake-up is unchanged: nothing in the cast hits, so the sleepers stay
// asleep until a LATER hit from another source lands, and that hit wakes only its own target.
//
// Hand-derived (independent `node -e` calculator). Everyone is vitality (neutral x1.0) and every
// fixture creature is level 11 (`DEFAULT_FIXTURE_LEVEL`), where the Additional is 0.
//   C (player, Speed 100) `always-cast`, the real POLLEN_CLOUD in slot 0.
//   H (player, Attack 20, Speed 50) `always-attack`, which targets `lowest-hp-enemy`.
//   E1 (enemy, Health 30, Defence 0, Speed 2) and E2 (enemy, Health 40, Defence 0, Speed 1),
//   both `always-wait` (they never act: Sleep skips their turns and TURN_STEPS = 2 stops first).
//
//   Turn 1, C casts: an AoE enemy-side spell, so the frozen target set is every living enemy in
//     slot order, [E1, E2]. Its only effect is `apply-status(cast-target, sleep, 2)`: SpellCast,
//     then StatusApplied sleep (duration 2, source C) on E1 and on E2. NO DamageDealt.
//   Turn 2, H attacks the lowest-HP enemy, E1 (30 < 40). Direct Attack: core = max(20 - 0, 0) =
//     20, chip = 0.01 x 20 = 0.2, raw 20.2, final floor(20.2) = 20, no Additional. E1 30 -> 10.
//     E1 takes damage: Sleep's on-damage-taken -> remove-status(self, sleep) fires (TriggerFired
//     'sleep', then StatusExpired E1). E2 was not hit: no event, it keeps its Sleep, still at 2.
// TURN_STEPS = 2 (C, H).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { POLLEN_CLOUD } from '../../data/spells'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 8401 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2

export const C = createCreatureId('c')
export const H = createCreatureId('h')
export const E1 = createCreatureId('e1')
export const E2 = createCreatureId('e2')

export const playerParty = makeParty('player', [
  {
    id: 'c',
    speed: 100,
    affinity: 'vitality',
    scriptId: 'always-cast',
    equippedSpells: [POLLEN_CLOUD],
  },
  {
    id: 'h',
    attack: 20,
    speed: 50,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'e1',
    health: 30,
    defence: 0,
    speed: 2,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
  {
    id: 'e2',
    health: 40,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const statuses = STATUS_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: C },
  { type: 'SpellCast', targetShape: 'aoe', casterId: C, gemSlot: 0, targetIds: [E1, E2] },
  { type: 'StatusApplied', targetId: E1, statusId: 'sleep', duration: 2, sourceId: C },
  { type: 'StatusApplied', targetId: E2, statusId: 'sleep', duration: 2, sourceId: C },
  { type: 'TurnEnded', creatureId: C },
  { type: 'TurnStarted', creatureId: H },
  { type: 'AttackDeclared', attackerId: H, targetId: E1 },
  {
    type: 'DamageDealt',
    sourceId: H,
    targetId: E1,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 10,
    damageSource: 'attack',
  },
  { type: 'TriggerFired', sourceId: E1, hook: 'on-damage-taken', effectId: 'sleep' },
  { type: 'StatusExpired', creatureId: E1, statusId: 'sleep' },
  { type: 'TurnEnded', creatureId: H },
]
