import { describe, expect, test } from 'vitest'
import { createGameStore } from '../state/store'
import { setPerkFromField } from './perkRows'
import { otherSpecs, SPEC_SWITCH_NOTE, switchSpec } from './specSwitcher'
import { SPEC_CHOICES, startRun } from './startRun'

describe('otherSpecs', () => {
  test('offers every spec but the chosen one, in data order', () => {
    for (const chosen of SPEC_CHOICES) {
      expect(otherSpecs(chosen.id).map((spec) => spec.id)).toEqual(
        SPEC_CHOICES.filter((spec) => spec.id !== chosen.id).map((spec) => spec.id),
      )
    }
  })

  test('offers all of them while none is chosen', () => {
    expect(otherSpecs(null)).toEqual(SPEC_CHOICES)
  })
})

describe('switchSpec', () => {
  test('refunds the spend and grants the new starter', () => {
    const store = createGameStore()
    startRun(store.getState(), 'brute', '2')
    store.getState().recordBossKill('broodmother')
    expect(setPerkFromField(store.getState(), 'might', '5').ok).toBe(true)
    expect(store.getState().perkPointSummary().spent).toBe(10)

    switchSpec(store.getState(), 'sorcerer')

    const state = store.getState()
    expect(state.chosenSpec).toBe('sorcerer')
    expect(state.perkPointSummary().spent).toBe(0)
    const owned = [...state.collection.values()].map((entry) =>
      entry.source.kind === 'creature' ? entry.source.creatureId : '',
    )
    expect(owned).toContain('sorcerer-starter')
    // A starter already owned is never removed.
    expect(owned).toContain('brute-starter')
  })

  test('calls setSpec once and nothing else', () => {
    const calls: string[] = []
    switchSpec({ setSpec: (id) => calls.push(id) }, 'shieldbarer')
    expect(calls).toEqual(['shieldbarer'])
  })

  test('carries the refund note', () => {
    expect(SPEC_SWITCH_NOTE).toBe('Switching refunds every perk.')
  })
})
