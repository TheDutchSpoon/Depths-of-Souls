import { describe, expect, it } from 'vitest'
import { createSeededRng } from './rng'

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
