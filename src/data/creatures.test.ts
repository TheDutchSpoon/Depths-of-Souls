import { describe, expect, it } from 'vitest'
import { BIOMES } from './biomes'
import { ALL_CREATURE_TEMPLATES, BOSS_CREATURES_BY_ID } from './creatures'
import { STARTERS } from './species/starters'

describe('the creature templates', () => {
  it('lists the starters first, then each biome’s pool creatures, then each biome’s boss', () => {
    const pool = BIOMES.flatMap((biome) =>
      biome.speciesPool.flatMap((species) => species.creatures),
    )
    const bosses = BIOMES.flatMap((biome) => (biome.boss ? [biome.boss.creature] : []))
    expect(ALL_CREATURE_TEMPLATES).toEqual([...STARTERS, ...pool, ...bosses])
  })

  it('holds every biome’s boss creature in both exports', () => {
    const biomesWithBoss = BIOMES.filter((biome) => biome.boss !== undefined)
    expect(biomesWithBoss.length).toBeGreaterThan(0)
    expect(BOSS_CREATURES_BY_ID.size).toBe(biomesWithBoss.length)
    for (const biome of biomesWithBoss) {
      const boss = biome.boss!
      expect(ALL_CREATURE_TEMPLATES).toContain(boss.creature)
      expect(BOSS_CREATURES_BY_ID.get(boss.bossId)).toBe(boss.creature)
    }
  })
})
