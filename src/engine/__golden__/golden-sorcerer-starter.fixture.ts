// Golden: the Sorcerer starter's real signature trait (data/species/starters.ts's
// SORCERER_STARTER_TRAIT, the new `bonus-cast` primitive) + its real granted spell (ARCANE_BOLT)
// -- "50% chance on-turn-end to cast a random equipped spell." A single equipped spell (pool
// size 1, matching the starter's own real slot-0 loadout) makes the "random" slot pick
// deterministic regardless of its own RNG draw, isolating this golden to proving the ONE thing
// that actually varies: the chancePercent roll succeeding, at real seed 7 (chosen empirically --
// its very first mulberry32 draw is ~0.0117, comfortably under 50%; no other RNG-consuming
// mechanism exists anywhere in this fight before the bonus-cast check, so this IS the roll it
// consumes).
//
// Hand-derived (independent `node -e` calculator). CASTER acts (Waits, per its own script) then,
// at turn-end, the bonus-cast passive fires -- AFTER TurnEnded, per combat.ts's own ordering.
//
//   ARCANE_BOLT: spellPower 0.5, scalingStat unset -> default remap-aware Intelligence lookup.
//   effInt 20 (no modifiers) x spellPower 0.5 x instance-list powerFraction 1.0 (no extra
//   instances) = offStat 10. FOE (wit, neutral x1.0) defence 0: core 10, chip 0.01*10=0.1 ->
//   raw 10.1 -> final 10. FOE health 10 - 10 -> 0 -> dies, ending the fight in CASTER's win
//   inside its own single turn (before FOE ever gets to act).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { ARCANE_BOLT, SORCERER_STARTER_TRAIT } from '../../data/species/starters'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 7 // First mulberry32 draw ~0.0117 -- the bonus-cast roll succeeds (< 50%).

const CASTER = createCreatureId('caster')
const FOE = createCreatureId('foe')

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    intelligence: 20,
    defence: 0,
    speed: 10,
    affinity: 'wit',
    scriptId: 'always-wait',
    innateTraitIds: [SORCERER_STARTER_TRAIT.id],
    equippedSpells: [ARCANE_BOLT],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    health: 10,
    defence: 0,
    speed: 1,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
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
    targetId: FOE,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'cast',
  },
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
