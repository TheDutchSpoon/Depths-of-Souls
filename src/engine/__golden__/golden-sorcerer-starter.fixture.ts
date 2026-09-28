// Golden: the Sorcerer starter's real signature trait (data/traits/starters.ts's
// SORCERER_STARTER_TRAIT, the new `bonus-cast` primitive) + its real granted spell (ARCANE_BOLT,
// data/spells/overgrowth.ts -- also a normal biome-1 Wit spawn-pool spell as of the data-layer
// carrier reorg)
// -- "50% chance on-turn-end to cast a random equipped spell." Phase 4.1-B (A8, design-review
// B-10): CASTER carries NO explicit `equippedSpells` -- ARCANE_BOLT comes SOLELY from
// SORCERER_STARTER_TRAIT's own `innate-spell` effect, which `createCombat`'s fight-setup
// prepends onto the (otherwise default, all-null) regular gem slots. Before A8 this fixture hand-
// authored `equippedSpells: [ARCANE_BOLT]` directly; keeping that alongside the trait's own
// innate-spell grant would double it to `[Bolt, Bolt]` (pool size 2), which happens to still pick
// slot 0 at this exact seed (a coincidence, not a proof) -- dropping it here is the one allowed
// deliberate change (a `createCombat`-shape fixture also needing a content-level fix), and it
// makes the equipped pool size 1 again, matching the real Seer's starting loadout exactly. A
// single equipped spell (pool size 1) makes the "random" slot pick deterministic regardless of
// its own RNG draw, isolating this golden to proving the ONE thing that actually varies: the
// chancePercent roll succeeding, at real seed 7 (chosen empirically -- its very first mulberry32
// draw is ~0.0117, comfortably under 50%; no other RNG-consuming mechanism exists anywhere in
// this fight before the bonus-cast check, so this IS the roll it consumes).
//
// Hand-derived (independent `node -e` calculator). CASTER acts (Waits, per its own script) then,
// at turn-end, the bonus-cast passive fires -- BEFORE TurnEnded (Phase 4.1-C, D6: TurnEnded is
// always the turn's last event; Phase 4 fired the bonus cast after it).
//
//   ARCANE_BOLT: spellPower 0.5, scalingStat unset -> default remap-aware Intelligence lookup.
//   effInt 20 (no modifiers) x spellPower 0.5 x instance-list powerFraction 1.0 (no extra
//   instances) = offStat 10. FOE (wit, neutral x1.0) defence 0: core 10, chip 0.01*10=0.1 ->
//   raw 10.1 -> final 10. FOE health 10 - 10 -> 0 -> dies, ending the fight in CASTER's win
//   inside its own single turn (before FOE ever gets to act).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY, SORCERER_STARTER_TRAIT } from '../../data/traits'
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
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
