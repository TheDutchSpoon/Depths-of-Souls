// Phase 4 Slice H1: The Overgrowth (floors 1-10, GAME_DESIGN §4's decade cadence / ASSUMPTION
// 29) -- Biome 1's real roster, against `.claude/species/species-locked.md`'s own table, built
// entirely on primitives already proven through Slice E2 (no new engine work needed -- per the
// project's own "stop and amend the relevant earlier slice" discipline, confirmed while
// authoring: nothing here needed anything not already built).
//
// Six species x three creatures each (18 total), following species-locked.md's own "roles ...
// enabler / payoff / amplifier" framing uniformly: the common creature ENABLES its species'
// closed mechanic (creates the status/sets up the condition), the uncommon creature is the
// PAYOFF (benefits from it), and the rare creature is an AMPLIFIER (usually combines both halves
// or scales harder). Per the locked design principle ("rarity governs spawn-frequency + soul-gain
// only, NOT power"), each creature's own stat BUDGET is kept comparable across a species'
// rarity tiers -- only the role differs, never raw strength.
//
// ASSUMPTION (Slice H1): exact base stats (10-30/stat, GAME_DESIGN §5) and every percent/factor
// balance number are parked balance (GAME_DESIGN §13), picked only to be flavorful and
// internally consistent -- not derived from any locked design number. Per-creature affinity
// deliberately departs from a species' own "lean" in a few places (documented inline) per
// species-locked.md's own "Coverage" note: "balance at creature-stamping (affinity is
// per-creature)" -- Endurance/Instinct are thin at the LEAN level across this biome's table, so
// individual creatures are stamped into those affinities to round out the full 5-affinity spread.
//
// This file is COMPOSITION ONLY (Species/SpeciesCreature/BiomeData + boss data) -- the actual
// Trait/Spell object definitions live in the central `../traits`/`../spells` library, the same
// place every other trait/spell/status in the game lives (matching how Web/Sleep already live in
// `../statuses`, not here). `../traits` and `../spells` are themselves grouping directories --
// see the data-layer carrier reorg phase record. `../species/starters.ts` was retrofit to the
// same composition-only shape in that same reorg (it used to define its own trait/spell consts
// inline).

import { createBiomeId } from '../../engine/ids'
import type { Affinity } from '../../engine/types'
import type {
  BiomeData,
  BossEncounter,
  Species,
  SpeciesCreature,
} from '../../engine/generation'
import {
  ARCANE_BOLT,
  BRAMBLE_WARD,
  HOWLING_INSTINCT,
  POLLEN_CLOUD,
  REGROWTH,
  ROOT_GRASP,
  STINGER_SWARM,
  THORN_LASH,
  VINE_SNARE,
  WEAKENING_BITE,
  WILD_VIGOR,
} from '../spells'
import {
  BROODMOTHER_TRAIT,
  LULLPOLLEN_DOZER_TRAIT,
  LULLPOLLEN_REAPER_TRAIT,
  LULLPOLLEN_SLEEPER_TRAIT,
  POLLINATOR_BENEFICIARY_TRAIT,
  POLLINATOR_DUSTER_TRAIT,
  POLLINATOR_POLLENLORD_TRAIT,
  SNAPJAW_IRONJAW_TRAIT,
  SNAPJAW_JAWS_TRAIT,
  SNAPJAW_LURE_TRAIT,
  SPIDER_AMBUSHER_TRAIT,
  SPIDER_BROODWARDEN_TRAIT,
  SPIDER_WEAVER_TRAIT,
  SWARMHIVE_DRONE_TRAIT,
  SWARMHIVE_QUEEN_TRAIT,
  SWARMHIVE_STRIKER_TRAIT,
  TREANT_ELDER_TRAIT,
  TREANT_GROVEKEEP_TRAIT,
  TREANT_SAPLING_TRAIT,
} from '../traits'

// ---- Overgrowth's own authored spells (11 of the ~17-spell global total) ----
// The Spell object definitions themselves live in data/spells/ (the library). Phase 4
// interstitial slice (cumulative spell unlock): this grouping is no longer fed into
// `BiomeData` (that field, `spellPool`, is gone -- `generateFloor` now rolls a cast-role
// loadout from the GLOBAL `ALL_SPELLS` registry, filtered by `unlockedAtBiome`, see
// engine/generation.ts's `spellsUnlockedAt`); it's kept purely as a documentation/test grouping
// of "the spells this biome introduces" (every entry here is tagged `unlockedAtBiome: 1`).
// Includes ARCANE_BOLT (data-layer carrier reorg: promoted from Sorcerer-starter-only to a
// normal Wit pool spell), giving Wit a third entry here while every other affinity keeps two.

