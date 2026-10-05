import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../engine/rng'
import { generateFloor } from '../engine/generation'
import { enemyPartySize } from '../engine/curves'
import { DEFAULT_GEM_SLOT_COUNT } from '../engine/config'
import { DEFAULT_BALANCE_CONFIG } from './balance'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from '../engine/__fixtures__/balance'
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

  it('generateFloor(10, OVERGROWTH_BIOME, ...): the boss and her two spiderling adds carry SPIDERS_SPECIES_ID, and the three fill creatures do not (4.1-G1)', () => {
    const fights = generateFloor(
      10,
      OVERGROWTH_BIOME,
      1,
      ALL_SPELLS,
      createSeededRng(42),
      CFG,
    )
    expect(fights).toHaveLength(1) // a boss floor is exactly one fight
    const enemyParty = fights[0]!.enemyParty
    expect(enemyParty).toHaveLength(6) // 6v6 (PR #81 review): the boss, her two adds, three fill
    // The count-scaling signature stays her authored adds: only the first three are Spiders.
    expect(enemyParty.slice(0, 3).map((e) => e.speciesId)).toEqual([
      SPIDERS_SPECIES_ID,
      SPIDERS_SPECIES_ID,
      SPIDERS_SPECIES_ID,
    ])
    for (const fill of enemyParty.slice(3)) {
      expect(fill.speciesId).not.toBe(SPIDERS_SPECIES_ID)
    }
  })
})

// Phase 4.1-G1 (6v6 boss floors and boss loadouts, PR #81 review): every shipped boss floor, over a
// spread of run seeds, against the real config.
describe('every shipped boss floor is a full side (Phase 4.1-G1)', () => {
  const SEEDS = [1, 2, 3, 42, 777, 20260702]
  const bossBiomes = BIOMES.map((biome, index) => ({ biome, index })).filter(
    ({ biome }) => biome.boss,
  )

  it('there are shipped boss biomes to check', () => {
    expect(bossBiomes.length).toBeGreaterThanOrEqual(3)
  })

  for (const { biome, index } of bossBiomes) {
    const boss = biome.boss!
    const floor = (index + 1) * 10

    const party = (seed: number) =>
      generateFloor(
        floor,
        biome,
        index + 1,
        ALL_SPELLS,
        createSeededRng(seed),
        DEFAULT_BALANCE_CONFIG,
      )[0]!.enemyParty

    it(`${boss.bossId} (floor ${floor}): 6 creatures, the boss first, then its authored adds in order`, () => {
      expect(enemyPartySize(floor, DEFAULT_BALANCE_CONFIG)).toBe(6)
      for (const seed of SEEDS) {
        const enemyParty = party(seed)
        expect(enemyParty).toHaveLength(6)
        expect(enemyParty[0]!.origin.templateId).toBe(boss.creature.id)
        boss.adds.forEach((add, i) => {
          expect(enemyParty[1 + i]!.origin.templateId).toBe(add.id)
        })
        expect(enemyParty.map((e) => e.slot)).toEqual([0, 1, 2, 3, 4, 5])
      }
    })

    it(`${boss.bossId}: no fill creature shares the boss's species, and every one is a member of the biome's own pool`, () => {
      for (const seed of SEEDS) {
        const fill = party(seed).slice(1 + boss.adds.length)
        expect(fill.length).toBe(5 - boss.adds.length)
        for (const creature of fill) {
          expect(creature.speciesId).not.toBe(boss.speciesId)
          const species = biome.speciesPool.find((sp) => sp.id === creature.speciesId)
          expect(
            species?.creatures.some((c) => c.id === creature.origin.templateId),
          ).toBe(true)
        }
      }
    })

    it(`${boss.bossId}: the fill is deterministic per run seed, and varies across seeds`, () => {
      const ids = (seed: number) =>
        party(seed).map((e) => e.origin.templateId + '@' + e.origin.level)
      expect(ids(42)).toEqual(ids(42))
      expect(new Set(SEEDS.map((seed) => ids(seed).join(','))).size).toBeGreaterThan(1)
    })

    it(`${boss.bossId}: every creature, the boss included, holds a full set of distinct gems of its own affinity`, () => {
      for (const seed of SEEDS) {
        for (const creature of party(seed)) {
          expect(creature.equippedSpells).toHaveLength(DEFAULT_GEM_SLOT_COUNT)
          const ids = creature.equippedSpells.map((spell) => {
            expect(spell).not.toBeNull()
            expect(spell!.affinity).toBe(creature.affinity)
            expect(spell!.unlockedAtBiome).toBeLessThanOrEqual(index + 1)
            return spell!.id
          })
          expect(new Set(ids).size).toBe(ids.length)
        }
      }
    })
  }
})
