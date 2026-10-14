import { describe, expect, test } from 'vitest'
import { BIOMES } from '../data/biomes'
import { SPECIALIZATIONS_BY_ID } from '../data/specializations'
import { createGameStore } from '../state/store'
import { runDescent } from './descendFlow'
import { CURRENCY_NOTE, SAVE_NOTE, sidePanelRows } from './sidePanel'
import { startRun } from './startRun'

const ctx = { specs: SPECIALIZATIONS_BY_ID, biomes: BIOMES }
const valueOf = (rows: ReturnType<typeof sidePanelRows>, label: string) =>
  rows.find((row) => row.label === label)?.value

describe('sidePanelRows', () => {
  test('before a game starts: no spec, nothing discovered', () => {
    const rows = sidePanelRows(createGameStore().getState(), ctx)
    expect(valueOf(rows, 'Specialization')).toBe('none')
    expect(valueOf(rows, 'Discovered biomes')).toBe('none')
    expect(valueOf(rows, 'Bosses cleared')).toBe('none')
  })

  test('after a start and a descent every row equals the store value', () => {
    const store = createGameStore()
    startRun(store.getState(), 'brute', '1234')
    store.getState().recordBossKill('broodmother')
    store.getState().setPerkLevel('might', 5)
    expect(runDescent(store, 1).ok).toBe(true)
    const state = store.getState()
    const rows = sidePanelRows(state, ctx)

    expect(valueOf(rows, 'Specialization')).toBe('Brute')
    expect(valueOf(rows, 'Seed')).toBe('1234')
    expect(valueOf(rows, 'Deepest floor')).toBe(String(state.deepestFloor))
    expect(valueOf(rows, 'Last floor')).toBe('1')
    expect(valueOf(rows, 'Discovered biomes')).toBe(BIOMES[0]!.name)
    expect(valueOf(rows, 'Bosses cleared')).toBe(BIOMES[0]!.boss!.creature.name)
    expect(valueOf(rows, 'Perk points')).toBe('100 earned, 10 spent, 90 free')
    expect(valueOf(rows, 'Essence')).toBe(String(state.currencies.essence))
    expect(valueOf(rows, 'Ore')).toBe(String(state.currencies.ore))
    expect(valueOf(rows, 'Bricks')).toBe(String(state.currencies.bricks))
    expect(valueOf(rows, 'Lifeforce')).toBe(String(state.currencies.lifeforce))
    expect(state.currencies.essence).toBeGreaterThan(0)
  })

  test('carries the two fixed notes', () => {
    expect(CURRENCY_NOTE).toBe('Nothing spends these yet')
    expect(SAVE_NOTE).toBe('No saving yet: reloading the page starts over')
  })
})
