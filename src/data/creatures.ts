import type { SpeciesCreature } from '../engine/generation'
import { BIOMES } from './biomes'
import { STARTERS } from './species/starters'

/** Every creature template the game ships: the starters and the Unicorn, then each biome's pool
 * creatures, then each biome's boss creature, in `BIOMES` order. A boss is in no species pool,
 * only in its biome's `boss`. */
export const ALL_CREATURE_TEMPLATES: readonly SpeciesCreature[] = [
  ...STARTERS,
  ...BIOMES.flatMap((biome) => biome.speciesPool.flatMap((species) => species.creatures)),
  ...BIOMES.flatMap((biome) => (biome.boss ? [biome.boss.creature] : [])),
]

/** Boss id to the boss's creature, for every biome with a boss. */
export const BOSS_CREATURES_BY_ID: ReadonlyMap<string, SpeciesCreature> = new Map(
  BIOMES.flatMap((biome) =>
    biome.boss ? [[biome.boss.bossId, biome.boss.creature] as const] : [],
  ),
)
