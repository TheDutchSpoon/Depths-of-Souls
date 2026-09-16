// Golden: Glimmerdark's Gloomjaw Executioner (PR #60 review, C4) -- "snowballs off finishing
// blows": every kill permanently raises its own Attack by 15% for the rest of the fight
// (`on-kill -> apply-stat-modifier self`), against REAL shipped content (data/species/
// glimmerdark.ts's real GLOOMJAW_EXECUTIONER_TRAIT). Two kills, one per round, prove the
// COMPOUND (a fresh StatModifierEffect appended each firing, folding multiplicatively -- never a
// refreshed single instance): the second kill's hit is already bigger purely from the first
// kill's own buff.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). All violence -> neutral
// (x1.0, same-affinity). EXECUTIONER (speed 20) acts before FOE1 (speed 10) before FOE2
// (speed 5) each round; `always-attack` always targets the lowest-HP living enemy.
//
//   Round 1: EXECUTIONER->FOE1 (the only enemy alive at round-start with the lower of the two
//     HP values -- off 20, def 0): core 20, chip 0.2 -> raw 20.2 -> final 20. FOE1 15-20 -> dies
//     (overkill). on-kill fires: Attack 20 -> 23 (x1.15).
//   Round 2: EXECUTIONER->FOE2 (now the only living enemy), reading its NOW-buffed Attack: off
//     23, def 0: core 23, chip 0.23 -> raw 23.23 -> final 23. FOE2 20-23 -> dies (overkill).
//     on-kill fires again: Attack 23 -> 26.45 (x1.15 again, compounding). Fight ends in a win.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { GLOOMJAW_EXECUTIONER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 9009 // No RNG consumed anywhere in this fixture; seed is inert.

const EXECUTIONER = createCreatureId('gloomjaw-executioner')
const FOE1 = createCreatureId('foe1')
const FOE2 = createCreatureId('foe2')

export const playerParty = makeParty('player', [
  {
    id: 'gloomjaw-executioner',
    attack: 20,
    defence: 14,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [GLOOMJAW_EXECUTIONER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe1',
    health: 15,
    defence: 0,
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
  {
    id: 'foe2',
    health: 20,
    defence: 0,
    speed: 5,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

// EXECUTIONER (r1, kills FOE1), FOE1 (dead, empty bracket), FOE2 (r1, waits),
// EXECUTIONER (r2, kills FOE2 -- fight ends).
export const TURN_STEPS = 4

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: EXECUTIONER },
  { type: 'AttackDeclared', attackerId: EXECUTIONER, targetId: FOE1 },
  {
    type: 'DamageDealt',
    sourceId: EXECUTIONER,
    targetId: FOE1,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: FOE1 },
  {
    type: 'TriggerFired',
    sourceId: EXECUTIONER,
    hook: 'on-kill',
    effectId: GLOOMJAW_EXECUTIONER_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: EXECUTIONER,
    targetId: EXECUTIONER,
    stat: 'attack',
    factor: 1.15,
    effectiveBefore: 20,
    effectiveAfter: 23,
  },
  { type: 'TurnEnded', creatureId: EXECUTIONER },
  { type: 'TurnStarted', creatureId: FOE1 },
  { type: 'TurnEnded', creatureId: FOE1 },
  { type: 'TurnStarted', creatureId: FOE2 },
  { type: 'Waited', creatureId: FOE2 },
  { type: 'TurnEnded', creatureId: FOE2 },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: EXECUTIONER },
  { type: 'AttackDeclared', attackerId: EXECUTIONER, targetId: FOE2 },
  {
    type: 'DamageDealt',
    sourceId: EXECUTIONER,
    targetId: FOE2,
    rawDamage: 23.23,
    finalDamage: 23,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: FOE2 },
  {
    type: 'TriggerFired',
    sourceId: EXECUTIONER,
    hook: 'on-kill',
    effectId: GLOOMJAW_EXECUTIONER_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: EXECUTIONER,
    targetId: EXECUTIONER,
    stat: 'attack',
    factor: 1.15,
    effectiveBefore: 23,
    effectiveAfter: 26.45,
  },
  { type: 'TurnEnded', creatureId: EXECUTIONER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
