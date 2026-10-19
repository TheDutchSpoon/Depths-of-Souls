// There is no content frontier: a floor past the last authored biome is generated from that
// biome, a descent into it is accepted, and the boss on it is the real one. Real store, real
// content (`spec/run.md#biomeforfloor`).

import { describe, expect, test } from 'vitest'
import type { Affinity, Spell } from '../engine/types'
import { ALL_SPELLS } from '../data/spells'
import { BIOMES } from '../data/biomes'
import {
  ROT_SOVEREIGN_BOSS_ID,
  ROTCAP_HOLLOW_BIOME_ID,
} from '../data/species/rotcap-hollow'
import { perkPointsFor } from './rewards'
import { createGameStore } from './store'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'

const AFFINITIES: readonly Affinity[] = [
  'vitality',
  'violence',
  'wit',
  'endurance',
  'instinct',
]

/** Many spells per affinity that only a fourth biome unlocks: if a floor past 30 were resolved
 * to a deeper biome number, they would dominate every cast-role roll. */
const BIOME_FOUR_SPELLS: readonly Spell[] = AFFINITIES.flatMap((affinity) => {
  const template = ALL_SPELLS.find((spell) => spell.affinity === affinity)!
  return Array.from({ length: 40 }, (_, n) => ({
    ...template,
    id: `biome-four-${affinity}-${n}`,
    unlockedAtBiome: 4,
  }))
})
const BIOME_FOUR_IDS = new Set(BIOME_FOUR_SPELLS.map((spell) => spell.id))

function startedStore(seed = 11) {
  const store = createGameStore({ allSpells: [...ALL_SPELLS, ...BIOME_FOUR_SPELLS] })
  store.getState().startGame({ seed, specId: 'brute' })
  return store
}

describe('floors past the last authored biome', () => {
  test('floor 35 previews the last authored biome, and floors 31 to 100 all do', () => {
    const store = createGameStore()
    for (const floor of [31, 35, 40, 41, 77, 100]) {
      expect(store.getState().floorPreview(floor)?.biomeId).toBe(ROTCAP_HOLLOW_BIOME_ID)
    }
    expect(BIOMES[2]!.id).toBe(ROTCAP_HOLLOW_BIOME_ID)
  })

  test('with deepest floor 34, descend(35) is accepted and no enemy holds a spell above biome 3', () => {
    const store = startedStore()
    store.setState({ deepestFloor: 34 })
    expect(store.getState().canDescend(35)).toEqual({ ok: true })
    const result = store.getState().descend(35)
    if (!result.ok) throw new Error(`floor 35 refused: ${result.reason}`)

    const enemySpells = result.outcome.fightRecords.flatMap((record) =>
      record.enemyParty.flatMap((creature) =>
        creature.equippedSpells.flatMap((spell) => (spell === null ? [] : [spell])),
      ),
    )
    // Some enemy holds a spell at all, so "none above biome 3" is not vacuous.
    expect(enemySpells.length).toBeGreaterThan(0)
    for (const spell of enemySpells) expect(BIOME_FOUR_IDS.has(spell.id)).toBe(false)
  })

  test('floor 40 is the Rot Sovereign boss floor, and a repeat win adds no perk points', () => {
    const store = startedStore()
    expect(store.getState().floorPreview(40)).toMatchObject({
      biomeId: ROTCAP_HOLLOW_BIOME_ID,
      boss: true,
      fights: 1,
    })
    // Already cleared, party far above the boss: the win is not a first clear.
    store.setState((s) => {
      const collection = new Map(s.collection)
      for (const [id, instance] of collection) {
        collection.set(id, { ...instance, level: 100 })
      }
      return {
        collection,
        deepestFloor: 39,
        bossesCleared: new Set([ROT_SOVEREIGN_BOSS_ID]),
      }
    })
    const before = store.getState().bossesCleared
    const result = store.getState().descend(40)
    if (!result.ok) throw new Error(`floor 40 refused: ${result.reason}`)
    expect(result.outcome.fightResults).toEqual(['win'])
    expect(result.outcome.bossDefeated).toBe(ROT_SOVEREIGN_BOSS_ID)
    expect(result.outcome.bossFirstCleared).toBe(false)
    expect(result.outcome.perkPointsGained).toBe(0)
    expect(store.getState().bossesCleared).toBe(before)
    expect(perkPointsFor(store.getState().bossesCleared, DEFAULT_BALANCE_CONFIG)).toBe(
      100,
    )
  })

  test('floors past 100 are authored biomes too, never an empty one', () => {
    const store = createGameStore()
    const authored = new Set(BIOMES.slice(0, 3).map((biome) => biome.id))
    for (let floor = 101; floor <= 160; floor++) {
      expect(authored.has(store.getState().floorPreview(floor)!.biomeId)).toBe(true)
    }
  })
})
