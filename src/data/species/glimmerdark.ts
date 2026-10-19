// Glimmerdark (floors 11-20, `spec/run.md#biomes`'s decade cadence)
// -- Biome 2's real roster, against `content/glimmerdark.md#glimmerdark-biome-2-floors-1120`'s own
// table, built entirely on primitives the engine already has (no new engine work needed:
// `acted-before-target`'s real-content shape is a new SCRIPT, not a new primitive; see
// `data/traits/glimmerdark.ts`'s Blindclaws Striker doc comment).
//
// Same enabler/payoff/amplifier (common/uncommon/rare) framing as Overgrowth, except where
// `content/glimmerdark.md#resonants-wit-caster-synergy` names one shared mechanic instead of a
// two-role chain (Resonants, Gloomjaws) -- see `data/traits/glimmerdark.ts`'s own per-species doc
// comments.
//
// Exact base stats (10-30/stat) and every percent/factor balance number are parked balance
// (`OPEN_QUESTIONS.md#content-numbers`), picked only to be flavorful and internally consistent.
// Affinity is stamped per creature (`spec/creatures.md#affinity`): the biome's 2 Vitality
// creatures (`content/glimmerdark.md#affinity-spread`), the Flickerlings' Wick and Sparkeaters'
// Voidmaw, sit in species that lean elsewhere.
//
// Composition ONLY (Species/SpeciesCreature/BiomeData + boss data) -- Trait/Spell objects live in
// the central `../traits`/`../spells` library (`CONVENTIONS.md#composition-files-only-reference-carriers`), same as `../species/overgrowth.ts`.

import { createBiomeId } from '../../engine/ids'
import type { Affinity } from '../../engine/types'
import type {
  BiomeData,
  BossEncounter,
  Species,
  SpeciesCreature,
} from '../../engine/generation'
import {
  AFTERGLOW,
  BEACON_CHARGE,
  BLINDING_FLARE,
  DISORIENT,
  KINDRED_LIGHT,
} from '../spells'
import {
  BLINDCLAWS_SETTER_TRAIT,
  BLINDCLAWS_STRIKER_TRAIT,
  BLINDCLAWS_VANGUARD_TRAIT,
  FLICKERLING_FLARE_TRAIT,
  FLICKERLING_LAST_GLEAM_TRAIT,
  FLICKERLING_WICK_TRAIT,
  GLOOMJAW_EXECUTIONER_TRAIT,
  GLOOMJAW_RAVAGER_TRAIT,
  GLOOMJAW_STALKER_TRAIT,
  LEECH_SOVEREIGN_TRAIT,
  RESONANT_ADEPT_TRAIT,
  RESONANT_CHORUS_TRAIT,
  RESONANT_OVERTONE_TRAIT,
  SHELLBACK_BRAWLER_TRAIT,
  SHELLBACK_BULWARK_TRAIT,
  SHELLBACK_WARDEN_TRAIT,
  SPARKEATER_GORGER_TRAIT,
  SPARKEATER_LEECH_TRAIT,
  SPARKEATER_VOIDMAW_TRAIT,
} from '../traits'

// ---- Glimmerdark's own authored spells ----
// This grouping is documentation only: `generateFloor`
// rolls from the global spell registry (`spec/run.md#spells-unlock-cumulatively`), not from biome
// data. Every entry here is tagged `unlockedAtBiome: 2`.

export const GLIMMERDARK_SPELLS = [
  BEACON_CHARGE,
  DISORIENT,
  BLINDING_FLARE,
  AFTERGLOW,
  KINDRED_LIGHT,
]

// ---- Flickerlings (Vitality/Wit/Violence) -- closed mechanic: the flame that feeds on itself ----
// Their Health (38 / 25 / 28) is on the 20-45 scale. Every number is parked balance.

export const FLICKERLING_WICK: SpeciesCreature = {
  id: 'flickerling-wick',
  name: 'Flickerling Wick',
  affinity: 'vitality',
  baseStats: { health: 38, attack: 10, intelligence: 16, defence: 14, speed: 16 },
  defaultScriptId: 'support',
  innateTraitIds: [FLICKERLING_WICK_TRAIT.id],
  rarity: 'common',
}

