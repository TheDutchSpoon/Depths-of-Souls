// `startGame({ seed, specId })` is `newGame`, `setSpec` and `runScriptedIntro` in that order: the
// state it leaves equals the three calls made by hand, for every spec.

import { describe, expect, test } from 'vitest'
import { SPECIALIZATIONS } from '../data/specializations'
import { staticCreatureIdFor } from './rewards'
import { createGameStore } from './store'

describe('startGame()', () => {
  test.each(SPECIALIZATIONS.map((spec) => spec.id))(
    'leaves the state the three calls leave by hand: %s',
    (specId) => {
      const viaStart = createGameStore()
      viaStart.getState().startGame({ seed: 31337, specId })

      const byHand = createGameStore()
      byHand.getState().newGame({ seed: 31337 })
      byHand.getState().setSpec(specId)
      byHand.getState().runScriptedIntro()

      const a = viaStart.getState()
      const b = byHand.getState()
      expect(a.chosenSpec).toBe(specId)
      expect(a.runSeed).toBe(31337)
      expect([...a.collection.values()].map((i) => staticCreatureIdFor(i))).toEqual([
        `${specId}-starter`,
        'unicorn',
      ])
      expect(a.collection).toEqual(b.collection)
      expect(a.activeParty).toEqual(b.activeParty)
      expect(a.chosenSpec).toBe(b.chosenSpec)
      expect(a.runSeed).toBe(b.runSeed)
      expect(a.runCounter).toBe(b.runCounter)
      expect(a.nextInstanceOrdinal).toBe(b.nextInstanceOrdinal)
      expect(a.soulProgress).toEqual(b.soulProgress)
    },
  )

  test('resets a played game before it starts', () => {
    const store = createGameStore()
    store.getState().startGame({ seed: 1, specId: 'brute' })
    store.getState().startGame({ seed: 2, specId: 'sorcerer' })
    const state = store.getState()
    expect(state.runSeed).toBe(2)
    expect(state.collection.size).toBe(2)
  })

  test('throws on an unknown specialization', () => {
    const store = createGameStore()
    expect(() => store.getState().startGame({ seed: 1, specId: 'nope' })).toThrow(
      /unknown specialization/,
    )
  })

  test('throws on a seed newGame refuses', () => {
    const store = createGameStore()
    expect(() => store.getState().startGame({ seed: -1, specId: 'brute' })).toThrow(
      /seed/,
    )
  })
})
