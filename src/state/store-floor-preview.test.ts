import { describe, expect, test } from 'vitest'
import { BIOMES } from '../data/biomes'
import { GLIMMERDARK_BIOME_ID } from '../data/species/glimmerdark'
import { createGameStore } from './store'

function startedStore() {
  const store = createGameStore()
  store.getState().newGame({ seed: 424242 })
  store.getState().setSpec('sorcerer')
  store.getState().runScriptedIntro()
  return store
}

describe('floorPreview', () => {
  test.each([Number.NaN, 0, -3, 2.5, Infinity, -Infinity])(
    '%s is null and does not throw',
    (floor) => {
      const store = createGameStore()
      expect(() => store.getState().floorPreview(floor)).not.toThrow()
      expect(store.getState().floorPreview(floor)).toBeNull()
    },
  )

  test('a whole number past floor 100 still previews', () => {
    const preview = createGameStore().getState().floorPreview(1e20)
    expect(preview).not.toBeNull()
    expect(BIOMES.map((biome) => biome.id)).toContain(preview!.biomeId)
  })

  test('names the biome and shape a floor resolves to, a boss floor included', () => {
    const store = createGameStore()
    expect(store.getState().floorPreview(1)).toMatchObject({
      biomeId: BIOMES[0]!.id,
      biomeName: BIOMES[0]!.name,
      boss: false,
    })
    expect(store.getState().floorPreview(10)).toMatchObject({
      biomeId: BIOMES[0]!.id,
      fights: 1,
      boss: true,
    })
    expect(store.getState().floorPreview(11)?.biomeId).toBe(BIOMES[1]!.id)
  })

  test('names the pinned biome after pinBiome', () => {
    const store = createGameStore()
    expect(store.getState().floorPreview(1)?.biomeId).toBe(BIOMES[0]!.id)
    expect(store.getState().pinBiome(1, GLIMMERDARK_BIOME_ID)).toEqual({ ok: true })
    expect(store.getState().floorPreview(1)).toMatchObject({
      biomeId: GLIMMERDARK_BIOME_ID,
      biomeName: BIOMES[1]!.name,
    })
  })

  test('a cleared floor played as many fights as its preview named', () => {
    const store = startedStore()
    const preview = store.getState().floorPreview(1)!
    const result = store.getState().descend(1)
    if (!result.ok) throw new Error(`floor 1 refused: ${result.reason}`)
    expect(result.outcome.cleared).toBe(true)
    expect(result.outcome.fightRecords).toHaveLength(preview.fights)
  })
})
