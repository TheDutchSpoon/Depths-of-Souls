import { describe, expect, it } from 'vitest'
import { BIOMES, BIOMES_BY_ID } from './biomes'
import { OVERGROWTH_BIOME_ID } from './species/overgrowth'
import { GLIMMERDARK_BIOME_ID } from './species/glimmerdark'

// Slice A shipped the SHAPE only -- 10 placeholder slots, empty spawn pools. Slice H1 replaced
// slot 1 (floors 1-10) with real The Overgrowth content; Slice H2 replaces slot 2 (floors 11-20)
// with real Glimmerdark content; H3 will replace slot 3 the same way. This test now pins the
// POST-H2 shape: slots 1-2 real + non-empty, slots 3-10 still the placeholder shape every later
// slice can safely replace one entry of without disturbing the rest.

describe('BIOMES (Slice A shape + Slice H1/H2 real content)', () => {
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

  it('slot 2 (floors 11-20) is the real Glimmerdark biome, non-empty', () => {
    const glimmerdark = BIOMES[1]
    expect(glimmerdark?.id).toBe(GLIMMERDARK_BIOME_ID)
    expect(glimmerdark?.speciesPool.length).toBeGreaterThan(0)
    expect(glimmerdark?.spellPool.length).toBeGreaterThan(0)
  })

  it('slots 3-10 keep the Slice A placeholder shape (empty spawn pools)', () => {
    for (const biome of BIOMES.slice(2)) {
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
