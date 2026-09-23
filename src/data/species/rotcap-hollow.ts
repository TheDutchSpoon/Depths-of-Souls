// Phase 4 Slice H3: Rotcap Hollow (floors 21-30, GAME_DESIGN §4's decade cadence / ASSUMPTION
// 29) -- Biome 3's real roster, against `.claude/species/species-locked.md`'s own table, built
// entirely on primitives already proven through Slice E2/H2 (no new engine work needed for any
// TRAIT here -- see traits/rotcap-hollow.ts's own header comment for the one genuinely new
// piece, Spore's `random-ally-without-status` target, which lives in data/statuses.ts, not a
// species trait).
//
// Six species x three creatures each (18 total), following species-locked.md's own "roles ...
// enabler / payoff / amplifier" framing, except Necromoss (like Resonants, H2) shares ONE
// mechanic across all three creatures, escalating scope/strength by rarity.
//
// ASSUMPTION (Slice H3, mirrors H1/H2's own): exact base stats (10-30/stat) and every
// percent/factor balance number are parked balance (GAME_DESIGN §13), picked only to be
// flavorful and internally consistent. Per-creature affinity mostly follows species-locked.md's
// own dual leans (Necromoss: Wit/Vitality, Hollowkin: Endurance/Instinct, Sporch: Violence/Wit),
// with two content-review revisions off the family default: Rotfeeder Gorgemaw is Vitality (its
// identity is HP growth, not a raw Violence hit) and Myconet Rotcore is Wit (its identity is a
// Poison-application death-burst, not a raw Endurance tank trick) -- see each creature's own
// doc comment. All 5 affinities remain present across the 18 creatures (7 Wit / 4 Violence /
// 4 Endurance / 2 Vitality / 1 Instinct) without needing any extra coverage-sprinkle creature
// (unlike H1/H2, whose single-lean species needed one).
//
// Composition ONLY (Species/SpeciesCreature/BiomeData + boss data) -- Trait/Spell objects live in
// the central `../traits`/`../spells` library (CONVENTIONS "Data layer -- carriers vs.
// composition"), same as `../species/overgrowth.ts`/`../species/glimmerdark.ts`.

import { createBiomeId } from '../../engine/ids'
import type { Affinity } from '../../engine/types'
import type { BiomeData, Species, SpeciesCreature } from '../../engine/generation'
import {
  CHARNEL_FEAST,
  PUPPET_STRING,
  RASPING_CHANT,
  SPORE_CYST,
  WITHERING_BOLT,
} from '../spells'
import {
  HOLLOWKIN_MARIONETTE_TRAIT,
  HOLLOWKIN_PUPPETEER_TRAIT,
  HOLLOWKIN_WRETCH_TRAIT,
  MYCONET_GRAVEDIGGER_TRAIT,
  MYCONET_ROTCORE_TRAIT,
  MYCONET_WARDER_TRAIT,
  NECROMOSS_HOLLOWROOT_TRAIT,
  NECROMOSS_THICKET_TRAIT,
  NECROMOSS_WISP_TRAIT,
  ROT_SOVEREIGN_TRAIT,
  ROTFEEDER_GORGEMAW_TRAIT,
  ROTFEEDER_RIPPER_TRAIT,
  ROTFEEDER_SCAVENGER_TRAIT,
  SPORCH_ASHBORN_TRAIT,
  SPORCH_CINDERLORD_TRAIT,
  SPORCH_IGNITER_TRAIT,
  SPORECLOUD_BLOOMER_TRAIT,
  SPORECLOUD_REAPER_TRAIT,
  SPORECLOUD_SEEDER_TRAIT,
} from '../traits'

// ---- Rotcap Hollow's own authored spells (5 of the ~22-spell global total) ----
// Phase 4 interstitial slice (cumulative spell unlock, extended to H3 from the start -- see
// data/spells/glimmerdark.ts's own header comment for why H2 needed a correction pass H3 never
// triggers): this grouping is no longer fed into `BiomeData` -- kept purely as "the spells this
// biome introduces" documentation, every entry here tagged `unlockedAtBiome: 3`.

export const ROTCAP_HOLLOW_SPELLS = [
  SPORE_CYST,
  RASPING_CHANT,
  PUPPET_STRING,
  CHARNEL_FEAST,
  WITHERING_BOLT,
]