export const OVERGROWTH_SPELLS = [
  THORN_LASH,
  WEAKENING_BITE,
  VINE_SNARE,
  POLLEN_CLOUD,
  ARCANE_BOLT,
  ROOT_GRASP,
  BRAMBLE_WARD,
  REGROWTH,
  WILD_VIGOR,
  STINGER_SWARM,
  HOWLING_INSTINCT,
]

// ---- Spiders (Wit lean) -- closed mechanic: Trap -> exploit (Web) ----

export const SPIDER_WEAVER: SpeciesCreature = {
  id: 'spider-weaver',
  affinity: 'wit',
  baseStats: { health: 14, attack: 18, intelligence: 20, defence: 12, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPIDER_WEAVER_TRAIT.id],
  rarity: 'common',
}

export const SPIDER_AMBUSHER: SpeciesCreature = {
  id: 'spider-ambusher',
  affinity: 'wit',
  baseStats: { health: 14, attack: 22, intelligence: 18, defence: 12, speed: 22 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPIDER_AMBUSHER_TRAIT.id],
  rarity: 'uncommon',
}

/** Coverage sprinkle (Instinct -- see file header). */
export const SPIDER_BROODWARDEN: SpeciesCreature = {
  id: 'spider-broodwarden',
  affinity: 'instinct',
  baseStats: { health: 18, attack: 20, intelligence: 20, defence: 14, speed: 16 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPIDER_BROODWARDEN_TRAIT.id],
  rarity: 'rare',
}

export const SPIDERS_SPECIES_ID = 'spiders'
export const SPIDERS: Species = {
  id: SPIDERS_SPECIES_ID,
  name: 'Spiders',
  weight: 1,
  creatures: [SPIDER_WEAVER, SPIDER_AMBUSHER, SPIDER_BROODWARDEN],
}

// ---- Swarmhive (Violence lean) -- closed mechanic: strength in numbers (count-scaling) ----

export const SWARMHIVE_DRONE: SpeciesCreature = {
  id: 'swarmhive-drone',
  affinity: 'violence',
  baseStats: { health: 16, attack: 18, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SWARMHIVE_DRONE_TRAIT.id],
  rarity: 'common',
}

export const SWARMHIVE_STRIKER: SpeciesCreature = {
  id: 'swarmhive-striker',
  affinity: 'violence',
  baseStats: { health: 16, attack: 22, intelligence: 10, defence: 14, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SWARMHIVE_STRIKER_TRAIT.id],
  rarity: 'uncommon',
}

/** Coverage sprinkle (Endurance -- the anchor's tankiness fits it thematically too). */
export const SWARMHIVE_QUEEN: SpeciesCreature = {
  id: 'swarmhive-queen',
  affinity: 'endurance',
  baseStats: { health: 22, attack: 18, intelligence: 12, defence: 22, speed: 12 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SWARMHIVE_QUEEN_TRAIT.id],
  rarity: 'rare',
}

export const SWARMHIVE_SPECIES_ID = 'swarmhive'
export const SWARMHIVE: Species = {
  id: SWARMHIVE_SPECIES_ID,
  name: 'Swarmhive',
  weight: 1,
  creatures: [SWARMHIVE_DRONE, SWARMHIVE_STRIKER, SWARMHIVE_QUEEN],
}

// ---- Treants (Vitality/Endurance lean) -- closed mechanic: a Health engine that grows over time ----

export const TREANT_SAPLING: SpeciesCreature = {
  id: 'treant-sapling',
  affinity: 'vitality',
  baseStats: { health: 26, attack: 12, intelligence: 14, defence: 16, speed: 10 },
  defaultScriptId: 'always-defend',
  innateTraitIds: [TREANT_SAPLING_TRAIT.id],
  rarity: 'common',
}

export const TREANT_ELDER: SpeciesCreature = {
  id: 'treant-elder',
  affinity: 'endurance',
  baseStats: { health: 28, attack: 12, intelligence: 18, defence: 20, speed: 10 },
  defaultScriptId: 'always-defend',
  innateTraitIds: [TREANT_ELDER_TRAIT.id],
  rarity: 'uncommon',
}

