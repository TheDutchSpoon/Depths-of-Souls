// The numbers that used to sit in the logic are read from the config: the perk points a boss
// pays, the stat growth per level, and the total a specialization's perks must sum to.

import { describe, expect, test } from 'vitest'
import type { BalanceConfig } from '../engine/balance-types'
import { BIOME_COUNT } from '../engine/generation'
import { STAT_GROWTH_PER_LEVEL } from '../engine/config'
import { scaleStatsToLevel } from '../engine/leveling'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { BIOMES } from '../data/biomes'
import {
  SPECIALIZATIONS,
  specializationPointTotal,
  validateSpecialization,
  type Specialization,
} from '../data/specializations'
import { applyPerkPlan } from './balance-sim'
import { createGameStore } from './store'

const FIFTY: BalanceConfig = { ...DEFAULT_BALANCE_CONFIG, perkPointsPerBoss: 50 }
const BOSS_IDS = BIOMES.flatMap((biome) => (biome.boss ? [biome.boss.bossId] : []))

describe('the defaults are pinned', () => {
  test('a boss pays 100 perk points, a level adds a quarter of the base stat', () => {
    expect(DEFAULT_BALANCE_CONFIG.perkPointsPerBoss).toBe(100)
    expect(STAT_GROWTH_PER_LEVEL).toBe(0.25)
    // Hand-derived: level 5 is base * (1 + 0.25 * 4) = base * 2.
    expect(
      scaleStatsToLevel(
        { health: 10, attack: 20, intelligence: 4, defence: 6, speed: 8 },
        5,
      ),
    ).toEqual({
      health: 20,
      attack: 40,
      intelligence: 8,
      defence: 12,
      speed: 16,
    })
  })

  test('the points a specialization sums to are one boss per biome: 10 x 100', () => {
    expect(BIOME_COUNT).toBe(10)
    expect(specializationPointTotal(DEFAULT_BALANCE_CONFIG)).toBe(1000)
    for (const spec of SPECIALIZATIONS) {
      expect(spec.perks.reduce((sum, p) => sum + p.maxLevel * p.costPerLevel, 0)).toBe(
        1000,
      )
    }
  })
})

describe('perkPointsPerBoss reaches the store', () => {
  test('a boss recorded under a 50-point config earns 50, not 100', () => {
    const store = createGameStore({ balanceConfig: FIFTY })
    store.getState().setSpec('brute')
    expect(store.getState().perkPointSummary()).toEqual({ earned: 0, spent: 0, free: 0 })
    expect(store.getState().recordBossKill(BOSS_IDS[0]!)).toEqual({ ok: true })
    expect(store.getState().perkPointSummary()).toEqual({
      earned: 50,
      spent: 0,
      free: 50,
    })
    store.getState().recordBossKill(BOSS_IDS[1]!)
    expect(store.getState().perkPointSummary().earned).toBe(100)
  })

  test('the over-budget line is the config’s: Brute’s might costs 2 a level, so 25 levels fit 50 and 26 do not', () => {
    const store = createGameStore({ balanceConfig: FIFTY })
    store.getState().setSpec('brute')
    store.getState().recordBossKill(BOSS_IDS[0]!)
    expect(store.getState().setPerkLevel('might', 25)).toEqual({ ok: true })
    expect(store.getState().setPerkLevel('might', 26)).toEqual({
      ok: false,
      reason: 'over-budget',
    })
    const defaults = createGameStore()
    defaults.getState().setSpec('brute')
    defaults.getState().recordBossKill(BOSS_IDS[0]!)
    expect(defaults.getState().setPerkLevel('might', 26)).toEqual({ ok: true })
  })

  test('a first boss clear reports the config’s points as perkPointsGained', () => {
    const store = createGameStore({ balanceConfig: FIFTY })
    store.getState().startGame({ seed: 5, specId: 'brute' })
    store.setState((s) => {
      const collection = new Map(s.collection)
      for (const [id, instance] of collection)
        collection.set(id, { ...instance, level: 100 })
      return { collection, deepestFloor: 9 }
    })
    const result = store.getState().descend(10)
    if (!result.ok) throw new Error(`floor 10 refused: ${result.reason}`)
    expect(result.outcome.bossFirstCleared).toBe(true)
    expect(result.outcome.perkPointsGained).toBe(50)
  })

  test('the simulator buys within the config’s points', () => {
    const store = createGameStore({ balanceConfig: FIFTY })
    store.getState().setSpec('brute')
    store.getState().recordBossKill(BOSS_IDS[0]!)
    expect(() => applyPerkPlan(store)).not.toThrow()
    const { earned, spent } = store.getState().perkPointSummary()
    expect(earned).toBe(50)
    expect(spent).toBeGreaterThan(0)
    expect(spent).toBeLessThanOrEqual(50)
  })
})

describe('specializationPointTotal follows the config', () => {
  const FIVE_HUNDRED: Specialization = {
    id: 'five-hundred',
    name: 'Five hundred',
    starterCreatureId: 'nope',
    perks: [{ id: 'p', name: 'P', maxLevel: 5, costPerLevel: 100, effects: [] }],
  }

  test('a 50-point config totals 500', () => {
    expect(specializationPointTotal(FIFTY)).toBe(500)
  })

  test('a 500-point spec validates under the 50-point config only', () => {
    expect(() => validateSpecialization(FIVE_HUNDRED, FIFTY)).not.toThrow()
    expect(() => validateSpecialization(FIVE_HUNDRED)).toThrow(
      /sum to 500 points, expected exactly 1000/,
    )
    expect(() => validateSpecialization(SPECIALIZATIONS[0]!, FIFTY)).toThrow(
      /expected exactly 500/,
    )
  })
})
