import { createBiomeId } from '../engine/ids'
import { BIOME_COUNT, type BiomeData } from '../engine/generation'
import { OVERGROWTH_BIOME } from './species/overgrowth'
import { GLIMMERDARK_BIOME } from './species/glimmerdark'
import { ROTCAP_HOLLOW_BIOME } from './species/rotcap-hollow'

// 10 fixed biome slots (`spec/run.md#biomes`'s decade cadence). Biomes 1-3 (The Overgrowth,
// Glimmerdark, Rotcap Hollow) are real content; biomes 4-10 are each a valid-shape, empty spawn
// pool until their content is authored (v1 needs all 10 biomes). Never touch an existing slot's
// `id` -- biomeForFloor's fixed 1-100 sequence is positional (array index = floor decade).

function placeholderBiome(slot: number): BiomeData {
  return {
    id: createBiomeId(`biome-${slot}`),
    name: `Biome ${slot} (unauthored)`,
    speciesPool: [],
  }
}

export const BIOMES: readonly BiomeData[] = [
  OVERGROWTH_BIOME,
  GLIMMERDARK_BIOME,
  ROTCAP_HOLLOW_BIOME,
  ...Array.from({ length: BIOME_COUNT - 3 }, (_, index) => placeholderBiome(index + 4)),
]

export const BIOMES_BY_ID: ReadonlyMap<string, BiomeData> = new Map(
  BIOMES.map((biome) => [biome.id, biome]),
)
