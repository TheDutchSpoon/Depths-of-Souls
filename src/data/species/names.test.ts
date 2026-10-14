// Every real SpeciesCreature (starters, the Unicorn, every biome's spawn pool,
// every boss) has a non-empty, unique `name` -- the full display name, never assembled from the
// species name. Test-only fixtures (__fixtures__/*, other test files' inline literals) are
// exempt -- this scans only the real content registries.

import { describe, expect, it } from 'vitest'
import { ALL_CREATURE_TEMPLATES as ALL_REAL_CREATURES } from '../creatures'

describe('every real SpeciesCreature has a name', () => {
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
