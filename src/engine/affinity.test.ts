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

// Full 5x5 table, hand-derived from the cycle: Body > Spirit > Mind > Void > Primal > Body.
const cases: Array<[Affinity, Affinity, number]> = [
  // Body
  ['body', 'body', NEU],
  ['body', 'spirit', ADV],
  ['body', 'mind', NEU],
  ['body', 'void', NEU],
  ['body', 'primal', DIS],
  // Spirit
  ['spirit', 'body', DIS],
  ['spirit', 'spirit', NEU],
  ['spirit', 'mind', ADV],
  ['spirit', 'void', NEU],
  ['spirit', 'primal', NEU],
  // Mind
  ['mind', 'body', NEU],
  ['mind', 'spirit', DIS],
  ['mind', 'mind', NEU],
  ['mind', 'void', ADV],
  ['mind', 'primal', NEU],
  // Void
  ['void', 'body', NEU],
  ['void', 'spirit', NEU],
  ['void', 'mind', DIS],
  ['void', 'void', NEU],
  ['void', 'primal', ADV],
  // Primal
  ['primal', 'body', ADV],
  ['primal', 'spirit', NEU],
  ['primal', 'mind', NEU],
  ['primal', 'void', DIS],
  ['primal', 'primal', NEU],
]

describe('getAffinityMultiplier', () => {
  it.each(cases)('%s vs %s -> %f', (attacker, defender, expected) => {
    expect(getAffinityMultiplier(attacker, defender)).toBe(expected)
  })

  it('gives each affinity exactly one advantage, one disadvantage, and three neutral matchups', () => {
    const affinities: Affinity[] = ['body', 'spirit', 'mind', 'void', 'primal']
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
