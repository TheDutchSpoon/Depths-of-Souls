// Phase 4 Slice H2: Glimmerdark (floors 11-20, GAME_DESIGN §4's decade cadence / ASSUMPTION 29)
// -- Biome 2's real roster, against `.claude/species/species-locked.md`'s own table, built
// entirely on primitives already proven through Slice E2 (no new engine work needed -- verified
// while authoring: `acted-before-target`'s own real-content shape is a new SCRIPT, not a new
// primitive; see `data/traits/glimmerdark.ts`'s Blindclaws Striker doc comment).
//
// Same enabler/payoff/amplifier (common/uncommon/rare) framing as Overgrowth, except where
// species-locked.md names one shared mechanic instead of a two-role chain (Resonants, Gloomjaws)
// -- see `data/traits/glimmerdark.ts`'s own per-species doc comments.
//
// ASSUMPTION (Slice H2, mirrors H1's own): exact base stats (10-30/stat) and every percent/factor
// balance number are parked balance (GAME_DESIGN §13), picked only to be flavorful and internally
// consistent. species-locked.md's own "Coverage" note for this biome: "Vitality absent at species
// level -- resolved by sprinkling Vitality creatures into these species at stamping (agreed)" --
// applied here to Glowflies' Radiant and Sparkeaters' Voidmaw (both amplifiers).
//
// Composition ONLY (Species/SpeciesCreature/BiomeData + boss data) -- Trait/Spell objects live in
// the central `../traits`/`../spells` library (CONVENTIONS "Data layer -- carriers vs.
// composition"), same as `../species/overgrowth.ts`.

