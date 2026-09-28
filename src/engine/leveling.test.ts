import { describe, expect, it } from 'vitest'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG } from './__fixtures__/balance'
import { scaleStatsToLevel, xpAwardForKill, xpForNextLevel } from './leveling'

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

describe('xpForNextLevel (Phase 4.1-A, ASSUMPTION 5 -- quadratic default)', () => {
  it('is strictly monotonic in level', () => {
    expect(xpForNextLevel(2, DEFAULT_BALANCE_CONFIG)).toBeGreaterThan(
      xpForNextLevel(1, DEFAULT_BALANCE_CONFIG),
    )
    expect(xpForNextLevel(10, DEFAULT_BALANCE_CONFIG)).toBeGreaterThan(
      xpForNextLevel(9, DEFAULT_BALANCE_CONFIG),
    )
  })

  it('matches the default formula exactly (20 * level^2) -- isolated so retuning stays local', () => {
    expect(xpForNextLevel(1, DEFAULT_BALANCE_CONFIG)).toBe(20)
    expect(xpForNextLevel(5, DEFAULT_BALANCE_CONFIG)).toBe(500)
  })

  // Review fix F6: `xpForNextLevel`'s curve IS expressible under the Phase-4 placeholder config
  // (unlike xpAwardForKill's floor->level basis change, below) -- 100 * level is just
  // {coefficient: 100, exponent: 1}, the same two parameters as the new default's {20, 2}.
  it('the Phase-4 placeholder config reproduces the OLD linear curve (100 * level) exactly', () => {
    expect(xpForNextLevel(1, PHASE_4_PLACEHOLDER_BALANCE_CONFIG)).toBe(100)
    expect(xpForNextLevel(5, PHASE_4_PLACEHOLDER_BALANCE_CONFIG)).toBe(500)
  })
})

describe('xpAwardForKill (Phase 4.1-A, ASSUMPTION 5 -- victim-level-scaled)', () => {
  it("equals the victim's own level under the default multiplier (1)", () => {
    expect(xpAwardForKill(7, DEFAULT_BALANCE_CONFIG)).toBe(7)
    expect(xpAwardForKill(42, DEFAULT_BALANCE_CONFIG)).toBe(42)
  })
})
