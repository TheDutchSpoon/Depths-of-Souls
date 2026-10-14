import { describe, expect, it } from 'vitest'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { BIOMES } from '../data/biomes'
import { ALL_SPELLS } from '../data/spells'
import { fightCount } from './curves'
import { contentFrontier, floorShape, generateFloor } from './generation'
import type { BiomeData } from './generation'
import { createSeededRng } from './rng'

const CONFIG = DEFAULT_BALANCE_CONFIG

describe('floorShape', () => {
  it('agrees with generateFloor on the boss flag and the fight count, floor 1 to the frontier', () => {
    const frontier = contentFrontier(BIOMES)
    expect(frontier).toBe(30)
    for (let floor = 1; floor <= frontier; floor++) {
      const biomeIndex = Math.floor((floor - 1) / 10)
      const biome = BIOMES[biomeIndex]!
      const fights = generateFloor(
        floor,
        biome,
        biomeIndex + 1,
        ALL_SPELLS,
        createSeededRng(floor),
        CONFIG,
      )
      const shape = floorShape(floor, biome, CONFIG)
      expect(shape.boss).toBe(fights[0]!.boss !== undefined)
      expect(shape.fights).toBe(fights.length)
    }
  })

  it('makes floors 10, 20 and 30 one-fight boss floors', () => {
    for (const floor of [10, 20, 30]) {
      const biome = BIOMES[floor / 10 - 1]!
      expect(floorShape(floor, biome, CONFIG)).toEqual({ boss: true, fights: 1 })
    }
  })

  it('leaves a boss-less biome tenth floor ordinary', () => {
    const bossless: BiomeData = {
      id: BIOMES[0]!.id,
      name: BIOMES[0]!.name,
      speciesPool: BIOMES[0]!.speciesPool,
    }
    expect(floorShape(10, bossless, CONFIG)).toEqual({
      boss: false,
      fights: fightCount(10, CONFIG),
    })
    const fights = generateFloor(10, bossless, 1, ALL_SPELLS, createSeededRng(1), CONFIG)
    expect(fights).toHaveLength(fightCount(10, CONFIG))
    expect(fights[0]!.boss).toBeUndefined()
  })
})
