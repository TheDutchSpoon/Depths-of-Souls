// Golden: Glimmerdark's Gloomjaws signature mechanic (species-locked.md) -- "execute the weak",
// built on `conditional-damage-bonus` (Slice E2) with a `hp-percent` condition scoped to the
// current damage TARGET (subject 'target'), against REAL shipped content (data/species/
// glimmerdark.ts's real GLOOMJAW_STALKER_TRAIT). Mirrors Overgrowth's Ambusher/Reaper primitive
// exactly, gated on raw HP% instead of a status.
//
// Two real hits, one round apart (createCombat resets currentHp to effective max at fight-start,
// so a rigged low-HP override wouldn't survive -- the contrast has to come from an actual first
// hit). Hand-derived (independent `node -e` calculator, verified via Bash). Both violence ->
// neutral (x1.0, same-affinity). STALKER (speed 18) acts before TARGET (speed 1, always-wait)
// each round.
//
//   Round 1: STALKER->TARGET, TARGET at full HP (30/30 = 100% >= 30%) -> no bonus. off 22, def 0:
//     core 22, chip 0.22 -> raw 22.22 -> final 22. TARGET 30-22=8 (26.7% HP).
//   Round 2: STALKER->TARGET again, now 8/30 = 26.7% < 30% -> condition TRUE -> +30% dealt.
//     core 22, chip 0.22 -> 22.22 x 1.3 -> raw 28.886 -> final 28. TARGET 8-28 -> dies (overkill).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { GLOOMJAW_STALKER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 7007 // No RNG consumed anywhere in this fixture; seed is inert.

const STALKER = createCreatureId('gloomjaw-stalker')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'gloomjaw-stalker',
    attack: 22,
    defence: 14,
    speed: 18,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [GLOOMJAW_STALKER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 30,
    defence: 0,
    speed: 1,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

// STALKER (r1), TARGET (r1, waits), STALKER (r2, execute bonus lands, TARGET dies).
export const TURN_STEPS = 3

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: STALKER },
  { type: 'AttackDeclared', attackerId: STALKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: STALKER,
    targetId: TARGET,
    rawDamage: 22.22,
    finalDamage: 22,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 8,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: STALKER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: STALKER },
  { type: 'AttackDeclared', attackerId: STALKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: STALKER,
    targetId: TARGET,
    rawDamage: 28.886,
    finalDamage: 28,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: STALKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
