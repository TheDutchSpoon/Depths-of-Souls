import { describe, expect, test } from 'vitest'
import { fightCount } from '../engine/curves'
import { contentFrontier, generateFloor } from '../engine/generation'
import type { BiomeData } from '../engine/generation'
import { createSeededRng } from '../engine/rng'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { BIOMES } from '../data/biomes'
import { ALL_SPELLS } from '../data/spells'
import { createGameStore } from '../state/store'
import {
  deepestPlusOne,
  floorInfo,
  floorInfoText,
  parseFloorField,
  prefillFloor,
} from './floorPicker'
import type { FloorInfoContext } from './floorPicker'
import { startRun } from './startRun'

const ctx: FloorInfoContext = {
  atlasPins: new Map(),
  runSeed: 5,
  biomes: BIOMES,
  config: DEFAULT_BALANCE_CONFIG,
}

describe('parseFloorField', () => {
  test('blank text is not a floor (Number() would read it as 0)', () => {
    expect(parseFloorField('')).toBeNaN()
    expect(parseFloorField(' ')).toBeNaN()
  })

  test('hex and exponent forms are not floors (Number() would read 16 and 10)', () => {
    expect(parseFloorField('0x10')).toBeNaN()
    expect(parseFloorField('1e1')).toBeNaN()
    expect(parseFloorField(' 1e1')).toBeNaN()
  })

  test('trimmed digits are the floor', () => {
    expect(parseFloorField(' 7 ')).toBe(7)
    expect(parseFloorField('0')).toBe(0)
    expect(parseFloorField('012')).toBe(12)
  })

  test('anything else is NaN', () => {
    for (const text of ['abc', '2.5', '-3', '1,5'])
      expect(parseFloorField(text)).toBeNaN()
  })
})

describe('prefillFloor and deepestPlusOne', () => {
  test('the field starts at 1 until a floor has been fought, then at the last floor fought', () => {
    expect(prefillFloor(0)).toBe(1)
    expect(prefillFloor(7)).toBe(7)
  })

  test('Deepest + 1 is one past the deepest floor', () => {
    expect(deepestPlusOne(0)).toBe(1)
    expect(deepestPlusOne(12)).toBe(13)
  })
})

describe('any text in the field reaches a refusal, never a throw', () => {
  const store = createGameStore()
  startRun(store.getState(), 'brute', '9')

  const cases: [string, string][] = [
    ['', 'floor-out-of-reach'],
    ['abc', 'floor-out-of-reach'],
    ['2.5', 'floor-out-of-reach'],
    ['-3', 'floor-out-of-reach'],
    ['0', 'floor-out-of-reach'],
    [' ', 'floor-out-of-reach'],
    ['1e3', 'floor-out-of-reach'],
    // 400 digits parse to Infinity, which is not an integer.
    ['9'.repeat(400), 'floor-out-of-reach'],
    // 1e20 is a whole number past the content frontier.
    ['99999999999999999999', 'beyond-content-frontier'],
  ]

  test.each(cases)('%j is refused as %s', (text, reason) => {
    const floor = parseFloorField(text)
    expect(store.getState().canDescend(floor)).toEqual({ ok: false, reason })
    expect(() => floorInfo(floor, ctx)).not.toThrow()
  })

  test('the info line is null for anything that is not a whole number >= 1', () => {
    for (const floor of [0, -3, 2.5, Number.NaN, Infinity]) {
      expect(floorInfo(floor, ctx)).toBeNull()
    }
  })

  test('a huge whole number still gets an info line (past floor 100 the biome is a hashed draw)', () => {
    expect(floorInfo(1e20, ctx)).not.toBeNull()
  })
})

describe('floorInfo against generateFloor', () => {
  test('every floor up to the content frontier agrees on the boss flag and the fight count', () => {
    const frontier = contentFrontier(BIOMES)
    expect(frontier).toBe(30)
    for (let floor = 1; floor <= frontier; floor++) {
      const biomeIndex = Math.floor((floor - 1) / 10)
      const fights = generateFloor(
        floor,
        BIOMES[biomeIndex]!,
        biomeIndex + 1,
        ALL_SPELLS,
        createSeededRng(floor),
        DEFAULT_BALANCE_CONFIG,
      )
      const info = floorInfo(floor, ctx)!
      expect(info.boss).toBe(fights[0]!.boss !== undefined)
      expect(info.fights).toBe(fights.length)
      expect(info.biomeName).toBe(BIOMES[biomeIndex]!.name)
    }
  })

  test('floors 10, 20 and 30 are one-fight boss floors', () => {
    for (const floor of [10, 20, 30]) {
      expect(floorInfo(floor, ctx)).toMatchObject({ boss: true, fights: 1 })
    }
  })

  test('a boss-less biome has an ordinary tenth floor', () => {
    const bossless: BiomeData = {
      id: BIOMES[0]!.id,
      name: BIOMES[0]!.name,
      speciesPool: BIOMES[0]!.speciesPool,
    }
    const biomes = [bossless]
    const info = floorInfo(10, { ...ctx, biomes })
    expect(info).toEqual({
      biomeName: bossless.name,
      fights: fightCount(10, DEFAULT_BALANCE_CONFIG),
      boss: false,
    })
    const fights = generateFloor(
      10,
      bossless,
      1,
      ALL_SPELLS,
      createSeededRng(1),
      DEFAULT_BALANCE_CONFIG,
    )
    expect(fights).toHaveLength(info!.fights)
    expect(fights[0]!.boss).toBeUndefined()
  })
})

describe('floorInfoText', () => {
  test('names the biome and the fight count, and a boss floor', () => {
    expect(floorInfoText({ biomeName: 'Deeps', fights: 12, boss: false })).toBe(
      'Deeps: 12 fights',
    )
    expect(floorInfoText({ biomeName: 'Deeps', fights: 1, boss: true })).toBe(
      'Deeps: boss floor, 1 fight',
    )
  })
})
