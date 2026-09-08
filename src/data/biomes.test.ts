import { describe, expect, it } from 'vitest'
import { BIOMES, BIOMES_BY_ID } from './biomes'

// Slice A ships the SHAPE only -- 10 placeholder slots, empty spawn pools. Real content lands
// per-biome in Slices H1 (biome-1)/H2 (biome-2)/H3 (biome-3); this test only pins the shape
// every slot must keep so those slices can safely replace one entry without disturbing the rest.

describe('BIOMES (Slice A placeholder shape)', () => {
  it('ships exactly 10 slots (GAME_DESIGN §4 decade cadence)', () => {
    expect(BIOMES).toHaveLength(10)
  })

  it('every slot has a unique id and a valid-but-empty spawn pool shape', () => {
    const ids = new Set(BIOMES.map((biome) => biome.id))
    expect(ids.size).toBe(10)
    for (const biome of BIOMES) {
      expect(biome.speciesPool).toEqual([])
      expect(biome.spellPool).toEqual([])
    }
  })

  it('BIOMES_BY_ID indexes every slot by its id', () => {
    for (const biome of BIOMES) {
      expect(BIOMES_BY_ID.get(biome.id)).toBe(biome)
    }
  })
})
