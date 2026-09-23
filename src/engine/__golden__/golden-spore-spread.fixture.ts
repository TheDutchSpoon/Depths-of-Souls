// Golden: Rotcap Hollow's Spore contagion end-to-end (species-locked.md) -- Sporecloud Seeder's
// real, shipped trait (`SPORECLOUD_SEEDER_TRAIT`) infects its target with Spore mid-attack, that
// same attack's damage kills the (pre-wounded) target, and Spore's own `on-death` trigger
// (data/statuses.ts's SPORE) spreads it to the dying creature's only living, still-healthy ally
// -- the NEW `random-ally-without-status` ResponseTarget (ASSUMPTION 30), exercised here for the
// first time against real content, not a fixture stand-in for the producer.
//
// Hand-derived (independent `node -e` calculator). SEEDER (real Sporecloud Seeder base stats,
// attack 16) acts first (speed 22 > BEARER's 10 > ALLY's 5). BEARER starts the fight wounded to
// 10 HP (applied post-createCombat, same idiom golden-dot.fixture.ts uses -- createCombat resets
// currentHp to effective max, so a raw `currentHp` override on the party literal would be
// discarded) so SEEDER's single attack both infects it AND kills it outright, no round-end tick
// needed. Wit-vs-wit is always neutral (same affinity) -- no affinity multiplier complicates the
// math. ALLY (also wit, 50 max HP, untouched) is BEARER's only living ally and does not carry
// Spore, so it's the sole (deterministic, no-RNG) candidate for the spread.
//
//   on-attack fires BEFORE the attack's own damage (CONVENTIONS): SEEDER's Infest trait applies
//     Spore to BEARER (1 stack, duration 3) first.
//   SEEDER->BEARER (off 16, def 0): core = max(16-0,0) = 16. chip = 0.01*16 = 0.16. raw = 16.16
//     (wit-vs-wit affinity x1.0, no dealt/taken mods) -> final = floor(16.16) = 16.
//     BEARER 10 - 16 = -6 -> clamped to 0 -> dies.
//   on-damage-dealt (SEEDER, unconditional): no matching effect -> nothing.
//   CreatureDied(BEARER) -> on-death fires on BEARER: SPORE's own on-death trigger reads
//     `random-ally-without-status(spore)` relative to BEARER (self) -- BEARER's only living ally
//     is ALLY, which does not carry spore -> the sole candidate, no RNG draw needed (pool size
//     1). StatusApplied(ALLY, spore, 1 stack, duration 3, source BEARER).
//   on-kill (SEEDER): no matching effect -> nothing. fireDeathObservers: on-ally-death fires on
//     ALLY (BEARER's only living ally) -- ALLY carries no trait -> nothing. on-enemy-death fires
//     on SEEDER -- no matching effect -> nothing.
//   Enemy side still has ALLY alive (BEARER dead) -> not wiped; state.result stays null.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SPORECLOUD_SEEDER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 3003 // No RNG consumed (single-candidate spread pool); seed is inert.

export const SEEDER = createCreatureId('seeder')
export const BEARER = createCreatureId('bearer')
export const ALLY = createCreatureId('ally')

/** Applied post-createCombat by golden-spore-spread.test.ts -- see the header comment above. */
export const BEARER_STARTING_HP = 10

export const playerParty = makeParty('player', [
  {
    id: 'seeder',
    attack: 16,
    intelligence: 20,
    defence: 10,
    speed: 22,
    affinity: 'wit',
    scriptId: 'always-attack',
    innateTraitIds: [SPORECLOUD_SEEDER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'bearer',
    health: 100,
    defence: 0,
    speed: 10,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
  {
    id: 'ally',
    health: 50,
    defence: 0,
    speed: 5,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 1 // SEEDER's turn only -- BEARER dies mid-attack, before its own turn.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: SEEDER },
  { type: 'AttackDeclared', attackerId: SEEDER, targetId: BEARER },
  {
    type: 'TriggerFired',
    sourceId: SEEDER,
    hook: 'on-attack',
    effectId: SPORECLOUD_SEEDER_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: BEARER,
    statusId: 'spore',
    stacks: 1,
    duration: 3,
    sourceId: SEEDER,
  },
  {
    type: 'DamageDealt',
    sourceId: SEEDER,
    targetId: BEARER,
    rawDamage: 16.16,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: BEARER },
  {
    type: 'TriggerFired',
    sourceId: BEARER,
    hook: 'on-death',
    effectId: 'spore',
  },
  {
    type: 'StatusApplied',
    targetId: ALLY,
    statusId: 'spore',
    stacks: 1,
    duration: 3,
    sourceId: BEARER,
  },
  { type: 'TurnEnded', creatureId: SEEDER },
]