import { createBiomeId } from '../../engine/ids'
import type { Affinity } from '../../engine/types'
import type { BiomeData, Species, SpeciesCreature } from '../../engine/generation'
import {
  AFTERGLOW,
  BEACON_CHARGE,
  BLINDING_FLARE,
  DISORIENT,
  LUMINOUS_TIDE,
  OVERCHARGE,
} from '../spells'
import {
  BLINDCLAWS_SETTER_TRAIT,
  BLINDCLAWS_STRIKER_TRAIT,
  BLINDCLAWS_VANGUARD_TRAIT,
  GLOOMJAW_EXECUTIONER_TRAIT,
  GLOOMJAW_RAVAGER_TRAIT,
  GLOOMJAW_STALKER_TRAIT,
  GLOWFLY_CHARGER_TRAIT,
  GLOWFLY_DETONATOR_TRAIT,
  GLOWFLY_RADIANT_TRAIT,
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

// ---- Glimmerdark's own authored spells (6 of the ~20-spell global total) ----
// Phase 4 interstitial slice (cumulative spell unlock): H2 originally authored 10 here (a
// near-complete reskinned kit); 9 were deleted as exact-or-near reskins of Overgrowth spells
// once unlock became cumulative (see data/spells/glimmerdark.ts's own header comment for the
// full list). Five new spells were added to meet the design owner's >=4-5-own-spells-per-biome
// bar (GAME_DESIGN §4). This grouping is no longer fed into `BiomeData` (see overgrowth.ts's own
// comment on the same change) -- kept purely as "the spells this biome introduces" documentation,
// every entry here tagged `unlockedAtBiome: 2`.

export const GLIMMERDARK_SPELLS = [
  BEACON_CHARGE,
  OVERCHARGE,
  DISORIENT,
  BLINDING_FLARE,
  AFTERGLOW,
  LUMINOUS_TIDE,
]

// ---- Glowflies (Wit/Instinct lean) -- closed mechanic: Charge & release (Glow + consume-stacks) ----

export const GLOWFLY_CHARGER: SpeciesCreature = {
  id: 'glowfly-charger',
  affinity: 'wit',
  baseStats: { health: 14, attack: 14, intelligence: 20, defence: 10, speed: 22 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [GLOWFLY_CHARGER_TRAIT.id],
  rarity: 'common',
}

export const GLOWFLY_DETONATOR: SpeciesCreature = {
  id: 'glowfly-detonator',
  affinity: 'instinct',
  baseStats: { health: 14, attack: 16, intelligence: 22, defence: 10, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [GLOWFLY_DETONATOR_TRAIT.id],
  rarity: 'uncommon',
}

/** Coverage sprinkle (Vitality -- see file header). */
export const GLOWFLY_RADIANT: SpeciesCreature = {
  id: 'glowfly-radiant',
  affinity: 'vitality',
  baseStats: { health: 18, attack: 12, intelligence: 22, defence: 12, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [GLOWFLY_RADIANT_TRAIT.id],
  rarity: 'rare',
}

export const GLOWFLIES_SPECIES_ID = 'glowflies'
export const GLOWFLIES: Species = {
  id: GLOWFLIES_SPECIES_ID,
  name: 'Glowflies',
  weight: 1,
  creatures: [GLOWFLY_CHARGER, GLOWFLY_DETONATOR, GLOWFLY_RADIANT],
}

// ---- Blindclaws (Instinct lean) -- closed mechanic: ambush via turn order ----

export const BLINDCLAWS_SETTER: SpeciesCreature = {
  id: 'blindclaws-setter',
  affinity: 'instinct',
  baseStats: { health: 16, attack: 18, intelligence: 10, defence: 12, speed: 24 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [BLINDCLAWS_SETTER_TRAIT.id],
  rarity: 'common',
}

export const BLINDCLAWS_STRIKER: SpeciesCreature = {
  id: 'blindclaws-striker',
  affinity: 'instinct',
  baseStats: { health: 14, attack: 24, intelligence: 10, defence: 10, speed: 26 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [BLINDCLAWS_STRIKER_TRAIT.id],
  rarity: 'uncommon',
}

export const BLINDCLAWS_VANGUARD: SpeciesCreature = {
  id: 'blindclaws-vanguard',
  affinity: 'instinct',
  baseStats: { health: 16, attack: 22, intelligence: 10, defence: 14, speed: 24 },
  defaultScriptId: 'always-attack',
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

/** The biome's one cast-role creature (defaultScriptId 'always-cast') -- exercises
 * generateFloor's real spell-loadout roll against the cumulative-unlocked wit-affinity pool
 * (every biome-1 wit spell plus GLIMMERDARK_SPELLS' own wit entries -- see
 * engine/generation.ts's spellsUnlockedAt). */
export const RESONANT_CHORUS: SpeciesCreature = {
  id: 'resonant-chorus',
  affinity: 'wit',
  baseStats: { health: 16, attack: 10, intelligence: 24, defence: 12, speed: 18 },
  defaultScriptId: 'always-cast',
  innateTraitIds: [RESONANT_CHORUS_TRAIT.id],
  rarity: 'common',
}

export const RESONANT_ADEPT: SpeciesCreature = {
  id: 'resonant-adept',
  affinity: 'wit',
  baseStats: { health: 16, attack: 10, intelligence: 26, defence: 12, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [RESONANT_ADEPT_TRAIT.id],
  rarity: 'uncommon',
}

export const RESONANT_OVERTONE: SpeciesCreature = {
  id: 'resonant-overtone',
  affinity: 'wit',
  baseStats: { health: 18, attack: 12, intelligence: 26, defence: 12, speed: 18 },
  defaultScriptId: 'always-attack',
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

// ---- Sparkeaters (Wit/Violence lean per species-locked.md) -- closed mechanic: stat parasites ----
// PR #60 review (C2): per-creature affinity stamped to match the stat each one steals, not the
// species-level lean -- see traits/glimmerdark.ts's own header comment for the full rationale.

export const SPARKEATER_LEECH: SpeciesCreature = {
  id: 'sparkeater-leech',
  // PR #60 review (C2): affinity now matches the stat it steals (CLAUDE.md's affinity->stat
  // soft-mapping) -- Attack -> violence.
  affinity: 'violence',
  baseStats: { health: 16, attack: 18, intelligence: 16, defence: 12, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPARKEATER_LEECH_TRAIT.id],
  rarity: 'common',
}

export const SPARKEATER_GORGER: SpeciesCreature = {
  id: 'sparkeater-gorger',
  // PR #60 review (C2): Defence -> endurance.
  affinity: 'endurance',
  baseStats: { health: 18, attack: 20, intelligence: 12, defence: 16, speed: 14 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPARKEATER_GORGER_TRAIT.id],
  rarity: 'uncommon',
}

/** Coverage sprinkle (Vitality -- see file header). */
export const SPARKEATER_VOIDMAW: SpeciesCreature = {
  id: 'sparkeater-voidmaw',
  affinity: 'vitality',
  baseStats: { health: 20, attack: 20, intelligence: 14, defence: 16, speed: 16 },
  defaultScriptId: 'always-attack',
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

// ---- Gloomjaws (Violence lean) -- execute the weak, via three distinct verbs (PR #60 review,
// C4 -- see traits/glimmerdark.ts's own header comment) ----

export const GLOOMJAW_STALKER: SpeciesCreature = {
  id: 'gloomjaw-stalker',
  affinity: 'violence',
  baseStats: { health: 16, attack: 22, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [GLOOMJAW_STALKER_TRAIT.id],
  rarity: 'common',
}

export const GLOOMJAW_EXECUTIONER: SpeciesCreature = {
  id: 'gloomjaw-executioner',
  affinity: 'violence',
  baseStats: { health: 16, attack: 24, intelligence: 10, defence: 14, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [GLOOMJAW_EXECUTIONER_TRAIT.id],
  rarity: 'uncommon',
}

export const GLOOMJAW_RAVAGER: SpeciesCreature = {
  id: 'gloomjaw-ravager',
  affinity: 'violence',
  baseStats: { health: 18, attack: 26, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'always-attack',
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
  affinity: 'endurance',
  baseStats: { health: 22, attack: 12, intelligence: 12, defence: 24, speed: 10 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SHELLBACK_WARDEN_TRAIT.id],
  rarity: 'common',
}

/** Low Attack on purpose -- Shell Fist reads its Attack action off its (high) Defence instead,
 * via stat-remap; a high Attack base would double-count the identity. */
export const SHELLBACK_BRAWLER: SpeciesCreature = {
  id: 'shellback-brawler',
  affinity: 'endurance',
  baseStats: { health: 20, attack: 10, intelligence: 10, defence: 28, speed: 12 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SHELLBACK_BRAWLER_TRAIT.id],
  rarity: 'uncommon',
}

export const SHELLBACK_BULWARK: SpeciesCreature = {
  id: 'shellback-bulwark',
  affinity: 'endurance',
  baseStats: { health: 24, attack: 12, intelligence: 12, defence: 26, speed: 10 },
  defaultScriptId: 'always-defend',
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
  GLOWFLIES,
  BLINDCLAWS,
  RESONANTS,
  SPARKEATERS,
  GLOOMJAWS,
  SHELLBACKS,
]

// ---- Boss (floor 20): the Leech Sovereign ----
// species-locked.md: "Fast steal-race ... Every hit steals a stat (permanent -you/+it, same as
// Sparkeaters); you hollow out over time -- answer is raw burst. Lean identity (no heavy add
// layer)." Deliberately no `_ADDS` export (unlike the Broodmother) -- the design doc explicitly
// calls out this boss as lean, single-mechanic, no add layer.
//
// ASSUMPTION (Slice H2, scope boundary -- mirrors H1's own): the actual boss-encounter RUNNER
// (assembling the fight, awarding perk points on first clear) is still not built by any slice
// (Slice G's store only ships recordBossKill/bossesCleared as state) -- this slice only authors
// the boss as content: her stats and her signature trait.

export const LEECH_SOVEREIGN: SpeciesCreature = {
  id: 'leech-sovereign',
  affinity: 'instinct',
  baseStats: { health: 30, attack: 26, intelligence: 20, defence: 20, speed: 22 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [LEECH_SOVEREIGN_TRAIT.id],
  rarity: 'rare', // mechanically meaningless -- never spawn-pool-drawn, see the ASSUMPTION above
}

export const LEECH_SOVEREIGN_BOSS_ID = 'leech-sovereign'

// ---- The biome itself ----

export const GLIMMERDARK_BIOME_ID = createBiomeId('glimmerdark')

export const GLIMMERDARK_BIOME: BiomeData = {
  id: GLIMMERDARK_BIOME_ID,
  name: 'Glimmerdark',
  speciesPool: GLIMMERDARK_SPECIES_POOL,
}

// Re-exported for the loader test / anyone wanting a plain Affinity sanity check without
// importing every creature const individually.
export const GLIMMERDARK_AFFINITIES: readonly Affinity[] =
  GLIMMERDARK_SPECIES_POOL.flatMap((s) => s.creatures.map((c) => c.affinity))
