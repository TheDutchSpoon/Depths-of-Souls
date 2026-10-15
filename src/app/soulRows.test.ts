import { describe, expect, test } from 'vitest'
import { createGameStore } from '../state/store'
import { DEMO_NAMES } from './names'
import { labelInstances, labelOf } from './instanceLabels'
import { percentText, soulRows, summonCreature } from './soulRows'
import { startRun } from './startRun'

function storeWithSouls(souls: [string, number][]) {
  const store = createGameStore()
  startRun(store.getState(), 'brute', '5')
  store.setState({ soulProgress: new Map(souls) })
  return store
}

describe('soulRows', () => {
  test('lists only creatures above 0%, named, with the % and canSummon result', () => {
    const store = storeWithSouls([
      ['brute-starter', 0],
      ['sorcerer-starter', 40],
      ['shieldbarer-starter', 100],
    ])
    const rows = soulRows(store.getState(), store.getState(), DEMO_NAMES)
    expect(rows.map((row) => row.creatureId)).toEqual([
      'sorcerer-starter',
      'shieldbarer-starter',
    ])
    expect(rows.map((row) => row.name)).toEqual(['Glyphmoth Seer', 'Stonehorn Warden'])
    expect(rows.map((row) => row.percent)).toEqual([40, 100])
    expect(rows[0]!.can).toEqual({ ok: false, reason: 'soul-incomplete' })
    expect(rows[1]!.can).toEqual({ ok: true })
  })

  test('a creature the name table cannot name throws', () => {
    const store = storeWithSouls([['sorcerer-starter', 20]])
    expect(() => soulRows(store.getState(), store.getState(), new Map())).toThrow(
      'sorcerer-starter',
    )
  })

  test('the percentage prints with its sign and no rounding', () => {
    expect(percentText(25)).toBe('25%')
  })
})

describe('summonCreature', () => {
  test('a creature at 100% summons twice, and the two copies are labelled #1 and #2', () => {
    const store = storeWithSouls([['brute-starter', 100]])
    const copiesBefore = store.getState().collection.size
    const first = summonCreature(store.getState(), 'brute-starter')
    const second = summonCreature(store.getState(), 'brute-starter')
    if (!first.ok || !second.ok) throw new Error('summon refused')
    const state = store.getState()
    expect(state.collection.size).toBe(copiesBefore + 2)
    expect(state.soulProgress.get('brute-starter')).toBe(100)
    const labels = labelInstances(state.collection, DEMO_NAMES)
    // The starter itself is a third copy of the name, so the new ones are #2 and #3.
    expect(labelOf(labels, first.instanceId)).toBe('Cragfang Mauler #2, Lv 1')
    expect(labelOf(labels, second.instanceId)).toBe('Cragfang Mauler #3, Lv 1')
  })

  test('a summon into a full party lands on the bench', () => {
    const store = storeWithSouls([['brute-starter', 100]])
    for (let i = 0; i < 4; i++) summonCreature(store.getState(), 'brute-starter')
    expect(store.getState().activeParty.every((id) => id !== null)).toBe(true)
    const benched = summonCreature(store.getState(), 'brute-starter')
    if (!benched.ok) throw new Error('summon refused')
    expect(store.getState().activeParty).not.toContain(benched.instanceId)
    expect(store.getState().collection.has(benched.instanceId)).toBe(true)
  })

  test('a refusal comes back as the store gave it', () => {
    const store = storeWithSouls([['sorcerer-starter', 40]])
    expect(summonCreature(store.getState(), 'sorcerer-starter')).toEqual({
      ok: false,
      reason: 'soul-incomplete',
    })
  })
})
