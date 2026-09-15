import type { Trait } from '../../engine/effect-types'

// Phase 4 Slice F: the three spec starter creatures' + the Unicorn's signature traits. Real,
// shipped content -- see `data/species/starters.ts` for the SpeciesCreature defs that reference
// these by id (this file only defines the carriers; the model is composition).

// ---- Sorcerer starter ----
// "Wit affinity, high Intelligence. Trait: grants one spell as a permanent extra gem + 50%
// chance on-turn-end to cast a random equipped spell" (species-locked.md / sorcerer.md).

/** NEW PRIMITIVE (Slice F) -- see effect-types.ts's `BonusCastDef` doc comment for the full
 * reasoning (not a 10th response verb; a passively-consulted EffectDef, read by combat.ts's
 * resolveTurn directly). "50% chance on-turn-end to cast a random equipped spell." */
export const SORCERER_STARTER_TRAIT: Trait = {
  id: 'sorcerer-starter-arcane-surge',
  name: 'Arcane Surge',
  effects: [{ category: 'bonus-cast', chancePercent: 50 }],
}

// ---- Brute starter ----
// "high Attack. Trait: Attack resolves one additional instance -- Attack executes twice at 100%,
// each a real attack firing on-attack (same target as the first, default-target fallback if it
// died)." A direct, content-level exercise of Slice B's action instance-list model -- no new
// resolver logic needed (per the plan's own "Response reuse check").

export const BRUTE_STARTER_TRAIT: Trait = {
  id: 'brute-starter-double-strike',
  name: 'Double Strike',
  effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 100 }],
}

// ---- Shieldbarer starter ----
// "high Defence. Trait: on-provoke -> your creatures gain +35% Defence (team-wide)." A
// stat-modifier (ASSUMPTION 22, not grant-action-state -- it's a stat buff, not an action-state
// flag), targeted at the new `all-allies` ResponseTarget. Permanent-for-fight and re-fired on
// every Provoke, so repeated provokes stack (species-locked.md's own "ramping team-Defence
// engine" framing).

export const SHIELDBARER_STARTER_TRAIT: Trait = {
  id: 'shieldbarer-starter-rally',
  name: 'Rallying Cry',
  effects: [
    {
      category: 'triggered',
      hook: 'on-provoke',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'defence',
        factor: 1.35,
      },
    },
  ],
}

// ---- The Unicorn ----
// "Whenever this creature attacks, it resurrects a random dead ally at 20% of its baseline max
// HP. Fires per attack hit." Unique, permanent intro-helper party member (species-locked.md);
// joins via the scripted-intro encounter, a Slice G/run-layer concern -- this slice only authors
// the creature + trait content itself.

export const UNICORN_TRAIT: Trait = {
  id: 'unicorn-guardians-light',
  name: "Guardian's Light",
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
    },
  ],
}

export const STARTER_TRAITS: readonly Trait[] = [
  SORCERER_STARTER_TRAIT,
  BRUTE_STARTER_TRAIT,
  SHIELDBARER_STARTER_TRAIT,
  UNICORN_TRAIT,
]
