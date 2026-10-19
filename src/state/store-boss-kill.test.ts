// `recordBossKill` refuses an id no biome holds, and `canRecordBossKill` answers the same question
// without changing anything. A boss is known by the store's own biome list, not by a global map.

import { describe, expect, test } from 'vitest'
import type { BiomeData } from '../engine/generation'
import { BIOMES } from '../data/biomes'
import { BOSS_CREATURES_BY_ID } from '../data/creatures'
import { createGameStore } from './store'

const BROODMOTHER = BIOMES[0]!.boss!.bossId

/** The first biome with a different boss id on it; the global creature map still names the
 * Broodmother, this list does not. */
const OTHER_BOSS_BIOME: BiomeData = {
  ...BIOMES[0]!,
  boss: { ...BIOMES[0]!.boss!, bossId: 'another-boss' },
}

describe('recordBossKill', () => {
  test('an unknown id is refused, and the state object and perk points are untouched', () => {
    const store = createGameStore()
    const before = store.getState()
    expect(store.getState().recordBossKill('not-a-boss')).toEqual({
      ok: false,
      reason: 'unknown-boss',
    })
    expect(store.getState()).toBe(before)
    expect(store.getState().bossesCleared.size).toBe(0)
    expect(store.getState().perkPointSummary().earned).toBe(0)
  })

  test('a known id records and pays its perk points', () => {
    const store = createGameStore()
    expect(store.getState().recordBossKill(BROODMOTHER)).toEqual({ ok: true })
    expect(store.getState().bossesCleared.has(BROODMOTHER)).toBe(true)
    expect(store.getState().perkPointSummary().earned).toBe(100)
  })

  test('a repeat is ok and changes nothing: the same state object', () => {
    const store = createGameStore()
    store.getState().recordBossKill(BROODMOTHER)
    const before = store.getState()
    expect(store.getState().recordBossKill(BROODMOTHER)).toEqual({ ok: true })
    expect(store.getState()).toBe(before)
    expect(store.getState().perkPointSummary().earned).toBe(100)
  })

  test('the ids come from the store’s biome list, not the global boss map', () => {
    expect(BOSS_CREATURES_BY_ID.has(BROODMOTHER)).toBe(true)
    const store = createGameStore({ biomes: [OTHER_BOSS_BIOME] })
    expect(store.getState().recordBossKill(BROODMOTHER)).toEqual({
      ok: false,
      reason: 'unknown-boss',
    })
    expect(store.getState().recordBossKill('another-boss')).toEqual({ ok: true })
    expect(store.getState().bossesCleared.has('another-boss')).toBe(true)
  })
})

describe('canRecordBossKill', () => {
  test.each([
    ['an unknown id', 'not-a-boss'],
    ['a known id', BROODMOTHER],
  ])(
    '%s: it answers what recordBossKill answers, and changes nothing',
    (_name, bossId) => {
      const asked = createGameStore()
      const before = asked.getState()
      const answer = asked.getState().canRecordBossKill(bossId)
      expect(asked.getState()).toBe(before)

      const done = createGameStore()
      expect(done.getState().recordBossKill(bossId)).toEqual(answer)
    },
  )

  test('a repeat: it answers ok, as recordBossKill does', () => {
    const store = createGameStore()
    store.getState().recordBossKill(BROODMOTHER)
    const before = store.getState()
    expect(store.getState().canRecordBossKill(BROODMOTHER)).toEqual({ ok: true })
    expect(store.getState()).toBe(before)
  })

  test('for an injected biome list it answers for that list’s bosses', () => {
    const store = createGameStore({ biomes: [OTHER_BOSS_BIOME] })
    expect(store.getState().canRecordBossKill('another-boss')).toEqual({ ok: true })
    expect(store.getState().canRecordBossKill(BROODMOTHER)).toEqual({
      ok: false,
      reason: 'unknown-boss',
    })
  })
})
