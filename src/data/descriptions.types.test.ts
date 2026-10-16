import { describe, expect, test } from 'vitest'
import type { PerkDef } from './specializations'
import { SPECIALIZATIONS } from './specializations'
import type { DescribedTrait } from './traits/described'
import { STOCK_TRAITS } from './traits'
import type { Trait } from '../engine/effect-types'

// The compiler is the check: each `@ts-expect-error` line below must stay an error, and
// `npx tsc -b` fails with "Unused '@ts-expect-error' directive" if it stops being one.

describe('the compiler refuses a stock carrier without a description', () => {
  test('a described trait literal with no description', () => {
    // @ts-expect-error -- a DescribedTrait needs its description
    const trait: DescribedTrait = { id: 'no-text', name: 'No text', effects: [] }
    expect(trait.id).toBe('no-text')
  })

  test('a plain Trait in the stock trait collection’s element type', () => {
    const plain: Trait = { id: 'plain', name: 'Plain', effects: [] }
    // @ts-expect-error -- a plain Trait has no description, so it can't join STOCK_TRAITS
    const stock: (typeof STOCK_TRAITS)[number][] = [plain]
    expect(stock).toHaveLength(1)
  })

  test('a plain PerkDef in a stock specialization', () => {
    const plain: PerkDef = {
      id: 'p',
      name: 'P',
      maxLevel: 1,
      costPerLevel: 1,
      effects: [],
    }
    const base = SPECIALIZATIONS[0]!
    // @ts-expect-error -- a plain PerkDef has no description, so it can't be a stock perk
    const spec: (typeof SPECIALIZATIONS)[number] = { ...base, perks: [plain] }
    expect(spec.perks).toHaveLength(1)
  })
})
