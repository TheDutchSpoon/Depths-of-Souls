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
}

// Off-affinity for FIXTURE_CASTER -- proves the affinity gate actually filters, not just
// "picks something."
export const FIXTURE_VIOLENCE_BOLT: Spell = {
  id: 'fixture-violence-bolt',
  name: 'Fixture Violence Bolt',
  targetShape: 'single',
  spellPower: 0.4,
  affinity: 'violence',
}

/** A fully-populated fixture biome -- used by generateFloor tests. */
export const FIXTURE_BIOME: BiomeData = {
  id: createBiomeId('fixture-biome'),
  name: 'Fixture Biome',
  speciesPool: [FIXTURE_SPECIES_BRAWLERS, FIXTURE_SPECIES_CASTERS],
  spellPool: [FIXTURE_WIT_BOLT, FIXTURE_VIOLENCE_BOLT],
}

/** Ten distinct, otherwise-empty biomes -- used only by biomeForFloor's fixed-sequence tests
 * (never generateFloor, which needs FIXTURE_BIOME's populated pools). */
export const FIXTURE_BIOME_SEQUENCE: readonly BiomeData[] = Array.from(
  { length: BIOME_COUNT },
  (_, index) => ({
    id: createBiomeId(`fixture-sequence-biome-${index + 1}`),
    name: `Fixture Sequence Biome ${index + 1}`,
    speciesPool: [],
    spellPool: [],
  }),
)
