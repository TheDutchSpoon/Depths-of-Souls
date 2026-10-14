import { describe, expect, test } from 'vitest'
import { BIOMES } from '../data/biomes'
import { perkPointsFor } from '../state/rewards'
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
    expect(bossResultLine(null, new Set(), new Set(), BIOMES)).toBeNull()
  })

  test('a boss the snapshot lacks is a first clear, with the points the clear added', () => {
    const line = bossResultLine(
      'broodmother',
      new Set(),
      new Set(['broodmother']),
      BIOMES,
    )
    expect(line).toBe(`Defeated ${name}: first clear, +100 perk points`)
  })

  // The figure is the difference of `perkPointsFor`, not a literal: a snapshot gap of two
  // bosses reads +200.
  test('the points are the difference between the two sets', () => {
    const after = new Set(['other-boss', 'broodmother'])
    expect(perkPointsFor(after) - perkPointsFor(new Set())).toBe(200)
    expect(bossResultLine('broodmother', new Set(), after, BIOMES)).toBe(
      `Defeated ${name}: first clear, +200 perk points`,
    )
  })

  test('a boss already in the snapshot is a repeat clear with no points', () => {
    const both = new Set(['broodmother'])
    expect(bossResultLine('broodmother', both, both, BIOMES)).toBe(
      `Defeated ${name}: already cleared, no perk points`,
    )
  })

  test('an unknown boss id throws', () => {
    expect(() =>
      bossResultLine('nobody', new Set(), new Set(['nobody']), BIOMES),
    ).toThrow('nobody')
  })
})
