import { describe, expect, test } from 'vitest'
import { BIOMES } from '../data/biomes'
import { bossResultLine, floorResultLine } from './descentText'

describe('floorResultLine', () => {
  test('a cleared floor', () => {
    expect(
      floorResultLine({ floor: 3, cleared: true, fightResults: ['win', 'win'] }, 12),
    ).toBe('Floor 3: cleared')
  })

  test('a loss names the fight it ended on and the floor’s own fight count', () => {
    expect(
      floorResultLine({ floor: 5, cleared: false, fightResults: ['win', 'loss'] }, 14),
    ).toBe('Floor 5: loss at fight 2 of 14')
  })

  test('a draw is a draw, not a loss', () => {
    expect(
      floorResultLine({ floor: 4, cleared: false, fightResults: ['draw'] }, 13),
    ).toBe('Floor 4: draw at fight 1 of 13')
  })

  test('an uncleared floor that ends on a win is not a state the store produces', () => {
    expect(() =>
      floorResultLine({ floor: 4, cleared: false, fightResults: ['win'] }, 13),
    ).toThrow()
  })
})

describe('bossResultLine', () => {
  const name = BIOMES[0]!.boss!.creature.name

  test('no boss defeated: no line', () => {
    expect(
      bossResultLine({
        bossDefeated: null,
        bossFirstCleared: false,
        perkPointsGained: 0,
      }),
    ).toBeNull()
  })

  test('a first clear names the points the clear added', () => {
    expect(
      bossResultLine({
        bossDefeated: 'broodmother',
        bossFirstCleared: true,
        perkPointsGained: 100,
      }),
    ).toBe(`Defeated ${name}: first clear, +100 perk points`)
  })

  test('a repeat clear has no points', () => {
    expect(
      bossResultLine({
        bossDefeated: 'broodmother',
        bossFirstCleared: false,
        perkPointsGained: 0,
      }),
    ).toBe(`Defeated ${name}: already cleared, no perk points`)
  })

  test('an unknown boss id throws', () => {
    expect(() =>
      bossResultLine({
        bossDefeated: 'nobody',
        bossFirstCleared: true,
        perkPointsGained: 100,
      }),
    ).toThrow('nobody')
  })
})
