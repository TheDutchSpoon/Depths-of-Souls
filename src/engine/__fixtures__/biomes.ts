// Test-only fixtures for generation.ts. Not real content -- see src/data/biomes.ts (Slice A
// placeholder shape) and src/data/species/ (real content, Slice H1-H3). Never imported by
// src/app or src/ui.

import { createBiomeId } from '../ids'
import {
  BIOME_COUNT,
  type BiomeData,
  type Species,
  type SpeciesCreature,
} from '../generation'
import type { Spell } from '../types'

const BASE_STATS = { health: 20, attack: 20, intelligence: 20, defence: 20, speed: 20 }

// A plain attack-role creature: no spells rolled, ever.
export const FIXTURE_BRUISER: SpeciesCreature = {
  id: 'fixture-bruiser',
  affinity: 'violence',
  baseStats: BASE_STATS,
  defaultScriptId: 'always-attack',
  innateTraitIds: [],
  rarity: 'common',
}

// A rare within its species -- exercises the rarity-weighted within-species draw.
export const FIXTURE_BRUISER_RARE: SpeciesCreature = {
  id: 'fixture-bruiser-rare',
  affinity: 'violence',
  baseStats: { ...BASE_STATS, attack: 26 },
  defaultScriptId: 'always-attack',
  innateTraitIds: ['fixture-trait'],
  rarity: 'rare',
}

// A cast-role creature: MUST be rolled >=1 affinity-matched (wit) spell.
export const FIXTURE_CASTER: SpeciesCreature = {
  id: 'fixture-caster',
  affinity: 'wit',
  baseStats: { ...BASE_STATS, intelligence: 24 },
  defaultScriptId: 'always-cast',
  innateTraitIds: [],
  rarity: 'common',
}

export const FIXTURE_SPECIES_BRAWLERS: Species = {
  id: 'fixture-species-brawlers',
  name: 'Fixture Brawlers',
  weight: 1,
  creatures: [FIXTURE_BRUISER, FIXTURE_BRUISER_RARE],
}

export const FIXTURE_SPECIES_CASTERS: Species = {
  id: 'fixture-species-casters',
  name: 'Fixture Casters',
  weight: 1,
  creatures: [FIXTURE_CASTER],
}

export const FIXTURE_WIT_BOLT: Spell = {
  id: 'fixture-wit-bolt',
  name: 'Fixture Wit Bolt',
  targetShape: 'single',
  spellPower: 0.4,
  affinity: 'wit',
  unlockedAtBiome: 1,
}

// Off-affinity for FIXTURE_CASTER -- proves the affinity gate actually filters, not just
// "picks something."
export const FIXTURE_VIOLENCE_BOLT: Spell = {
  id: 'fixture-violence-bolt',
  name: 'Fixture Violence Bolt',
  targetShape: 'single',
  spellPower: 0.4,
  affinity: 'violence',
  unlockedAtBiome: 1,
}

// unlockedAtBiome:2 -- proves the cumulative-unlock filter actually filters, not just "picks
// something": never reachable at biomeIndex 1, always in-pool (alongside FIXTURE_WIT_BOLT) at
// biomeIndex 2+.
export const FIXTURE_WIT_BOLT_TIER2: Spell = {
  id: 'fixture-wit-bolt-tier2',
  name: 'Fixture Wit Bolt (Tier 2)',
  targetShape: 'single',
  spellPower: 0.6,
  affinity: 'wit',
  unlockedAtBiome: 2,
}

/** The global spell registry a generateFloor call rolls a cast-role loadout from (Phase 4
 * interstitial slice: no longer a per-biome `spellPool` -- every biome shares one cumulative
 * list, filtered by `unlockedAtBiome <= biomeIndex` then by affinity). */
export const FIXTURE_ALL_SPELLS: readonly Spell[] = [
  FIXTURE_WIT_BOLT,
  FIXTURE_VIOLENCE_BOLT,
  FIXTURE_WIT_BOLT_TIER2,
]

/** A fully-populated fixture biome -- used by generateFloor tests. */
export const FIXTURE_BIOME: BiomeData = {
  id: createBiomeId('fixture-biome'),
  name: 'Fixture Biome',
  speciesPool: [FIXTURE_SPECIES_BRAWLERS, FIXTURE_SPECIES_CASTERS],
}

/** Ten distinct, otherwise-empty biomes -- used only by biomeForFloor's fixed-sequence tests
 * (never generateFloor, which needs FIXTURE_BIOME's populated pools). */
export const FIXTURE_BIOME_SEQUENCE: readonly BiomeData[] = Array.from(
  { length: BIOME_COUNT },
  (_, index) => ({
    id: createBiomeId(`fixture-sequence-biome-${index + 1}`),
    name: `Fixture Sequence Biome ${index + 1}`,
    speciesPool: [],
  }),
)
