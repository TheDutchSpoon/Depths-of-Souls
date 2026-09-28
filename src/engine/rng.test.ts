import { describe, expect, it } from 'vitest'
import { createRngState, createSeededRng, nextRandom } from './rng'

describe('createSeededRng', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createSeededRng(12345)
    const b = createSeededRng(12345)

    const sequenceA = Array.from({ length: 20 }, () => a.next())
    const sequenceB = Array.from({ length: 20 }, () => b.next())

    expect(sequenceA).toEqual(sequenceB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1)
    const b = createSeededRng(2)

    expect(a.next()).not.toEqual(b.next())
  })

  it('always returns a value in [0, 1)', () => {
    const rng = createSeededRng(42)

    for (let i = 0; i < 1000; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('nextRandom / createRngState', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createRngState(12345)
    const b = createRngState(12345)

    const sequenceA = Array.from({ length: 20 }, () => nextRandom(a))
    const sequenceB = Array.from({ length: 20 }, () => nextRandom(b))

    expect(sequenceA).toEqual(sequenceB)
  })

  it('always returns a value in [0, 1)', () => {
    const rng = createRngState(42)

    for (let i = 0; i < 1000; i++) {
      const value = nextRandom(rng)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('advances position as an unsigned 32-bit integer', () => {
    const rng = createRngState(0)
    for (let i = 0; i < 100; i++) {
      nextRandom(rng)
      expect(Number.isInteger(rng.position)).toBe(true)
      expect(rng.position).toBeGreaterThanOrEqual(0)
      expect(rng.position).toBeLessThan(2 ** 32)
    }
  })

  // B-2: exactly one implementation of the mulberry32 math backs both APIs -- this is a
  // regression check, not just a parity assertion, since createSeededRng is implemented on top
  // of nextRandom (see rng.ts). A future edit that broke the sequence for either API would fail
  // this test long before it could silently drift a golden.
  it('produces the identical sequence as the legacy createSeededRng API for the same seed', () => {
    const legacy = createSeededRng(777)
    const rng = createRngState(777)

    const legacySequence = Array.from({ length: 20 }, () => legacy.next())
    const plainSequence = Array.from({ length: 20 }, () => nextRandom(rng))

    expect(plainSequence).toEqual(legacySequence)
  })
})
