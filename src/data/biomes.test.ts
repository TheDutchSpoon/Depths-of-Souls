import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../engine/rng'
import { generateFloor } from '../engine/generation'
import { BIOMES, BIOMES_BY_ID } from './biomes'
import { ALL_SPELLS } from './spells'
import {
  BROODMOTHER_BOSS_ID,
  OVERGROWTH_BIOME,
  OVERGROWTH_BIOME_ID,
  SPIDERS_SPECIES_ID,
} from './species/overgrowth'
import { GLIMMERDARK_BIOME_ID } from './species/glimmerdark'
import { ROTCAP_HOLLOW_BIOME_ID } from './species/rotcap-hollow'

// Slice A shipped the SHAPE only -- 10 placeholder slots, empty spawn pools. Slice H1 replaced
// slot 1 (floors 1-10) with real The Overgrowth content; Slice H2 replaced slot 2 (floors 11-20)
// with real Glimmerdark content; Slice H3 replaces slot 3 (floors 21-30) with real Rotcap Hollow
// content. This test now pins the POST-H3 shape: slots 1-3 real + non-empty, slots 4-10 still
// the placeholder shape every later slice can safely replace one entry of without disturbing the
// rest.

describe('BIOMES (Slice A shape + Slice H1/H2/H3 real content)', () => {
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
  })

  it('slot 2 (floors 11-20) is the real Glimmerdark biome, non-empty', () => {
    const glimmerdark = BIOMES[1]
    expect(glimmerdark?.id).toBe(GLIMMERDARK_BIOME_ID)
    expect(glimmerdark?.speciesPool.length).toBeGreaterThan(0)
  })

  it('slot 3 (floors 21-30) is the real Rotcap Hollow biome, non-empty', () => {
    const rotcapHollow = BIOMES[2]
    expect(rotcapHollow?.id).toBe(ROTCAP_HOLLOW_BIOME_ID)
    expect(rotcapHollow?.speciesPool.length).toBeGreaterThan(0)
  })

  it('slots 4-10 keep the Slice A placeholder shape (empty spawn pools)', () => {
    for (const biome of BIOMES.slice(3)) {
      expect(biome.speciesPool).toEqual([])
    }
  })

  it('BIOMES_BY_ID indexes every slot by its id', () => {
    for (const biome of BIOMES) {
      expect(BIOMES_BY_ID.get(biome.id)).toBe(biome)
    }
  })
})

describe('Boss floors (Phase 4 Slice I, PR #65 review)', () => {
  it('every authored biome (non-empty speciesPool) has a boss', () => {
    for (const biome of BIOMES) {
      if (biome.speciesPool.length === 0) continue // placeholder slots 4-10, not authored yet
      expect(biome.boss).toBeDefined()
    }
  })

  it('every boss add is a real member of its own biome speciesPool', () => {
    for (const biome of BIOMES) {
      if (!biome.boss) continue
      for (const add of biome.boss.adds) {
        const isMember = biome.speciesPool.some((species) =>
          species.creatures.some((c) => c.id === add.id),
        )
        expect(isMember).toBe(true)
      }
    }
  })

  it("the Broodmother's speciesId matches the Spiders species (so living-allies-of-species counts her together with her adds)", () => {
    expect(OVERGROWTH_BIOME.boss?.speciesId).toBe(SPIDERS_SPECIES_ID)
    expect(OVERGROWTH_BIOME.boss?.bossId).toBe(BROODMOTHER_BOSS_ID)
  })

  it('generateFloor(10, OVERGROWTH_BIOME, ...) roster carries SPIDERS_SPECIES_ID on all three creatures (boss + both spiderling adds)', () => {
    const fights = generateFloor(10, OVERGROWTH_BIOME, 1, ALL_SPELLS, createSeededRng(42))
    expect(fights).toHaveLength(1) // a boss floor is exactly one fight
    const enemyParty = fights[0]!.enemyParty
    expect(enemyParty).toHaveLength(3) // the Broodmother + her two spiderling adds
    for (const enemy of enemyParty) {
      expect(enemy.speciesId).toBe(SPIDERS_SPECIES_ID)
    }
  })
})
