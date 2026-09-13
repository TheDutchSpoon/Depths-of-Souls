// Phase 4 Slice F: the three spec starter creatures + the Unicorn (species-locked.md's "Starter
// species (stubbed -- rosters deferred)" section). Real, shipped content -- authored directly as
// `SpeciesCreature`s (generation.ts's own static-content shape), so a future Slice G store can
// materialize a starter through the EXACT same `materializeCreature` path any spawned enemy goes
// through, per CONVENTIONS.
//
// ASSUMPTION (Slice F): each starter/Unicorn's own species is stubbed (species-locked.md: "for
// now only the starter creature exists -- species sits below the >=3-creature minimum on
// purpose"), so a placeholder `speciesId` string stands in below (never a real Species grouping,
// never drawn from a biome spawn pool). `rarity` is likewise a required SpeciesCreature field
// that is mechanically meaningless here (starters/the Unicorn are never rarity-weighted-drawn);
// set to 'rare' as a flavor-only placeholder.
//
// ASSUMPTION (Slice F): exact base stats (10-30 per GAME_DESIGN) are parked balance, picked only
// to satisfy each starter's qualitative "high X" description (species-locked.md/the spec docs) --
// not exercised by any locked design number.
//
// ASSUMPTION (Slice F): species-locked.md explicitly left the Brute/Shieldbarer starters'
// affinity unpinned ("affinities settle when their species are authored -- ideally distinct").
// Resolved here via CLAUDE.md's own affinity->stat soft-mapping (Violence->Attack, Wit->
// Intelligence, Endurance->Defence): Sorcerer starter = wit (already pinned), Brute starter =
// violence (matches "high Attack"), Shieldbarer starter = endurance (matches "high Defence") --
// three distinct affinities, satisfying "ideally distinct." The Unicorn's affinity is likewise
// unpinned by any doc; picked as vitality (Health-flavored, fits its revive/support role, and
// matches golden-revive.fixture.ts's own Unicorn-shaped fixture for continuity).

import type { Spell } from '../../engine/types'
import type { Trait } from '../../engine/effect-types'
import type { SpeciesCreature } from '../../engine/generation'

// ---- Sorcerer starter ----
// "Wit affinity, high Intelligence. Trait: grants one spell as a permanent extra gem + 50%
// chance on-turn-end to cast a random equipped spell" (species-locked.md / sorcerer.md).

/** The Sorcerer starter's own signature gem -- the "one spell" granted as a permanent extra gem.
 * A new Wit-affinity spell (none existed before this slice; STOCK_SPELLS is violence/instinct
 * only) -- kept starter-local rather than added to the generic biome-spawnable STOCK_SPELLS list,
 * since it is this ONE creature's own built-in kit, not loot. */
export const ARCANE_BOLT: Spell = {
  id: 'arcane-bolt',
  name: 'Arcane Bolt',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'wit',
}

/** Placed in slot 0 (immediately castable by the stock `always-cast` script, which targets
 * gemSlot 0) rather than a bonus 4th slot -- a fresh Sorcerer starter otherwise has nothing to
 * cast at all until the Phase 8 gem economy exists. 4 slots total (one more than
 * DEFAULT_GEM_SLOT_COUNT's 3) is the "extra gem slot" itself; slots 1-3 stay empty, player-
 * equippable once Phase 8 lands. */
export const SORCERER_STARTER_EQUIPPED_SPELLS: readonly (Spell | null)[] = [
  ARCANE_BOLT,
  null,
  null,
  null,
]

/** NEW PRIMITIVE (Slice F) -- see effect-types.ts's `BonusCastDef` doc comment for the full
 * reasoning (not a 10th response verb; a passively-consulted EffectDef, read by combat.ts's
 * resolveTurn directly). "50% chance on-turn-end to cast a random equipped spell." */
export const SORCERER_STARTER_TRAIT: Trait = {
  id: 'sorcerer-starter-arcane-surge',
  name: 'Arcane Surge',
  effects: [{ category: 'bonus-cast', chancePercent: 50 }],
}

export const SORCERER_STARTER: SpeciesCreature = {
  id: 'sorcerer-starter',
  affinity: 'wit',
  baseStats: { health: 20, attack: 10, intelligence: 30, defence: 10, speed: 20 },
  defaultScriptId: 'always-cast',
  innateTraitIds: [SORCERER_STARTER_TRAIT.id],
  rarity: 'rare',
}

export const SORCERER_STARTER_SPECIES_ID = 'sorcerer-starter-species'

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

export const BRUTE_STARTER: SpeciesCreature = {
  id: 'brute-starter',
  affinity: 'violence',
  baseStats: { health: 20, attack: 30, intelligence: 10, defence: 15, speed: 15 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [BRUTE_STARTER_TRAIT.id],
  rarity: 'rare',
}

export const BRUTE_STARTER_SPECIES_ID = 'brute-starter-species'

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

export const SHIELDBARER_STARTER: SpeciesCreature = {
  id: 'shieldbarer-starter',
  affinity: 'endurance',
  baseStats: { health: 25, attack: 10, intelligence: 10, defence: 30, speed: 10 },
  defaultScriptId: 'always-provoke',
  innateTraitIds: [SHIELDBARER_STARTER_TRAIT.id],
  rarity: 'rare',
}

export const SHIELDBARER_STARTER_SPECIES_ID = 'shieldbarer-starter-species'

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

export const UNICORN: SpeciesCreature = {
  id: 'unicorn',
  affinity: 'vitality',
  baseStats: { health: 25, attack: 15, intelligence: 15, defence: 15, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [UNICORN_TRAIT.id],
  rarity: 'rare',
}

export const UNICORN_SPECIES_ID = 'unicorn-species'

// ---- Registries (additive to data/traits.ts's STOCK_TRAITS/TRAIT_REGISTRY) ----

export const STARTER_TRAITS: readonly Trait[] = [
  SORCERER_STARTER_TRAIT,
  BRUTE_STARTER_TRAIT,
  SHIELDBARER_STARTER_TRAIT,
  UNICORN_TRAIT,
]

export const STARTERS: readonly SpeciesCreature[] = [
  SORCERER_STARTER,
  BRUTE_STARTER,
  SHIELDBARER_STARTER,
  UNICORN,
]
