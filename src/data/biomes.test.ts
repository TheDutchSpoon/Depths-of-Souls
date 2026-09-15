import { describe, expect, it } from 'vitest'
import { BIOMES, BIOMES_BY_ID } from './biomes'
import { OVERGROWTH_BIOME_ID } from './species/overgrowth'

// Slice A shipped the SHAPE only -- 10 placeholder slots, empty spawn pools. Slice H1 replaces
// slot 1 (floors 1-10) with real The Overgrowth content; H2/H3 will replace slots 2/3 the same
// way. This test now pins the POST-H1 shape: slot 1 real + non-empty, slots 2-10 still the
// placeholder shape every later slice can safely replace one entry of without disturbing the rest.

describe('BIOMES (Slice A shape + Slice H1 real content)', () => {
  it('ships exactly 10 slots (GAME_DESIGN §4 decade cadence)', () => {
    expect(BIOMES).toHaveLength(10)
  })

  it('every slot has a unique id', () => {
    const ids = new Set(BIOMES.map((biome) => biome.id))
    expect(ids.size).toBe(10)
  })

  it('slot 1 (floors 1-10) is the real Overgrowth biome, non-empty', () => {
    const overgrowth = BIOMES[0]
    expect(overgrowth?.id).toBe(OVERGROWTH_BIOME_ID)
    expect(overgrowth?.speciesPool.length).toBeGreaterThan(0)
    expect(overgrowth?.spellPool.length).toBeGreaterThan(0)
  })

  it('slots 2-10 keep the Slice A placeholder shape (empty spawn pools)', () => {
    for (const biome of BIOMES.slice(1)) {
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
