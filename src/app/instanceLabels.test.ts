import { describe, expect, test } from 'vitest'
import { createInstanceId } from '../state/ids'
import type { InstanceId } from '../state/ids'
import type { Instance } from '../state/rewards'
import { createGameStore } from '../state/store'
import { labelInstances, labelOf } from './instanceLabels'
import { DEMO_NAMES } from './names'
import { startRun } from './startRun'

const NAMES = new Map([
  ['snap', 'Snapjaw'],
  ['wolf', 'Wolf'],
])

function instance(id: string, creatureId: string, level: number): Instance {
  return {
    id: createInstanceId(id),
    source: { kind: 'creature', creatureId },
    level,
    xp: 0,
    scriptId: null,
    gems: [],
  }
}

function collectionOf(...instances: Instance[]): Map<InstanceId, Instance> {
  return new Map(instances.map((entry) => [entry.id, entry]))
}

describe('labelInstances', () => {
  test('a shared name takes an ordinal by collection order, a unique name prints bare', () => {
    const labels = labelInstances(
      collectionOf(
        instance('inst-0', 'snap', 3),
        instance('inst-1', 'wolf', 2),
        instance('inst-2', 'snap', 5),
      ),
      NAMES,
    )
    expect(labelOf(labels, createInstanceId('inst-0'))).toBe('Snapjaw #1, Lv 3')
    expect(labelOf(labels, createInstanceId('inst-1'))).toBe('Wolf, Lv 2')
    expect(labelOf(labels, createInstanceId('inst-2'))).toBe('Snapjaw #2, Lv 5')
  })

  test('the ordinal counts over the party and the bench together', () => {
    // The brute and the Unicorn fill two slots and four summons fill the rest, so the fifth
    // summon (inst-6) lands on the bench; the labels never ask where a copy is.
    const store = createGameStore()
    startRun(store.getState(), 'brute', '1')
    store.setState({
      soulProgress: new Map([['brute-starter', 100]]),
    })
    for (let i = 0; i < 5; i++)
      expect(store.getState().summon('brute-starter').ok).toBe(true)
    const state = store.getState()
    expect(state.activeParty).not.toContain(createInstanceId('inst-6'))
    const labels = labelInstances(state.collection, DEMO_NAMES)
    const brutes = [...state.collection.values()].filter(
      (entry) =>
        entry.source.kind === 'creature' && entry.source.creatureId === 'brute-starter',
    )
    expect(brutes.map((entry) => labelOf(labels, entry.id))).toEqual([
      'Cragfang Mauler #1, Lv 1',
      'Cragfang Mauler #2, Lv 1',
      'Cragfang Mauler #3, Lv 1',
      'Cragfang Mauler #4, Lv 1',
      'Cragfang Mauler #5, Lv 1',
      'Cragfang Mauler #6, Lv 1',
    ])
  })

  test('a first copy gains "#1" once a second is summoned', () => {
    const store = createGameStore()
    startRun(store.getState(), 'brute', '1')
    const starter = [...store.getState().collection.values()].find(
      (entry) =>
        entry.source.kind === 'creature' && entry.source.creatureId === 'brute-starter',
    )!
    expect(
      labelOf(labelInstances(store.getState().collection, DEMO_NAMES), starter.id),
    ).toBe('Cragfang Mauler, Lv 1')
    store.setState({ soulProgress: new Map([['brute-starter', 100]]) })
    store.getState().summon('brute-starter')
    expect(
      labelOf(labelInstances(store.getState().collection, DEMO_NAMES), starter.id),
    ).toBe('Cragfang Mauler #1, Lv 1')
  })

  test('an unlabelled id throws', () => {
    const labels = labelInstances(collectionOf(instance('inst-0', 'snap', 1)), NAMES)
    expect(() => labelOf(labels, createInstanceId('inst-9'))).toThrow('inst-9')
  })

  test('a creature the name table cannot name throws', () => {
    expect(() =>
      labelInstances(collectionOf(instance('inst-0', 'nope', 1)), NAMES),
    ).toThrow('nope')
  })

  test('a fusion source throws', () => {
    const fused: Instance = {
      ...instance('inst-0', 'snap', 1),
      source: { kind: 'fusion', identityParent: 'a', affinityParent: 'b' },
    }
    expect(() => labelInstances(collectionOf(fused), NAMES)).toThrow()
  })
})