// ---- Sporecloud (Wit) -- closed mechanic: Contagion (Spore) ----

export const SPORECLOUD_SEEDER: SpeciesCreature = {
  id: 'sporecloud-seeder',
  affinity: 'wit',
  baseStats: { health: 14, attack: 16, intelligence: 20, defence: 10, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPORECLOUD_SEEDER_TRAIT.id],
  rarity: 'common',
}

export const SPORECLOUD_REAPER: SpeciesCreature = {
  id: 'sporecloud-reaper',
  affinity: 'wit',
  baseStats: { health: 14, attack: 14, intelligence: 22, defence: 10, speed: 20 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPORECLOUD_REAPER_TRAIT.id],
  rarity: 'uncommon',
}

export const SPORECLOUD_BLOOMER: SpeciesCreature = {
  id: 'sporecloud-bloomer',
  affinity: 'wit',
  baseStats: { health: 16, attack: 14, intelligence: 24, defence: 12, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPORECLOUD_BLOOMER_TRAIT.id],
  rarity: 'rare',
}

export const SPORECLOUD_SPECIES_ID = 'sporecloud'
export const SPORECLOUD: Species = {
  id: SPORECLOUD_SPECIES_ID,
  name: 'Sporecloud',
  weight: 1,
  creatures: [SPORECLOUD_SEEDER, SPORECLOUD_REAPER, SPORECLOUD_BLOOMER],
}

// ---- Rotfeeders (Violence lean) -- closed mechanic: Carrion snowball ----

