import { describe, expect, it } from 'vitest'
import { scaleStatsToLevel, xpForNextLevel } from './leveling'

describe('scaleStatsToLevel', () => {
  it('returns base stats unchanged at level 1 (factor === 1)', () => {
    const base = { health: 20, attack: 15, intelligence: 22, defence: 18, speed: 25 }
    expect(scaleStatsToLevel(base, 1)).toEqual(base)
  })

  // Hand-derived, GAME_DESIGN §5's own worked example: base 20, +25% of base per level ->
  // +5/level -> level 10 = base * (1 + 0.25*9) = 20 * 3.25 = 65.
  it('matches the documented base-20 worked example at level 10', () => {
    const base = { health: 20, attack: 20, intelligence: 20, defence: 20, speed: 20 }
    expect(scaleStatsToLevel(base, 10)).toEqual({
      health: 65,
      attack: 65,
      intelligence: 65,
      defence: 65,
      speed: 65,
    })
  })

  it('rounds to the nearest integer per stat, recomputed from base (never accumulated)', () => {
    // level 2: factor 1.25 -> 13 * 1.25 = 16.25 -> rounds down to 16.
    const level2 = scaleStatsToLevel(
      { health: 13, attack: 13, intelligence: 13, defence: 13, speed: 13 },
      2,
    )
    expect(level2.health).toBe(16)

    // level 3: factor 1.5 -> 13 * 1.5 = 19.5 -> rounds up to 20 (JS Math.round on .5).
    const level3 = scaleStatsToLevel(
      { health: 13, attack: 13, intelligence: 13, defence: 13, speed: 13 },
      3,
    )
    expect(level3.health).toBe(20)
  })

  it('scales each stat independently off its own base value', () => {
    const base = { health: 10, attack: 30, intelligence: 10, defence: 30, speed: 10 }
    // level 5: factor 1 + 0.25*4 = 2.0
    expect(scaleStatsToLevel(base, 5)).toEqual({
      health: 20,
      attack: 60,
      intelligence: 20,
      defence: 60,
      speed: 20,
    })
  })
})

describe('xpForNextLevel', () => {
  it('is strictly monotonic in level', () => {
    expect(xpForNextLevel(2)).toBeGreaterThan(xpForNextLevel(1))
    expect(xpForNextLevel(10)).toBeGreaterThan(xpForNextLevel(9))
  })

  it('matches the placeholder formula exactly (100 * level) -- isolated so retuning stays local', () => {
    expect(xpForNextLevel(1)).toBe(100)
    expect(xpForNextLevel(5)).toBe(500)
  })
})
