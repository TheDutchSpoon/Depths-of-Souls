// Phase 4.1-A (G3): every real SpeciesCreature (starters, the Unicorn, every biome's spawn pool,
// every boss) has a non-empty, unique `name` -- the full display name, never assembled from the
// species name. Test-only fixtures (__fixtures__/*, other test files' inline literals) are
// exempt -- this scans only the real content registries.

import { describe, expect, it } from 'vitest'
import type { SpeciesCreature } from '../../engine/generation'
import { STARTERS } from './starters'
import { OVERGROWTH_BIOME } from './overgrowth'
import { GLIMMERDARK_BIOME } from './glimmerdark'
import { ROTCAP_HOLLOW_BIOME } from './rotcap-hollow'

const BIOMES = [OVERGROWTH_BIOME, GLIMMERDARK_BIOME, ROTCAP_HOLLOW_BIOME]

const ALL_REAL_CREATURES: readonly SpeciesCreature[] = [
  ...STARTERS,
  ...BIOMES.flatMap((biome) => biome.speciesPool.flatMap((species) => species.creatures)),
  ...BIOMES.flatMap((biome) => (biome.boss ? [biome.boss.creature] : [])),
]

describe('every real SpeciesCreature has a name (Phase 4.1-A, G3)', () => {
  it('ships the expected count: 4 starters/Unicorn + 54 biome creatures + 3 bosses = 61', () => {
    expect(ALL_REAL_CREATURES).toHaveLength(61)
  })

  it('every name is non-empty', () => {
    for (const creature of ALL_REAL_CREATURES) {
      expect(creature.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('every name is unique', () => {
    const names = ALL_REAL_CREATURES.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
