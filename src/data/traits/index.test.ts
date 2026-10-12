import { describe, expect, it } from 'vitest'
import { STARTER_TRAITS } from './starters'
import { BROODMOTHER_TRAIT } from './overgrowth'
import { STOCK_TRAITS, TRAIT_REGISTRY } from './index'
import { FIXTURE_TRAITS_BY_ID } from '../../engine/__fixtures__/traits'

describe('the trait registry', () => {
  it('registers every stock trait by id', () => {
    expect([...TRAIT_REGISTRY.keys()].sort()).toEqual(
      STOCK_TRAITS.map((t) => t.id).sort(),
    )
  })

  // Guardrail against an unwired library grouping (`CONVENTIONS.md#effect-carriers-live-in-libraries`): a representative const from each of starters/overgrowth must actually
  // land in STOCK_TRAITS, not just exist in its own file.
  it('every library grouping (starters/overgrowth) is actually spread into STOCK_TRAITS', () => {
    for (const starterTrait of STARTER_TRAITS) {
      expect(STOCK_TRAITS).toContain(starterTrait)
    }
    expect(STOCK_TRAITS).toContain(BROODMOTHER_TRAIT)
  })

  it('holds no mechanism-test fixture trait', () => {
    for (const id of FIXTURE_TRAITS_BY_ID.keys()) {
      expect(TRAIT_REGISTRY.has(id)).toBe(false)
    }
  })
})
