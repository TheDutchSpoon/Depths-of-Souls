// The three spec starter creatures + the Unicorn (`spec/progression.md#starter-species-are-stubs`).
// Real, shipped content -- authored directly as
// `SpeciesCreature`s (generation.ts's own static-content shape), so the store can
// materialize a starter through the EXACT same `materializeCreature` path any spawned enemy goes
// through, per `spec/creatures.md#materializecreature`.
//
// Composition only (`CONVENTIONS.md#composition-files-only-reference-carriers`): the starter traits and
// Arcane Bolt are shared library carriers, defined in `../traits`/`../spells` and referenced here
// by id/object, never redefined.
//
// Each starter/Unicorn's own species is stubbed (`spec/progression.md#starter-species-are-stubs`),
// so a placeholder `speciesId` string stands in below (never a real Species grouping,
// never drawn from a biome spawn pool). `rarity` is likewise a required SpeciesCreature field
// that is mechanically meaningless here (starters/the Unicorn are never rarity-weighted-drawn);
// set to 'rare' as a flavor-only placeholder.
//
// Exact base stats (10-30 per `spec/creatures.md#core-stats`) are parked balance, picked only
// to satisfy each starter's qualitative high-stat description (`specializations/brute.md#starter-cragfang-mauler`,
// `specializations/shieldbarer.md#starter-stonehorn-warden`, `specializations/sorcerer.md#starter-glyphmoth-seer`) --
// not derived from any design number.
//
// Each affinity is set in its entry's content doc: the three starters' in the specialization docs
// above, the Unicorn's (Vitality) in `content/overgrowth.md#unicorn-lightbearer`. Each starter's
// affinity matches its high stat through the soft affinity-to-stat correspondence
// (`spec/creatures.md#affinity`).

import type { SpeciesCreature } from '../../engine/generation'
import {
  SORCERER_STARTER_TRAIT,
  BRUTE_STARTER_TRAIT,
  SHIELDBARER_STARTER_TRAIT,
  UNICORN_TRAIT,
} from '../traits'

// ---- Sorcerer starter ----
// Wit affinity, high Intelligence (`specializations/sorcerer.md#starter-glyphmoth-seer`). Its own
// signature trait (SORCERER_STARTER_TRAIT) and innate spell (ARCANE_BOLT) live in the library --
// see `../traits`/`../spells`.

export const SORCERER_STARTER: SpeciesCreature = {
  id: 'sorcerer-starter',
  // A placeholder name -- the Sorcerer starter's real species
  // (`spec/progression.md#starter-species-are-stubs`) is authored in a later biome; this stands in until then.
  name: 'Glyphmoth Seer',
  affinity: 'wit',
  baseStats: { health: 33, attack: 10, intelligence: 30, defence: 10, speed: 20 },
  defaultScriptId: 'caster',
  innateTraitIds: [SORCERER_STARTER_TRAIT.id],
  rarity: 'rare',
  // Arcane Bolt is granted by
  // SORCERER_STARTER_TRAIT's own `innate-spell` effect, which `createCombat`'s fight-setup prepends
  // ahead of this creature's regular gem slots (`spec/creatures.md#innate-spells`). Those slots
  // hold the set rolled when the starter was granted (`spec/creatures.md#player-gem-sets`), so it
  // fights with Arcane Bolt at index 0 and its stored gems after it -- immediately castable by the
  // `caster` role, which casts a random castable gem every turn.
}

export const SORCERER_STARTER_SPECIES_ID = 'sorcerer-starter-species'

// ---- Brute starter ----
// High Attack; its trait makes Attack execute twice at 100%
// (`specializations/brute.md#starter-cragfang-mauler`). A direct, content-level exercise of the
// action instance-list model -- no new resolver logic needed. Its signature trait
// (BRUTE_STARTER_TRAIT) lives in the library -- see `../traits`.

export const BRUTE_STARTER: SpeciesCreature = {
  id: 'brute-starter',
  // A placeholder name -- see SORCERER_STARTER's own comment.
  name: 'Cragfang Mauler',
  affinity: 'violence',
  baseStats: { health: 33, attack: 30, intelligence: 10, defence: 15, speed: 15 },
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
  // A placeholder name -- see SORCERER_STARTER's own comment.
  name: 'Stonehorn Warden',
  affinity: 'endurance',
  baseStats: { health: 39, attack: 15, intelligence: 10, defence: 30, speed: 10 },
  // 'warden', not 'taunter' ("always: Provoke"): taunter provokes every turn, so it never attacks.
  defaultScriptId: 'warden',
  innateTraitIds: [SHIELDBARER_STARTER_TRAIT.id],
  rarity: 'rare',
}

export const SHIELDBARER_STARTER_SPECIES_ID = 'shieldbarer-starter-species'

// ---- The Unicorn ----
// Unique, permanent intro-helper party member (`content/overgrowth.md#unicorn-lightbearer`);
// joins via the scripted-intro encounter, a run-layer concern -- this file only authors the
// creature content itself. Its signature trait (UNICORN_TRAIT) lives in the library -- see
// `../traits`.

export const UNICORN: SpeciesCreature = {
  id: 'unicorn',
  // A placeholder name -- see SORCERER_STARTER's own comment.
  name: 'Unicorn Lightbearer',
  affinity: 'vitality',
  baseStats: { health: 39, attack: 15, intelligence: 15, defence: 15, speed: 20 },
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
