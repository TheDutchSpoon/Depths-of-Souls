import { describe, expect, it } from 'vitest'
import { deepFreeze } from './deep-freeze'
import { createCombat } from '../combat'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { StatusDef } from '../effect-types'
import type { Script } from '../scripting-types'

describe('deepFreeze: Map', () => {
  it('makes set, delete and clear throw', () => {
    const map = deepFreeze(new Map([['a', 1]]))
    expect(() => map.set('b', 2)).toThrow(TypeError)
    expect(() => map.delete('a')).toThrow(TypeError)
    expect(() => map.clear()).toThrow(TypeError)
    expect(map.size).toBe(1)
  })

  it('still reads: get, has, iteration', () => {
    const map = deepFreeze(new Map([['a', 1]]))
    expect(map.get('a')).toBe(1)
    expect(map.has('a')).toBe(true)
    expect([...map]).toEqual([['a', 1]])
  })

  it('still toEquals an equal unfrozen Map', () => {
    expect(deepFreeze(new Map([['a', 1]]))).toEqual(new Map([['a', 1]]))
  })

  it('deep-freezes its entries', () => {
    const map = deepFreeze(new Map([['a', { n: 1 }]]))
    expect(() => {
      map.get('a')!.n = 2
    }).toThrow(TypeError)
  })
})

describe('deepFreeze: Set', () => {
  it('makes add, delete and clear throw', () => {
    const set = deepFreeze(new Set(['a']))
    expect(() => set.add('b')).toThrow(TypeError)
    expect(() => set.delete('a')).toThrow(TypeError)
    expect(() => set.clear()).toThrow(TypeError)
    expect(set.size).toBe(1)
  })

  it('still reads: has, iteration', () => {
    const set = deepFreeze(new Set(['a']))
    expect(set.has('a')).toBe(true)
    expect([...set]).toEqual(['a'])
  })

  it('still toEquals an equal unfrozen Set', () => {
    expect(deepFreeze(new Set(['a']))).toEqual(new Set(['a']))
  })

  it('deep-freezes its entries', () => {
    const set = deepFreeze(new Set([{ n: 1 }]))
    expect(() => {
      ;[...set][0]!.n = 2
    }).toThrow(TypeError)
  })
})

describe('deepFreeze: nested collections', () => {
  it('locks a Map and a Set nested in a plain object', () => {
    const value = deepFreeze({ map: new Map([['a', 1]]), set: new Set(['a']) })
    expect(() => value.map.set('b', 2)).toThrow(TypeError)
    expect(() => value.set.add('b')).toThrow(TypeError)
  })

  it('locks a Map and a Set nested in an array', () => {
    const value = deepFreeze([new Map([['a', 1]]), new Set(['a'])] as const)
    expect(() => value[0].set('b', 2)).toThrow(TypeError)
    expect(() => value[1].add('b')).toThrow(TypeError)
  })

  it('locks a Map nested in a Map', () => {
    const value = deepFreeze(new Map([['inner', new Map([['a', 1]])]]))
    expect(() => value.get('inner')!.set('b', 2)).toThrow(TypeError)
  })

  it('is idempotent: freezing a locked collection again is fine', () => {
    const map = deepFreeze(new Map([['a', 1]]))
    expect(deepFreeze(map)).toBe(map)
  })
})

describe('deepFreeze: a collection frozen without the lock', () => {
  it('throws instead of skipping it, since its writes can no longer be locked', () => {
    const map = Object.freeze(new Map([['a', 1]]))
    expect(() => deepFreeze(map)).toThrow(/frozen with Object.freeze before deepFreeze/)
    const set = Object.freeze(new Set(['a']))
    expect(() => deepFreeze(set)).toThrow(/frozen with Object.freeze before deepFreeze/)
  })
})

describe('deepFreeze: a CombatState', () => {
  it("holds the state's script and status registries to never-written-to", () => {
    const state = deepFreeze(
      createCombat({
        seed: 1,
        player: { party: makeParty('player', [{ id: 'a', scriptId: 'always-wait' }]) },
        enemy: { party: makeParty('enemy', [{ id: 'b' }]) },
        registries: { scripts: new Map(FIXTURE_SCRIPTS_BY_ID) },
      }),
    )
    // The registries are typed read-only; a write through a cast is what the lock must stop.
    const scripts = state.scripts as Map<string, Script>
    const statuses = state.statuses as Map<string, StatusDef>
    expect(() => scripts.set('x', { id: 'x', rules: [] })).toThrow(TypeError)
    expect(() => statuses.clear()).toThrow(TypeError)
  })
})
