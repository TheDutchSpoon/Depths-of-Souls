import { describe, expect, test } from 'vitest'
import { BOSS_CREATURES_BY_ID } from '../data/creatures'
import { createGameStore } from '../state/store'
import { bossChoices, recordBoss } from './debugBoss'

describe('bossChoices', () => {
  test('lists exactly the data bosses, by name', () => {
    const choices = bossChoices()
    expect(choices.map((choice) => choice.id)).toEqual([...BOSS_CREATURES_BY_ID.keys()])
    for (const choice of choices) {
      expect(choice.name).toBe(BOSS_CREATURES_BY_ID.get(choice.id)!.name)
    }
    expect(choices.length).toBeGreaterThan(0)
  })
})

describe('recordBoss', () => {
  test('records a boss once: a repeat is the store no-op', () => {
    const store = createGameStore()
    const [first] = bossChoices()
    recordBoss(store.getState(), first!.id)
    recordBoss(store.getState(), first!.id)
    expect(store.getState().bossesCleared.size).toBe(1)
    expect(store.getState().perkPointSummary().earned).toBe(100)
  })

  test('an id no biome holds is refused by the store, and says so', () => {
    const store = createGameStore()
    expect(recordBoss(store.getState(), 'not-a-boss')).toEqual({
      ok: false,
      reason: 'unknown-boss',
    })
    expect(store.getState().bossesCleared.size).toBe(0)
    expect(recordBoss(store.getState(), bossChoices()[0]!.id)).toEqual({ ok: true })
  })

  test('each listed boss earns its own 100 points', () => {
    const store = createGameStore()
    for (const choice of bossChoices()) recordBoss(store.getState(), choice.id)
    expect(store.getState().perkPointSummary().earned).toBe(bossChoices().length * 100)
  })
})
