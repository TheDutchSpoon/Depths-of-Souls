import { createBiomeId } from '../engine/ids'
import { BIOME_COUNT, type BiomeData } from '../engine/generation'
import { OVERGROWTH_BIOME } from './species/overgrowth'

// Phase 4 Slice A ships the SHAPE only: 10 fixed biome slots (GAME_DESIGN §4's decade
// cadence), each a valid-shape, empty spawn pool. Slice H1 replaces slot 1 (floors 1-10) with
// real The Overgrowth content; H2/H3 will replace slots 2/3 the same way. Biomes 4-10 stay this
// placeholder shape through v1 (no content authored past floor 30 yet -- see Slice I). Never
// touch an existing slot's `id` -- biomeForFloor's fixed 1-100 sequence is positional (array
// index = floor decade).

function placeholderBiome(slot: number): BiomeData {
  return {
    id: createBiomeId(`biome-${slot}`),
    name: `Biome ${slot} (unauthored)`,
    speciesPool: [],
    spellPool: [],
  }
}

export const BIOMES: readonly BiomeData[] = [
  OVERGROWTH_BIOME,
  ...Array.from({ length: BIOME_COUNT - 1 }, (_, index) => placeholderBiome(index + 2)),
]

export const BIOMES_BY_ID: ReadonlyMap<string, BiomeData> = new Map(
  BIOMES.map((biome) => [biome.id, biome]),
)
