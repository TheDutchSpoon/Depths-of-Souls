import { describe, expect, test } from 'vitest'
import { BIOMES } from '../data/biomes'
import { createGameStore } from '../state/store'
import {
  deepestPlusOne,
  floorInfoText,
  parseFloorField,
  prefillFloor,
} from './floorPicker'
import { startRun } from './startRun'

describe('parseFloorField', () => {
  test('blank text is not a floor (Number() would read it as 0)', () => {
    expect(parseFloorField('')).toBeNaN()
    expect(parseFloorField(' ')).toBeNaN()
  })

  test('hex and exponent forms are not floors (Number() would read 16 and 10)', () => {
    expect(parseFloorField('0x10')).toBeNaN()
    expect(parseFloorField('1e1')).toBeNaN()
    expect(parseFloorField(' 1e1')).toBeNaN()
  })

  test('trimmed digits are the floor', () => {
    expect(parseFloorField(' 7 ')).toBe(7)
    expect(parseFloorField('0')).toBe(0)
    expect(parseFloorField('012')).toBe(12)
  })

  test('anything else is NaN', () => {
    for (const text of ['abc', '2.5', '-3', '1,5'])
      expect(parseFloorField(text)).toBeNaN()
  })
})

describe('prefillFloor and deepestPlusOne', () => {
  test('the field starts at 1 until a floor has been fought, then at the last floor fought', () => {
    expect(prefillFloor(0)).toBe(1)
    expect(prefillFloor(7)).toBe(7)
  })

  test('Deepest + 1 is one past the deepest floor', () => {
    expect(deepestPlusOne(0)).toBe(1)
    expect(deepestPlusOne(12)).toBe(13)
  })
})

describe('any text in the field reaches a refusal, never a throw', () => {
  const store = createGameStore()
  startRun(store.getState(), 'brute', '9')

  const cases: [string, string][] = [
    ['', 'floor-out-of-reach'],
    ['abc', 'floor-out-of-reach'],
    ['2.5', 'floor-out-of-reach'],
    ['-3', 'floor-out-of-reach'],
    ['0', 'floor-out-of-reach'],
    [' ', 'floor-out-of-reach'],
    ['1e3', 'floor-out-of-reach'],
    // 400 digits parse to Infinity, which is not an integer.
    ['9'.repeat(400), 'floor-out-of-reach'],
    // 1e20 is a whole number past the content frontier.
    ['99999999999999999999', 'beyond-content-frontier'],
  ]

  test.each(cases)('%j is refused as %s', (text, reason) => {
    const floor = parseFloorField(text)
    expect(store.getState().canDescend(floor)).toEqual({ ok: false, reason })
    expect(() => store.getState().floorPreview(floor)).not.toThrow()
  })
})

describe('floorInfoText', () => {
  const base = { biomeId: BIOMES[0]!.id, biomeName: 'Deeps' }
  test('names the biome and the fight count, and a boss floor', () => {
    expect(floorInfoText({ ...base, fights: 12, boss: false })).toBe('Deeps: 12 fights')
    expect(floorInfoText({ ...base, fights: 1, boss: true })).toBe(
      'Deeps: boss floor, 1 fight',
    )
  })
})