export const FLICKERLING_FLARE: SpeciesCreature = {
  id: 'flickerling-flare',
  name: 'Flickerling Flare',
  affinity: 'wit',
  baseStats: { health: 25, attack: 14, intelligence: 22, defence: 10, speed: 22 },
  defaultScriptId: 'caster',
  innateTraitIds: [FLICKERLING_FLARE_TRAIT.id],
  rarity: 'uncommon',
}

export const FLICKERLING_LAST_GLEAM: SpeciesCreature = {
  id: 'flickerling-last-gleam',
  name: 'Flickerling Last Gleam',
  affinity: 'violence',
  baseStats: { health: 28, attack: 24, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'striker',
  innateTraitIds: [FLICKERLING_LAST_GLEAM_TRAIT.id],
  rarity: 'rare',
}

export const FLICKERLINGS_SPECIES_ID = 'flickerlings'
export const FLICKERLINGS: Species = {
  id: FLICKERLINGS_SPECIES_ID,
  name: 'Flickerlings',
  weight: 1,
  creatures: [FLICKERLING_WICK, FLICKERLING_FLARE, FLICKERLING_LAST_GLEAM],
}

// ---- Blindclaws (Instinct lean) -- closed mechanic: ambush via turn order ----

export const BLINDCLAWS_SETTER: SpeciesCreature = {
  id: 'blindclaws-setter',
  name: 'Blindclaws Setter',
  affinity: 'instinct',
  baseStats: { health: 28, attack: 18, intelligence: 10, defence: 12, speed: 24 },
  defaultScriptId: 'opener',
  innateTraitIds: [BLINDCLAWS_SETTER_TRAIT.id],
  rarity: 'common',
}

export const BLINDCLAWS_STRIKER: SpeciesCreature = {
  id: 'blindclaws-striker',
  name: 'Blindclaws Striker',
  affinity: 'instinct',
  baseStats: { health: 25, attack: 24, intelligence: 10, defence: 10, speed: 26 },
  defaultScriptId: 'striker',
  innateTraitIds: [BLINDCLAWS_STRIKER_TRAIT.id],
  rarity: 'uncommon',
}

export const BLINDCLAWS_VANGUARD: SpeciesCreature = {
  id: 'blindclaws-vanguard',
  name: 'Blindclaws Vanguard',
  affinity: 'instinct',
  baseStats: { health: 28, attack: 22, intelligence: 10, defence: 14, speed: 24 },
  defaultScriptId: 'striker',
  innateTraitIds: [BLINDCLAWS_VANGUARD_TRAIT.id],
  rarity: 'rare',
}

export const BLINDCLAWS_SPECIES_ID = 'blindclaws'
export const BLINDCLAWS: Species = {
  id: BLINDCLAWS_SPECIES_ID,
  name: 'Blindclaws',
  weight: 1,
  creatures: [BLINDCLAWS_SETTER, BLINDCLAWS_STRIKER, BLINDCLAWS_VANGUARD],
}

// ---- Resonants (Wit lean) -- closed mechanic: caster synergy (on-action-observed) ----

/** A `caster` Resonant (wit affinity): its gem set rolls from the cumulative-unlocked wit-affinity
 * pool (every biome-1 wit spell plus GLIMMERDARK_SPELLS' own wit entries -- see
 * engine/generation.ts's spellsUnlockedAt), as every enemy's does. */
export const RESONANT_CHORUS: SpeciesCreature = {
  id: 'resonant-chorus',
  name: 'Resonant Chorus',
  affinity: 'wit',
  baseStats: { health: 28, attack: 10, intelligence: 24, defence: 12, speed: 18 },
  defaultScriptId: 'caster',
  innateTraitIds: [RESONANT_CHORUS_TRAIT.id],
  rarity: 'common',
}

export const RESONANT_ADEPT: SpeciesCreature = {
  id: 'resonant-adept',
  name: 'Resonant Adept',
  affinity: 'wit',
  baseStats: { health: 28, attack: 10, intelligence: 26, defence: 12, speed: 18 },
  defaultScriptId: 'caster',
  innateTraitIds: [RESONANT_ADEPT_TRAIT.id],
  rarity: 'uncommon',
}

export const RESONANT_OVERTONE: SpeciesCreature = {
  id: 'resonant-overtone',
  name: 'Resonant Overtone',
  affinity: 'wit',
  baseStats: { health: 30, attack: 12, intelligence: 26, defence: 12, speed: 18 },
  defaultScriptId: 'caster',
  innateTraitIds: [RESONANT_OVERTONE_TRAIT.id],
  rarity: 'rare',
}

export const RESONANTS_SPECIES_ID = 'resonants'
export const RESONANTS: Species = {
  id: RESONANTS_SPECIES_ID,
  name: 'Resonants',
  weight: 1,
  creatures: [RESONANT_CHORUS, RESONANT_ADEPT, RESONANT_OVERTONE],
}

// ---- Sparkeaters (Wit/Violence lean per `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites`) -- closed mechanic: stat parasites ----
// Per-creature affinity is stamped to match the stat each one steals, not the
// species-level lean -- see traits/glimmerdark.ts's own header comment for the full rationale.

export const SPARKEATER_LEECH: SpeciesCreature = {
  id: 'sparkeater-leech',
  name: 'Sparkeater Leech',
  // Affinity matches the stat it steals (the soft affinity->stat mapping,
  // `spec/creatures.md#affinity`) -- Attack -> violence.
  affinity: 'violence',
  baseStats: { health: 28, attack: 18, intelligence: 16, defence: 12, speed: 18 },
  defaultScriptId: 'striker',
  innateTraitIds: [SPARKEATER_LEECH_TRAIT.id],
  rarity: 'common',
}

export const SPARKEATER_GORGER: SpeciesCreature = {
  id: 'sparkeater-gorger',
  name: 'Sparkeater Gorger',
  // Defence -> endurance.
  affinity: 'endurance',
  baseStats: { health: 30, attack: 20, intelligence: 12, defence: 16, speed: 14 },
  defaultScriptId: 'striker',
  innateTraitIds: [SPARKEATER_GORGER_TRAIT.id],
  rarity: 'uncommon',
}

/** Coverage sprinkle (Vitality -- see file header). */
export const SPARKEATER_VOIDMAW: SpeciesCreature = {
  id: 'sparkeater-voidmaw',
  name: 'Sparkeater Voidmaw',
  affinity: 'vitality',
  baseStats: { health: 33, attack: 20, intelligence: 14, defence: 16, speed: 16 },
  defaultScriptId: 'striker',
  innateTraitIds: [SPARKEATER_VOIDMAW_TRAIT.id],
  rarity: 'rare',
}

export const SPARKEATERS_SPECIES_ID = 'sparkeaters'
export const SPARKEATERS: Species = {
  id: SPARKEATERS_SPECIES_ID,
  name: 'Sparkeaters',
  weight: 1,
  creatures: [SPARKEATER_LEECH, SPARKEATER_GORGER, SPARKEATER_VOIDMAW],
}

// ---- Gloomjaws (Violence lean) -- execute the weak, via three distinct verbs (see
// traits/glimmerdark.ts's own header comment) ----

export const GLOOMJAW_STALKER: SpeciesCreature = {
  id: 'gloomjaw-stalker',
  name: 'Gloomjaw Stalker',
  affinity: 'violence',
  baseStats: { health: 28, attack: 22, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'opener',
  innateTraitIds: [GLOOMJAW_STALKER_TRAIT.id],
  rarity: 'common',
}

export const GLOOMJAW_EXECUTIONER: SpeciesCreature = {
  id: 'gloomjaw-executioner',
  name: 'Gloomjaw Executioner',
  affinity: 'violence',
  baseStats: { health: 28, attack: 24, intelligence: 10, defence: 14, speed: 20 },
  defaultScriptId: 'striker',
  innateTraitIds: [GLOOMJAW_EXECUTIONER_TRAIT.id],
  rarity: 'uncommon',
}

export const GLOOMJAW_RAVAGER: SpeciesCreature = {
  id: 'gloomjaw-ravager',
  name: 'Gloomjaw Ravager',
  affinity: 'violence',
  baseStats: { health: 30, attack: 26, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'striker',
  innateTraitIds: [GLOOMJAW_RAVAGER_TRAIT.id],
  rarity: 'rare',
}

export const GLOOMJAWS_SPECIES_ID = 'gloomjaws'
export const GLOOMJAWS: Species = {
  id: GLOOMJAWS_SPECIES_ID,
  name: 'Gloomjaws',
  weight: 1,
  creatures: [GLOOMJAW_STALKER, GLOOMJAW_EXECUTIONER, GLOOMJAW_RAVAGER],
}

// ---- Shellbacks (Endurance lean) -- closed mechanic: armor-as-weapon ----

export const SHELLBACK_WARDEN: SpeciesCreature = {
  id: 'shellback-warden',
  name: 'Shellback Warden',
  affinity: 'endurance',
  baseStats: { health: 35, attack: 12, intelligence: 12, defence: 24, speed: 10 },
  defaultScriptId: 'warden',
  innateTraitIds: [SHELLBACK_WARDEN_TRAIT.id],
  rarity: 'common',
}

/** Low Attack on purpose -- Shell Fist reads its Attack action off its (high) Defence instead,
 * via stat-remap; a high Attack base would double-count the identity. */
export const SHELLBACK_BRAWLER: SpeciesCreature = {
  id: 'shellback-brawler',
  name: 'Shellback Brawler',
  affinity: 'endurance',
  baseStats: { health: 33, attack: 10, intelligence: 10, defence: 28, speed: 12 },
  defaultScriptId: 'striker',
  innateTraitIds: [SHELLBACK_BRAWLER_TRAIT.id],
  rarity: 'uncommon',
}

export const SHELLBACK_BULWARK: SpeciesCreature = {
  id: 'shellback-bulwark',
  name: 'Shellback Bulwark',
  affinity: 'endurance',
  baseStats: { health: 38, attack: 12, intelligence: 12, defence: 26, speed: 10 },
  defaultScriptId: 'warden',
  innateTraitIds: [SHELLBACK_BULWARK_TRAIT.id],
  rarity: 'rare',
}

export const SHELLBACKS_SPECIES_ID = 'shellbacks'
export const SHELLBACKS: Species = {
  id: SHELLBACKS_SPECIES_ID,
  name: 'Shellbacks',
  weight: 1,
  creatures: [SHELLBACK_WARDEN, SHELLBACK_BRAWLER, SHELLBACK_BULWARK],
}

// ---- Biome-wide registries ----

export const GLIMMERDARK_SPECIES_POOL: readonly Species[] = [
  FLICKERLINGS,
  BLINDCLAWS,
  RESONANTS,
  SPARKEATERS,
  GLOOMJAWS,
  SHELLBACKS,
]

// ---- Boss (floor 20): the Leech Sovereign ----
// `content/glimmerdark.md#leech-sovereign`: a lean, single-mechanic boss with no add layer, so
// deliberately no `_ADDS` export (unlike the Broodmother).
//
// The boss floor itself (materializing her on floor 20, banking rewards, recording bossesCleared)
// is wired through `BiomeData.boss` below -- see
// `generation.ts`'s `generateFloor` boss branch and `spec/run.md#boss-floor-generation`.

export const LEECH_SOVEREIGN: SpeciesCreature = {
  id: 'leech-sovereign',
  name: 'Leech Sovereign',
  affinity: 'instinct',
  baseStats: { health: 45, attack: 26, intelligence: 20, defence: 20, speed: 22 },
  defaultScriptId: 'striker',
  innateTraitIds: [LEECH_SOVEREIGN_TRAIT.id],
  rarity: 'rare', // mechanically meaningless -- never spawn-pool-drawn, an authored boss encounter
}

export const LEECH_SOVEREIGN_BOSS_ID = 'leech-sovereign'

/** Wires the Leech Sovereign into `GLIMMERDARK_BIOME.boss`.
 * `speciesId` is her OWN id -- unlike the Broodmother, she has no natural species (no shared
 * roster members to count alongside), and `adds` is empty (lean by design, per the doc comment
 * above). */
export const GLIMMERDARK_BOSS: BossEncounter = {
  bossId: LEECH_SOVEREIGN_BOSS_ID,
  creature: LEECH_SOVEREIGN,
  speciesId: LEECH_SOVEREIGN.id,
  adds: [],
}

// ---- The biome itself ----

export const GLIMMERDARK_BIOME_ID = createBiomeId('glimmerdark')

export const GLIMMERDARK_BIOME: BiomeData = {
  id: GLIMMERDARK_BIOME_ID,
  name: 'Glimmerdark',
  speciesPool: GLIMMERDARK_SPECIES_POOL,
  boss: GLIMMERDARK_BOSS,
}

// Re-exported for the loader test / anyone wanting a plain Affinity sanity check without
// importing every creature const individually.
export const GLIMMERDARK_AFFINITIES: readonly Affinity[] =
  GLIMMERDARK_SPECIES_POOL.flatMap((s) => s.creatures.map((c) => c.affinity))
