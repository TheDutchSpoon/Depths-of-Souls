import { createBiomeId } from '../engine/ids'
import { BIOME_COUNT, type BiomeData } from '../engine/generation'
import { OVERGROWTH_BIOME } from './species/overgrowth'
import { GLIMMERDARK_BIOME } from './species/glimmerdark'

// Phase 4 Slice A ships the SHAPE only: 10 fixed biome slots (GAME_DESIGN §4's decade
// cadence), each a valid-shape, empty spawn pool. Slice H1 replaced slot 1 (floors 1-10) with
// real The Overgrowth content; Slice H2 replaces slot 2 (floors 11-20) with real Glimmerdark
// content; H3 will replace slot 3 the same way. Biomes 4-10 stay this placeholder shape through
// v1 (no content authored past floor 30 yet -- see Slice I). Never touch an existing slot's `id`
// -- biomeForFloor's fixed 1-100 sequence is positional (array index = floor decade).

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
  ...Array.from({ length: BIOME_COUNT - 2 }, (_, index) => placeholderBiome(index + 3)),
]

export const BIOMES_BY_ID: ReadonlyMap<string, BiomeData> = new Map(
  BIOMES.map((biome) => [biome.id, biome]),
)
