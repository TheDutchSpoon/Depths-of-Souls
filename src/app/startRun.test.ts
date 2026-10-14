import { describe, expect, test } from 'vitest'
import { SPECIALIZATIONS } from '../data/specializations'
import { staticCreatureIdFor } from '../state/rewards'
import { createGameStore } from '../state/store'
import type { GameActions } from '../state/store'
import { parseSeedField, SPEC_CHOICES, startRun } from './startRun'

const fixed = (value: number) => (array: Uint32Array<ArrayBuffer>) => {
  array[0] = value
}

type StartActions = Pick<GameActions, 'newGame' | 'setSpec' | 'runScriptedIntro'>

function spyStore(): { store: StartActions; calls: string[] } {
  const calls: string[] = []
  const store: StartActions = {
    newGame: ({ seed }) => void calls.push(`newGame(${seed})`),
    setSpec: (specId) => void calls.push(`setSpec(${specId})`),
    runScriptedIntro: () => {
      calls.push('runScriptedIntro()')
      return { events: [], result: 'win' }
    },
  }
  return { store, calls }
}

describe('parseSeedField', () => {
  test.each(['abc', '1.5', '1e3', '0x10', '+5', '12 3'])(
    'refuses %j as not a whole number',
    (text) => {
      expect(parseSeedField(text)).toEqual({ ok: false, reason: 'not-a-whole-number' })
    },
  )

  test.each(['-1', '4294967296', '9'.repeat(400)])(
    'refuses %j as out of range',
    (text) => {
      expect(parseSeedField(text)).toEqual({ ok: false, reason: 'seed-out-of-range' })
    },
  )

  test('accepts both ends of the range, and trims', () => {
    expect(parseSeedField('0')).toEqual({ ok: true, seed: 0 })
    expect(parseSeedField('4294967295')).toEqual({ ok: true, seed: 4294967295 })
    expect(parseSeedField(' 42 ')).toEqual({ ok: true, seed: 42 })
  })

  test('a negative zero is read as zero', () => {
    const parsed = parseSeedField('-0')
    expect(parsed.ok && Object.is(parsed.seed, 0)).toBe(true)
  })

  test('a blank field asks for a drawn seed', () => {
    expect(parseSeedField('')).toEqual({ ok: true, seed: null })
    expect(parseSeedField('   ')).toEqual({ ok: true, seed: null })
  })
})

describe('startRun', () => {
  test('makes exactly the simulator-run-start calls, in order', () => {
    const { store, calls } = spyStore()
    expect(startRun(store, 'brute', '77')).toEqual({ ok: true, seed: 77 })
    expect(calls).toEqual(['newGame(77)', 'setSpec(brute)', 'runScriptedIntro()'])
  })

  test('a refused seed touches nothing', () => {
    const { store, calls } = spyStore()
    for (const text of ['abc', '-1', '1.5', '4294967296', '1e3', '0x10']) {
      expect(startRun(store, 'brute', text).ok).toBe(false)
    }
    expect(calls).toEqual([])
  })

  test('a blank field draws the seed from the injected source and newGame receives it', () => {
    const { store, calls } = spyStore()
    expect(startRun(store, 'sorcerer', '', fixed(424242))).toEqual({
      ok: true,
      seed: 424242,
    })
    expect(startRun(store, 'sorcerer', '  ', fixed(7))).toEqual({ ok: true, seed: 7 })
    expect(calls[0]).toBe('newGame(424242)')
    expect(calls[3]).toBe('newGame(7)')
  })

  test('on a real store the result equals the three calls made by hand', () => {
    const viaHelper = createGameStore()
    startRun(viaHelper.getState(), 'sorcerer', '31337')
    const byHand = createGameStore()
    byHand.getState().newGame({ seed: 31337 })
    byHand.getState().setSpec('sorcerer')
    byHand.getState().runScriptedIntro()

    const owned = (store: typeof viaHelper) =>
      [...store.getState().collection.values()].map((i) => staticCreatureIdFor(i))
    expect(owned(viaHelper)).toEqual(['sorcerer-starter', 'unicorn'])
    expect(owned(viaHelper)).toEqual(owned(byHand))
    expect(viaHelper.getState().chosenSpec).toBe('sorcerer')
    expect(viaHelper.getState().runSeed).toBe(31337)
    expect(viaHelper.getState().collection).toEqual(byHand.getState().collection)
    expect(viaHelper.getState().runCounter).toBe(byHand.getState().runCounter)
  })

  test('the field accepts the largest seed newGame does, and refuses the next', () => {
    const store = createGameStore()
    expect(startRun(store.getState(), 'brute', '4294967295')).toEqual({
      ok: true,
      seed: 4294967295,
    })
    expect(store.getState().runSeed).toBe(4294967295)
    expect(() => store.getState().newGame({ seed: 4294967296 })).toThrow()
    expect(startRun(store.getState(), 'brute', '4294967296')).toEqual({
      ok: false,
      reason: 'seed-out-of-range',
    })
  })
})

describe('SPEC_CHOICES', () => {
  test('lists the specializations in the data order', () => {
    expect(SPEC_CHOICES.map((s) => s.id)).toEqual(SPECIALIZATIONS.map((s) => s.id))
    expect(SPEC_CHOICES.map((s) => s.name)).toEqual(['Sorcerer', 'Brute', 'Shieldbarer'])
  })
})