export const ROTFEEDER_SCAVENGER: SpeciesCreature = {
  id: 'rotfeeder-scavenger',
  affinity: 'violence',
  baseStats: { health: 16, attack: 20, intelligence: 10, defence: 14, speed: 16 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [ROTFEEDER_SCAVENGER_TRAIT.id],
  rarity: 'common',
}

export const ROTFEEDER_RIPPER: SpeciesCreature = {
  id: 'rotfeeder-ripper',
  affinity: 'violence',
  baseStats: { health: 18, attack: 22, intelligence: 10, defence: 14, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [ROTFEEDER_RIPPER_TRAIT.id],
  rarity: 'uncommon',
}

/** Content-review revision: Vitality instead of Violence -- Gorgemaw's identity is HP growth
 * ("grows fatter off its kills"), which reads as Vitality (CLAUDE.md's affinity->stat
 * soft-mapping) more than the family's default Violence lean. */
export const ROTFEEDER_GORGEMAW: SpeciesCreature = {
  id: 'rotfeeder-gorgemaw',
  affinity: 'vitality',
  baseStats: { health: 22, attack: 20, intelligence: 10, defence: 16, speed: 14 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [ROTFEEDER_GORGEMAW_TRAIT.id],
  rarity: 'rare',
}

export const ROTFEEDERS_SPECIES_ID = 'rotfeeders'
export const ROTFEEDERS: Species = {
  id: ROTFEEDERS_SPECIES_ID,
  name: 'Rotfeeders',
  weight: 1,
  creatures: [ROTFEEDER_SCAVENGER, ROTFEEDER_RIPPER, ROTFEEDER_GORGEMAW],
}

// ---- Myconet (Endurance lean) -- closed mechanic: Death-network ----

export const MYCONET_WARDER: SpeciesCreature = {
  id: 'myconet-warder',
  affinity: 'endurance',
  baseStats: { health: 20, attack: 12, intelligence: 12, defence: 22, speed: 12 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [MYCONET_WARDER_TRAIT.id],
  rarity: 'common',
}

/** Content-review revision: Wit instead of Endurance -- Rotcore's identity is a Poison-application
 * death-burst (a status effect, not a raw stat/tank trick), which reads as Wit (CLAUDE.md's
 * affinity->stat soft-mapping) more than the family's default Endurance lean. */
export const MYCONET_ROTCORE: SpeciesCreature = {
  id: 'myconet-rotcore',
  affinity: 'wit',
  baseStats: { health: 22, attack: 14, intelligence: 12, defence: 22, speed: 10 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [MYCONET_ROTCORE_TRAIT.id],
  rarity: 'uncommon',
}

export const MYCONET_GRAVEDIGGER: SpeciesCreature = {
  id: 'myconet-gravedigger',
  affinity: 'endurance',
  baseStats: { health: 24, attack: 12, intelligence: 14, defence: 24, speed: 10 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [MYCONET_GRAVEDIGGER_TRAIT.id],
  rarity: 'rare',
}

export const MYCONET_SPECIES_ID = 'myconet'
export const MYCONET: Species = {
  id: MYCONET_SPECIES_ID,
  name: 'Myconet',
  weight: 1,
  creatures: [MYCONET_WARDER, MYCONET_ROTCORE, MYCONET_GRAVEDIGGER],
}

// ---- Necromoss (Wit/Vitality) -- closed mechanic: Reclaim (grim sustain, one shared mechanic) ----

export const NECROMOSS_WISP: SpeciesCreature = {
  id: 'necromoss-wisp',
  affinity: 'wit',
  baseStats: { health: 18, attack: 10, intelligence: 20, defence: 12, speed: 16 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [NECROMOSS_WISP_TRAIT.id],
  rarity: 'common',
}

export const NECROMOSS_THICKET: SpeciesCreature = {
  id: 'necromoss-thicket',
  affinity: 'vitality',
  baseStats: { health: 24, attack: 10, intelligence: 16, defence: 18, speed: 10 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [NECROMOSS_THICKET_TRAIT.id],
  rarity: 'uncommon',
}

/** The biome's one cast-role creature (defaultScriptId 'always-cast') -- its trait fires on
 * on-turn-start regardless of the chosen action, so casting never blunts it; exercises
 * generateFloor's real spell-loadout roll against the cumulative-unlocked wit-affinity pool. */
export const NECROMOSS_HOLLOWROOT: SpeciesCreature = {
  id: 'necromoss-hollowroot',
  affinity: 'wit',
  baseStats: { health: 20, attack: 10, intelligence: 22, defence: 14, speed: 14 },
  defaultScriptId: 'always-cast',
  innateTraitIds: [NECROMOSS_HOLLOWROOT_TRAIT.id],
  rarity: 'rare',
}

export const NECROMOSS_SPECIES_ID = 'necromoss'
export const NECROMOSS: Species = {
  id: NECROMOSS_SPECIES_ID,
  name: 'Necromoss',
  weight: 1,
  creatures: [NECROMOSS_WISP, NECROMOSS_THICKET, NECROMOSS_HOLLOWROOT],
}

// ---- Hollowkin (Endurance/Instinct) -- closed mechanic: Puppet (Confusion) ----

export const HOLLOWKIN_WRETCH: SpeciesCreature = {
  id: 'hollowkin-wretch',
  affinity: 'endurance',
  baseStats: { health: 20, attack: 14, intelligence: 12, defence: 20, speed: 14 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [HOLLOWKIN_WRETCH_TRAIT.id],
  rarity: 'common',
}

export const HOLLOWKIN_MARIONETTE: SpeciesCreature = {
  id: 'hollowkin-marionette',
  affinity: 'instinct',
  baseStats: { health: 16, attack: 18, intelligence: 14, defence: 12, speed: 22 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [HOLLOWKIN_MARIONETTE_TRAIT.id],
  rarity: 'uncommon',
}

export const HOLLOWKIN_PUPPETEER: SpeciesCreature = {
  id: 'hollowkin-puppeteer',
  affinity: 'endurance',
  baseStats: { health: 20, attack: 16, intelligence: 12, defence: 20, speed: 16 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [HOLLOWKIN_PUPPETEER_TRAIT.id],
  rarity: 'rare',
}

export const HOLLOWKIN_SPECIES_ID = 'hollowkin'
export const HOLLOWKIN: Species = {
  id: HOLLOWKIN_SPECIES_ID,
  name: 'Hollowkin',
  weight: 1,
  creatures: [HOLLOWKIN_WRETCH, HOLLOWKIN_MARIONETTE, HOLLOWKIN_PUPPETEER],
}

// ---- Sporch (Violence/Wit) -- closed mechanic: Strong non-spreading Burn ----

export const SPORCH_IGNITER: SpeciesCreature = {
  id: 'sporch-igniter',
  affinity: 'violence',
  baseStats: { health: 16, attack: 20, intelligence: 12, defence: 14, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPORCH_IGNITER_TRAIT.id],
  rarity: 'common',
}

export const SPORCH_ASHBORN: SpeciesCreature = {
  id: 'sporch-ashborn',
  affinity: 'wit',
  baseStats: { health: 16, attack: 14, intelligence: 20, defence: 12, speed: 18 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPORCH_ASHBORN_TRAIT.id],
  rarity: 'uncommon',
}

export const SPORCH_CINDERLORD: SpeciesCreature = {
  id: 'sporch-cinderlord',
  affinity: 'violence',
  baseStats: { health: 18, attack: 22, intelligence: 12, defence: 16, speed: 16 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [SPORCH_CINDERLORD_TRAIT.id],
  rarity: 'rare',
}

export const SPORCH_SPECIES_ID = 'sporch'
export const SPORCH: Species = {
  id: SPORCH_SPECIES_ID,
  name: 'Sporch',
  weight: 1,
  creatures: [SPORCH_IGNITER, SPORCH_ASHBORN, SPORCH_CINDERLORD],
}

// ---- Biome-wide registries ----

export const ROTCAP_HOLLOW_SPECIES_POOL: readonly Species[] = [
  SPORECLOUD,
  ROTFEEDERS,
  MYCONET,
  NECROMOSS,
  HOLLOWKIN,
  SPORCH,
]

// ---- Boss (floor 30): the Rot Sovereign ----
// species-locked.md: "Attrition-management (finale) ... Grows via count-scaling off deaths (any
// creature that dies feeds it) + blankets the party in spreading Spore. Puzzle = don't-feed-it +
// out-manage the rot, not pure DPS." Adds drawn from this biome's own spawn pool (the
// fixed-authored-encounter path, same mechanism as the Unicorn's scripted intro and the
// Broodmother/Leech Sovereign before her) -- Sporecloud Seeder (keeps infecting the party with
// Spore alongside her own blanket) and Rotfeeder Scavenger (a body that feeds the "any creature
// that dies" half of her own growth when it falls), both real Rotcap Hollow roster members.
//
// ASSUMPTION (Slice H3, scope boundary -- mirrors H1/H2's own): the actual boss-encounter RUNNER
// is still not built by any slice (Slice G's store only ships recordBossKill/bossesCleared as
// STATE) -- this slice only authors the boss as content: her stats, her signature trait, and her
// adds.

export const ROT_SOVEREIGN: SpeciesCreature = {
  id: 'rot-sovereign',
  affinity: 'endurance',
  baseStats: { health: 30, attack: 22, intelligence: 20, defence: 26, speed: 16 },
  defaultScriptId: 'always-attack',
  innateTraitIds: [ROT_SOVEREIGN_TRAIT.id],
  rarity: 'rare', // mechanically meaningless -- never spawn-pool-drawn, see the ASSUMPTION above
}

/** The adds accompanying her fight -- real Rotcap Hollow roster members, per the boss-authoring
 * checklist's "adds drawn from the biome's own spawn pool" (species-locked.md names no specific
 * pair for this boss, unlike the Broodmother's explicit "spiderlings"). */
export const ROT_SOVEREIGN_ADDS: readonly SpeciesCreature[] = [
  SPORECLOUD_SEEDER,
  ROTFEEDER_SCAVENGER,
]

export const ROT_SOVEREIGN_BOSS_ID = 'rot-sovereign'

// ---- The biome itself ----

export const ROTCAP_HOLLOW_BIOME_ID = createBiomeId('rotcap-hollow')

export const ROTCAP_HOLLOW_BIOME: BiomeData = {
  id: ROTCAP_HOLLOW_BIOME_ID,
  name: 'Rotcap Hollow',
  speciesPool: ROTCAP_HOLLOW_SPECIES_POOL,
}

// Re-exported for the loader test / anyone wanting a plain Affinity sanity check without
// importing every creature const individually.
export const ROTCAP_HOLLOW_AFFINITIES: readonly Affinity[] =
  ROTCAP_HOLLOW_SPECIES_POOL.flatMap((s) => s.creatures.map((c) => c.affinity))
