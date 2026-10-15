import { describe, expect, test, vi } from 'vitest'
import { createInstanceId } from '../state/ids'
import type { InstanceId } from '../state/ids'
import type { Instance } from '../state/rewards'
import { createGameStore, PARTY_SIZE } from '../state/store'
import { HUB_CONTEXT } from './creatureLine'
import { labelInstances, labelOf } from './instanceLabels'
import { benchRows, partyRows, pickParty } from './partyRows'
import { startRun } from './startRun'

function ownedBrute(id: string, level = 1): Instance {
  return {
    id: createInstanceId(id),
    source: { kind: 'creature', creatureId: 'brute-starter' },
    level,
    xp: 0,
    scriptId: null,
    gems: [null, null, null],
  }
}

function startedStore(specId = 'brute') {
  const store = createGameStore()
  startRun(store.getState(), specId, '11')
  return store
}

/** A summoned copy of the brute starter, in the first free slot or on the bench. */
function summonBrute(store: ReturnType<typeof createGameStore>): InstanceId {
  store.setState({ soulProgress: new Map([['brute-starter', 100]]) })
  const result = store.getState().summon('brute-starter')
  if (!result.ok) throw new Error('summon refused')
  return result.instanceId
}

describe('partyRows', () => {
  test('one row per party entry, from activeParty and not a literal', () => {
    const store = startedStore()
    expect(partyRows(store.getState(), HUB_CONTEXT)).toHaveLength(PARTY_SIZE)
    const short = { collection: store.getState().collection, activeParty: [null, null] }
    expect(partyRows(short, HUB_CONTEXT)).toHaveLength(2)
  })

  test('the options are "empty" plus every owned instance, members included, in collection order', () => {
    const collection = new Map<InstanceId, Instance>(
      ['inst-0', 'inst-1', 'inst-2', 'inst-3'].map((id) => [
        createInstanceId(id),
        ownedBrute(id),
      ]),
    )
    const rows = partyRows(
      { collection, activeParty: [createInstanceId('inst-1'), null] },
      HUB_CONTEXT,
    )
    expect(rows[0]!.options.map((option) => option.value)).toEqual([
      '',
      'inst-0',
      'inst-1',
      'inst-2',
      'inst-3',
    ])
    expect(rows[0]!.options[0]!.label).toBe('empty')
    expect(rows[0]!.selected).toBe('inst-1')
    expect(rows[1]!.selected).toBeNull()
    expect(rows[1]!.line).toBeNull()
  })

  test('a dropdown option, a party line and a bench line carry the same label', () => {
    const store = startedStore()
    summonBrute(store)
    summonBrute(store)
    const state = store.getState()
    const labels = labelInstances(state.collection, HUB_CONTEXT.names)
    const rows = partyRows(state, HUB_CONTEXT)
    for (const row of rows) {
      for (const option of row.options.slice(1)) {
        expect(option.label).toBe(labelOf(labels, option.value as InstanceId))
      }
      if (row.selected !== null) {
        expect(row.line!.label).toBe(labelOf(labels, row.selected))
      }
    }
    // Brute starter, Unicorn, then two summons: the party (6) holds all four, so push one out.
    const bench = benchRows(
      { collection: state.collection, activeParty: state.activeParty.map(() => null) },
      HUB_CONTEXT,
    )
    expect(bench.map((line) => line.label)).toEqual(
      [...state.collection.keys()].map((id) => labelOf(labels, id)),
    )
    expect(bench.map((line) => line.label)).toContain('Cragfang Mauler #1, Lv 1')
    expect(bench.map((line) => line.label)).toContain('Cragfang Mauler #3, Lv 1')
  })
})

describe('a party line counts its label over the whole collection', () => {
  test('a benched copy ahead of a party copy in collection order still numbers it', () => {
    const store = startedStore()
    for (let i = 0; i < 5; i++) summonBrute(store)
    // The last copy (inst-6) is benched; picking it into slot 0 benches the first (inst-0).
    expect(pickParty(store.getState(), 0, 'inst-6').ok).toBe(true)
    const state = store.getState()
    expect(state.activeParty).not.toContain(createInstanceId('inst-0'))

    const rows = partyRows(state, HUB_CONTEXT)
    for (const row of rows) {
      if (row.selected === null) continue
      const option = row.options.find((candidate) => candidate.value === row.selected)!
      expect(row.line!.label).toBe(option.label)
    }
    expect(rows[0]!.line!.label).toBe('Cragfang Mauler #6, Lv 1')
    expect(benchRows(state, HUB_CONTEXT).map((line) => line.label)).toEqual([
      'Cragfang Mauler #1, Lv 1',
    ])
  })
})

describe('benchRows', () => {
  test('lists exactly the instances outside the party, in collection order', () => {
    const store = startedStore()
    for (let i = 0; i < 5; i++) summonBrute(store)
    const state = store.getState()
    expect(state.collection.size).toBe(7)
    const bench = benchRows(state, HUB_CONTEXT)
    expect(bench).toHaveLength(1)
    const inParty = new Set(state.activeParty)
    const benched = [...state.collection.keys()].filter((id) => !inParty.has(id))
    const labels = labelInstances(state.collection, HUB_CONTEXT.names)
    expect(bench.map((line) => line.label)).toEqual(
      benched.map((id) => labelOf(labels, id)),
    )
  })
})

describe('pickParty', () => {
  test('a pick is exactly one setPartySlot call, "empty" mapping to null', () => {
    const setPartySlot = vi.fn(() => ({ ok: true as const }))
    pickParty({ setPartySlot }, 2, 'inst-4')
    expect(setPartySlot.mock.calls).toEqual([[2, 'inst-4']])
    setPartySlot.mockClear()
    pickParty({ setPartySlot }, 3, '')
    expect(setPartySlot.mock.calls).toEqual([[3, null]])
  })

  test('a benched instance picked for an occupied slot benches the occupant', () => {
    const store = startedStore()
    for (let i = 0; i < 5; i++) summonBrute(store)
    const before = store.getState()
    const occupant = before.activeParty[0]!
    const benched = [...before.collection.keys()].find(
      (id) => !before.activeParty.includes(id),
    )!
    expect(pickParty(store.getState(), 0, benched).ok).toBe(true)
    const after = store.getState().activeParty
    expect(after[0]).toBe(benched)
    expect(after).not.toContain(occupant)
  })

  test('a party member picked for another slot swaps the two', () => {
    const store = startedStore()
    const [first, second] = store.getState().activeParty
    expect(pickParty(store.getState(), 1, first!).ok).toBe(true)
    const after = store.getState().activeParty
    expect(after[0]).toBe(second)
    expect(after[1]).toBe(first)
  })

  test('"empty" on a slot empties it', () => {
    const store = startedStore()
    pickParty(store.getState(), 0, '')
    expect(store.getState().activeParty[0]).toBeNull()
  })
})
