import { describe, expect, it } from 'vitest'
import { getAffinityMultiplier } from './affinity'
import type { Affinity } from './types'
import {
  AFFINITY_ADVANTAGE_MULTIPLIER,
  AFFINITY_DISADVANTAGE_MULTIPLIER,
  AFFINITY_NEUTRAL_MULTIPLIER,
} from './config'

const ADV = AFFINITY_ADVANTAGE_MULTIPLIER
const DIS = AFFINITY_DISADVANTAGE_MULTIPLIER
const NEU = AFFINITY_NEUTRAL_MULTIPLIER

// Full 5x5 table, hand-derived from the cycle: Vitality > Violence > Wit > Endurance > Instinct >
// Vitality.
const cases: Array<[Affinity, Affinity, number]> = [
  // Vitality
  ['vitality', 'vitality', NEU],
  ['vitality', 'violence', ADV],
  ['vitality', 'wit', NEU],
  ['vitality', 'endurance', NEU],
  ['vitality', 'instinct', DIS],
  // Violence
  ['violence', 'vitality', DIS],
  ['violence', 'violence', NEU],
  ['violence', 'wit', ADV],
  ['violence', 'endurance', NEU],
  ['violence', 'instinct', NEU],
  // Wit
  ['wit', 'vitality', NEU],
  ['wit', 'violence', DIS],
  ['wit', 'wit', NEU],
  ['wit', 'endurance', ADV],
  ['wit', 'instinct', NEU],
  // Endurance
  ['endurance', 'vitality', NEU],
  ['endurance', 'violence', NEU],
  ['endurance', 'wit', DIS],
  ['endurance', 'endurance', NEU],
  ['endurance', 'instinct', ADV],
  // Instinct
  ['instinct', 'vitality', ADV],
  ['instinct', 'violence', NEU],
  ['instinct', 'wit', NEU],
  ['instinct', 'endurance', DIS],
  ['instinct', 'instinct', NEU],
]

describe('getAffinityMultiplier', () => {
  it.each(cases)('%s vs %s -> %f', (attacker, defender, expected) => {
    expect(getAffinityMultiplier(attacker, defender)).toBe(expected)
  })

  it('gives each affinity exactly one advantage, one disadvantage, and three neutral matchups', () => {
    const affinities: Affinity[] = [
      'vitality',
      'violence',
      'wit',
      'endurance',
      'instinct',
    ]
    for (const attacker of affinities) {
      const results = affinities.map((defender) =>
        getAffinityMultiplier(attacker, defender),
      )
      expect(results.filter((m) => m === ADV)).toHaveLength(1)
      expect(results.filter((m) => m === DIS)).toHaveLength(1)
      expect(results.filter((m) => m === NEU)).toHaveLength(3)
    }
  })
})