export const TREANT_GROVEKEEP: SpeciesCreature = {
  id: 'treant-grovekeep',
  affinity: 'vitality',
  baseStats: { health: 30, attack: 14, intelligence: 16, defence: 20, speed: 10 },
  defaultScriptId: 'always-defend',
  innateTraitIds: [TREANT_GROVEKEEP_TRAIT.id],
  rarity: 'rare',
}

export const TREANTS_SPECIES_ID = 'treants'
export const TREANTS: Species = {
  id: TREANTS_SPECIES_ID,
  name: 'Treants',
  weight: 1,
  creatures: [TREANT_SAPLING, TREANT_ELDER, TREANT_GROVEKEEP],
}

// ---- Pollinators (Wit/Vitality lean) -- closed mechanic: a team-buff engine (non-health) ----

export const POLLINATOR_DUSTER: SpeciesCreature = {
  id: 'pollinator-duster',
  affinity: 'vitality',
  baseStats: { health: 18, attack: 12, intelligence: 18, defence: 12, speed: 22 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [POLLINATOR_DUSTER_TRAIT.id],
  rarity: 'common',
}

export const POLLINATOR_BENEFICIARY: SpeciesCreature = {
  id: 'pollinator-beneficiary',
  affinity: 'wit',
  baseStats: { health: 16, attack: 16, intelligence: 20, defence: 12, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [POLLINATOR_BENEFICIARY_TRAIT.id],
  rarity: 'uncommon',
}

/** The biome's one cast-role creature (defaultScriptId 'always-cast') -- exercises
 * generateFloor's real spell-loadout roll against OVERGROWTH_SPELLS' wit-affinity entries. */
export const POLLINATOR_POLLENLORD: SpeciesCreature = {
  id: 'pollinator-pollenlord',
  affinity: 'wit',
  baseStats: { health: 16, attack: 10, intelligence: 26, defence: 12, speed: 22 },
  defaultScriptId: 'always-cast',
  innateTraitIds: [POLLINATOR_POLLENLORD_TRAIT.id],
  rarity: 'rare',
}

export const POLLINATORS_SPECIES_ID = 'pollinators'
export const POLLINATORS: Species = {
  id: POLLINATORS_SPECIES_ID,
  name: 'Pollinators',
  weight: 1,
  creatures: [POLLINATOR_DUSTER, POLLINATOR_BENEFICIARY, POLLINATOR_POLLENLORD],
}

// ---- Snapjaws (Violence/Endurance lean) -- closed mechanic: bait & punish ----

export const SNAPJAW_LURE: SpeciesCreature = {
  id: 'snapjaw-lure',
  affinity: 'endurance',
  baseStats: { health: 22, attack: 14, intelligence: 10, defence: 24, speed: 14 },
  defaultScriptId: 'always-provoke',
  innateTraitIds: [SNAPJAW_LURE_TRAIT.id],
  rarity: 'common',
}

export const SNAPJAW_JAWS: SpeciesCreature = {
  id: 'snapjaw-jaws',
  affinity: 'violence',
  baseStats: { health: 18, attack: 24, intelligence: 10, defence: 18, speed: 14 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SNAPJAW_JAWS_TRAIT.id],
  rarity: 'uncommon',
}

export const SNAPJAW_IRONJAW: SpeciesCreature = {
  id: 'snapjaw-ironjaw',
  affinity: 'violence',
  baseStats: { health: 20, attack: 22, intelligence: 10, defence: 22, speed: 12 },
  // Its own trait fires on-turn-start regardless of chosen action (unlike the old provoke-gated
  // shape) -- attacks while it ramps, rather than tying up a turn provoking.
  defaultScriptId: 'always-attack',
  innateTraitIds: [SNAPJAW_IRONJAW_TRAIT.id],
  rarity: 'rare',
}

export const SNAPJAWS_SPECIES_ID = 'snapjaws'
export const SNAPJAWS: Species = {
  id: SNAPJAWS_SPECIES_ID,
  name: 'Snapjaws',
  weight: 1,
  creatures: [SNAPJAW_LURE, SNAPJAW_JAWS, SNAPJAW_IRONJAW],
}

// ---- Lullpollen (Wit/Instinct lean) -- closed mechanic: Sleep & punish ----

export const LULLPOLLEN_SLEEPER: SpeciesCreature = {
  id: 'lullpollen-sleeper',
  affinity: 'wit',
  baseStats: { health: 16, attack: 16, intelligence: 20, defence: 12, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [LULLPOLLEN_SLEEPER_TRAIT.id],
  rarity: 'common',
}

export const LULLPOLLEN_REAPER: SpeciesCreature = {
  id: 'lullpollen-reaper',
  affinity: 'instinct',
  baseStats: { health: 16, attack: 20, intelligence: 16, defence: 12, speed: 22 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [LULLPOLLEN_REAPER_TRAIT.id],
  rarity: 'uncommon',
}

export const LULLPOLLEN_DOZER: SpeciesCreature = {
  id: 'lullpollen-dozer',
  affinity: 'instinct',
  baseStats: { health: 18, attack: 18, intelligence: 18, defence: 14, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [LULLPOLLEN_DOZER_TRAIT.id],
  rarity: 'rare',
}

export const LULLPOLLEN_SPECIES_ID = 'lullpollen'
export const LULLPOLLEN: Species = {
  id: LULLPOLLEN_SPECIES_ID,
  name: 'Lullpollen',
  weight: 1,
  creatures: [LULLPOLLEN_SLEEPER, LULLPOLLEN_REAPER, LULLPOLLEN_DOZER],
}

// ---- Biome-wide registries ----

export const OVERGROWTH_SPECIES_POOL: readonly Species[] = [
  SPIDERS,
  SWARMHIVE,
  TREANTS,
  POLLINATORS,
  SNAPJAWS,
  LULLPOLLEN,
]

// ---- Boss (floor 10): the Broodmother ----
// species-locked.md: "Target-priority ... Count-scales off living spiderling adds +
// periodically Webs the party (act-last). Kill adds to weaken her. Adds: spiderlings (Spider
// pool)." An elevated Instance (not spawn-pool-drawn), sharing the Spiders' own speciesId so
// living-allies-of-species counts her together with her adds -- authored as DATA here (the
// SpeciesCreature + which real Spider-roster members serve as her adds; her signature trait,
// BROODMOTHER_TRAIT, lives in ../traits alongside every other trait), per the fixed-authored-
// encounter path (same mechanism as the Unicorn's scripted intro).
//
// The boss floor itself (materializing her + her adds on floor 10, banking rewards, recording
// bossesCleared) is wired through `BiomeData.boss` below (Phase 4 Slice I, PR #65 review) -- see
// `generation.ts`'s `generateFloor` boss branch and CONVENTIONS' "Boss floors". H1 authored her
// as data only and deliberately left the runner unbuilt (no such mechanism existed for ANY boss
// yet); that gap is what Slice I closes.

export const BROODMOTHER: SpeciesCreature = {
  id: 'broodmother',
  affinity: 'wit',
  baseStats: { health: 30, attack: 24, intelligence: 24, defence: 20, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [BROODMOTHER_TRAIT.id],
  rarity: 'rare', // mechanically meaningless -- never spawn-pool-drawn, an authored boss encounter
}

/** The spiderling adds accompanying her fight -- real Spider-roster members, per
 * species-locked.md's "adds: spiderlings (Spider pool)"; both already share SPIDERS_SPECIES_ID. */
export const BROODMOTHER_ADDS: readonly SpeciesCreature[] = [
  SPIDER_WEAVER,
  SPIDER_AMBUSHER,
]

export const BROODMOTHER_BOSS_ID = 'broodmother'

/** Phase 4 Slice I (PR #65 review): wires the Broodmother into `OVERGROWTH_BIOME.boss` --
 * `generateFloor`'s boss branch materializes her at `bossLevel(10)` plus her two adds, each
 * resolved against this biome's own `speciesPool` (`resolveAddSpeciesId`'s invariant check). */
export const OVERGROWTH_BOSS: BossEncounter = {
  bossId: BROODMOTHER_BOSS_ID,
  creature: BROODMOTHER,
  speciesId: SPIDERS_SPECIES_ID,
  adds: BROODMOTHER_ADDS,
}

// ---- The biome itself ----

export const OVERGROWTH_BIOME_ID = createBiomeId('overgrowth')

export const OVERGROWTH_BIOME: BiomeData = {
  id: OVERGROWTH_BIOME_ID,
  name: 'The Overgrowth',
  speciesPool: OVERGROWTH_SPECIES_POOL,
  boss: OVERGROWTH_BOSS,
}

// Re-exported for the loader test / anyone wanting a plain Affinity sanity check without
// importing every creature const individually.
export const OVERGROWTH_AFFINITIES: readonly Affinity[] = OVERGROWTH_SPECIES_POOL.flatMap(
  (s) => s.creatures.map((c) => c.affinity),
)
