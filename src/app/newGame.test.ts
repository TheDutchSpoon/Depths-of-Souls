import { describe, expect, test } from 'vitest'
import { createGameStore } from '../state/store'
import { generateRunSeed, startNewGame } from './newGame'

const fixed = (value: number) => (array: Uint32Array<ArrayBuffer>) => {
  array[0] = value
}

describe('generateRunSeed', () => {
  test('returns exactly the one uint32 the source supplies, at both ends of the range', () => {
    expect(generateRunSeed(fixed(0))).toBe(0)
    expect(generateRunSeed(fixed(0xdeadbeef))).toBe(0xdeadbeef)
    expect(generateRunSeed(fixed(0xffffffff))).toBe(0xffffffff)
  })

  test('the default source (crypto) gives an integer newGame accepts', () => {
    const seed = generateRunSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffffffff)
    expect(() => createGameStore().getState().newGame({ seed })).not.toThrow()
  })
})

describe('startNewGame', () => {
  test('resets the store to a fresh game on the generated seed and returns it', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')
    const seed = startNewGame(store.getState(), fixed(424242))
    expect(seed).toBe(424242)
    expect(store.getState().runSeed).toBe(424242)
    expect(store.getState().chosenSpec).toBeNull()
    expect(store.getState().collection.size).toBe(0)
  })
})
