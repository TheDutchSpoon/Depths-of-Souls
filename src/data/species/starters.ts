// Phase 4 Slice F: the three spec starter creatures + the Unicorn (species-locked.md's "Starter
// species (stubbed -- rosters deferred)" section). Real, shipped content -- authored directly as
// `SpeciesCreature`s (generation.ts's own static-content shape), so a future Slice G store can
// materialize a starter through the EXACT same `materializeCreature` path any spawned enemy goes
// through, per CONVENTIONS.
//
// Composition only (CONVENTIONS "Data layer — carriers vs. composition"): the starter traits and
// Arcane Bolt are shared library carriers, defined in `../traits`/`../spells` and referenced here
// by id/object, never redefined.
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

import type { SpeciesCreature } from '../../engine/generation'
import {
  SORCERER_STARTER_TRAIT,
  BRUTE_STARTER_TRAIT,
  SHIELDBARER_STARTER_TRAIT,
  UNICORN_TRAIT,
} from '../traits'

// ---- Sorcerer starter ----
// "Wit affinity, high Intelligence. Trait: grants one spell as a permanent extra gem + 50%
// chance on-turn-end to cast a random equipped spell" (species-locked.md / sorcerer.md). Its
// own signature trait (SORCERER_STARTER_TRAIT) and granted gem (ARCANE_BOLT) live in the
// library -- see `../traits`/`../spells`.

export const SORCERER_STARTER: SpeciesCreature = {
  id: 'sorcerer-starter',
  // Phase 4.1-A (G3, ASSUMPTION 25): a placeholder name -- the Sorcerer starter's real species
  // (species-locked.md) is authored in a later biome; this stands in until then.
  name: 'Glyphmoth Seer',
  affinity: 'wit',
  baseStats: { health: 20, attack: 10, intelligence: 30, defence: 10, speed: 20 },
  defaultScriptId: 'caster',
  innateTraitIds: [SORCERER_STARTER_TRAIT.id],
  rarity: 'rare',
  // Phase 4.1-B (A8): the FIXED `equippedSpells: [ARCANE_BOLT, null, null, null]` loadout is
  // deleted (`SpeciesCreature.equippedSpells` no longer exists) -- Arcane Bolt is now granted by
  // SORCERER_STARTER_TRAIT's own `innate-spell` effect, prepended by `createCombat`'s fight-setup
  // ahead of this creature's regular (default, all-null) gem slots. Materialized result is
  // byte-identical: `[Arcane Bolt, null, null, null]` -- immediately castable by the `caster` role
  // (4.1-G1), which casts a random castable gem every turn.
}

export const SORCERER_STARTER_SPECIES_ID = 'sorcerer-starter-species'

// ---- Brute starter ----
// "high Attack. Trait: Attack resolves one additional instance -- Attack executes twice at 100%,
// each a real attack firing on-attack (same target as the first, default-target fallback if it
// died)." A direct, content-level exercise of Slice B's action instance-list model -- no new
// resolver logic needed (per the plan's own "Response reuse check"). Its signature trait
// (BRUTE_STARTER_TRAIT) lives in the library -- see `../traits`.

export const BRUTE_STARTER: SpeciesCreature = {
  id: 'brute-starter',
  // Phase 4.1-A (G3, ASSUMPTION 25): a placeholder name -- see SORCERER_STARTER's own comment.
  name: 'Cragfang Mauler',
  affinity: 'violence',
  baseStats: { health: 20, attack: 30, intelligence: 10, defence: 15, speed: 15 },
  defaultScriptId: 'striker',
  innateTraitIds: [BRUTE_STARTER_TRAIT.id],
  rarity: 'rare',
}

export const BRUTE_STARTER_SPECIES_ID = 'brute-starter-species'

// ---- Shieldbarer starter ----
// "high Defence. Trait: on-provoke -> your creatures gain +35% Defence (team-wide)." Its
// signature trait (SHIELDBARER_STARTER_TRAIT) lives in the library -- see `../traits`.

export const SHIELDBARER_STARTER: SpeciesCreature = {
  id: 'shieldbarer-starter',
  // Phase 4.1-A (G3, ASSUMPTION 25): a placeholder name -- see SORCERER_STARTER's own comment.
  name: 'Stonehorn Warden',
  affinity: 'endurance',
  baseStats: { health: 25, attack: 10, intelligence: 10, defence: 30, speed: 10 },
  defaultScriptId: 'taunter',
  innateTraitIds: [SHIELDBARER_STARTER_TRAIT.id],
  rarity: 'rare',
}

export const SHIELDBARER_STARTER_SPECIES_ID = 'shieldbarer-starter-species'

// ---- The Unicorn ----
// "Whenever this creature attacks, it resurrects a random dead ally at 20% of its baseline max
// HP. Fires per attack hit." Unique, permanent intro-helper party member (species-locked.md);
// joins via the scripted-intro encounter, a Slice G/run-layer concern -- this slice only authors
// the creature content itself. Its signature trait (UNICORN_TRAIT) lives in the library -- see
// `../traits`.

export const UNICORN: SpeciesCreature = {
  id: 'unicorn',
  // Phase 4.1-A (G3, ASSUMPTION 25): a placeholder name -- see SORCERER_STARTER's own comment.
  name: 'Unicorn Lightbearer',
  affinity: 'vitality',
  baseStats: { health: 25, attack: 15, intelligence: 15, defence: 15, speed: 20 },
  defaultScriptId: 'striker',
  innateTraitIds: [UNICORN_TRAIT.id],
  rarity: 'rare',
}

export const UNICORN_SPECIES_ID = 'unicorn-species'

export const STARTERS: readonly SpeciesCreature[] = [
  SORCERER_STARTER,
  BRUTE_STARTER,
  SHIELDBARER_STARTER,
  UNICORN,
]
