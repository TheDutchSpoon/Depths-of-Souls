import { createBiomeId } from '../engine/ids'
import { BIOME_COUNT, type BiomeData } from '../engine/generation'

// Phase 4 Slice A ships the SHAPE only: 10 fixed biome slots (GAME_DESIGN §4's decade
// cadence), each a valid-shape, empty spawn pool. Slices H1/H2/H3 replace biome-1/biome-2/
// biome-3's entries with real The Overgrowth / Glimmerdark / Rotcap Hollow content; biomes
// 4-10 stay this placeholder shape through v1 (no content authored past floor 30 yet -- see
// Slice I). Never touch an existing slot's `id` -- biomeForFloor's fixed 1-100 sequence is
// positional (array index = floor decade).

function placeholderBiome(slot: number): BiomeData {
  return {
    id: createBiomeId(`biome-${slot}`),
    name: `Biome ${slot} (unauthored)`,
    speciesPool: [],
    spellPool: [],
  }
}

export const BIOMES: readonly BiomeData[] = Array.from(
  { length: BIOME_COUNT },
  (_, index) => placeholderBiome(index + 1),
)

export const BIOMES_BY_ID: ReadonlyMap<string, BiomeData> = new Map(
  BIOMES.map((biome) => [biome.id, biome]),
)
