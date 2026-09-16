// Golden: Glimmerdark's Resonants signature mechanic (species-locked.md) -- "members
// on-ally-action(cast) -> gain Attack/Int", built on the general `on-action-observed` system
// (Slice E2) against REAL shipped content (data/species/glimmerdark.ts's real
// RESONANT_CHORUS_TRAIT/RESONANT_ADEPT_TRAIT). Proves the "ally includes self" rule concretely:
// CHORUS is both the caster AND an ally-relationship observer of its OWN cast, so it reacts to
// itself in the same firing ADEPT (a separate ally) reacts in.
//
// Phase 4 interstitial slice (cumulative spell unlock): originally cast GLOWSPARK_BOLT
// (Glimmerdark, spellPower 1.0), since deleted as a near-dup of ARCANE_BOLT (Overgrowth, now
// inherited at every deeper biome -- see data/spells/glimmerdark.ts's own header comment).
// Retargeted to ARCANE_BOLT (spellPower 0.5, same wit/single/damage shape) per design-owner
// call -- the damage number below is RECOMPUTED against the new spellPower, not preserved.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). Both CHORUS/TARGET are wit
// -> neutral (x1.0); ADEPT never deals damage in this fixture, so its own affinity is moot.
// livingIds dispatch order (combat.ts) is player-slot-order then enemy-slot-order: CHORUS(slot 0)
// -> ADEPT(slot 1) -> TARGET (enemy slot 0, no matching trait -> no event).
//
//   CHORUS casts ARCANE_BOLT (slot 0) at TARGET (lowest-hp-enemy, the only enemy).
//   on-action-observed fires on every living creature; CHORUS's own Harmonize matches
//     (relationship 'ally' includes self) -> +5% Attack (10 -> 10.5). ADEPT's Resonate matches
//     (a separate ally) -> +8% Intelligence (26 -> 28.080000000000002, float-imprecise at full
//     precision, per the harness's own precision). Neither modifies Intelligence used below.
//   Spell damage: off = Intelligence(24, CHORUS's own, unaffected by either reaction above) x
//     spellPower(0.5) = 12; vs def 0: core 12, chip 0.12 -> raw 12.12 -> final 12.
//     TARGET 100-12=88.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { ARCANE_BOLT } from '../../data/spells'
import {
  RESONANT_ADEPT_TRAIT,
  RESONANT_CHORUS_TRAIT,
  TRAIT_REGISTRY,
} from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 6006 // No RNG consumed anywhere in this fixture; seed is inert.

const CHORUS = createCreatureId('resonant-chorus')
const ADEPT = createCreatureId('resonant-adept')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'resonant-chorus',
    attack: 10,
    intelligence: 24,
    defence: 12,
    speed: 20,
    affinity: 'wit',
    scriptId: 'always-cast',
    innateTraitIds: [RESONANT_CHORUS_TRAIT.id],
    equippedSpells: [ARCANE_BOLT],
  },
  {
    id: 'resonant-adept',
    attack: 10,
    intelligence: 26,
    defence: 12,
    speed: 15,
    affinity: 'wit',
    scriptId: 'always-wait',
    innateTraitIds: [RESONANT_ADEPT_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 0,
    speed: 5,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CHORUS },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CHORUS,
    gemSlot: 0,
    targetId: TARGET,
  },
  {
    type: 'TriggerFired',
    sourceId: CHORUS,
    hook: 'on-action-observed',
    effectId: RESONANT_CHORUS_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: CHORUS,
    targetId: CHORUS,
    stat: 'attack',
    factor: 1.05,
    effectiveBefore: 10,
    effectiveAfter: 10.5,
  },
  {
    type: 'TriggerFired',
    sourceId: ADEPT,
    hook: 'on-action-observed',
    effectId: RESONANT_ADEPT_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: ADEPT,
    targetId: ADEPT,
    stat: 'intelligence',
    factor: 1.08,
    effectiveBefore: 26,
    effectiveAfter: 28.080000000000002,
  },
  {
    type: 'DamageDealt',
    sourceId: CHORUS,
    targetId: TARGET,
    rawDamage: 12.12,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 88,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CHORUS },
]
