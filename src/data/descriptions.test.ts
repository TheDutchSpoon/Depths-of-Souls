import { describe, expect, test } from 'vitest'
import { BRUTISH } from '../engine/__fixtures__/traits'
import { perkDescription, SPECIALIZATIONS } from './specializations'
import { STOCK_TRAITS, traitDescription } from './traits'

const ALL_PERKS = SPECIALIZATIONS.flatMap((spec) => spec.perks)

describe('traitDescription', () => {
  test('returns the description of a known stock trait', () => {
    const wick = STOCK_TRAITS.find(
      (trait) => trait.id === 'flickerling-wick-burn-bright',
    )!
    expect(traitDescription(wick.id)).toBe(wick.description)
    expect(traitDescription('spider-ambusher-exploit')).toBe(
      'Deals 40% more damage to Webbed enemies.',
    )
  })

  test('throws on an unknown id and on a fixture trait’s id', () => {
    expect(() => traitDescription('no-such-trait')).toThrow(
      'no stock trait no-such-trait',
    )
    expect(() => traitDescription(BRUTISH.id)).toThrow(`no stock trait ${BRUTISH.id}`)
  })
})

describe('perkDescription', () => {
  test('returns the description of a known perk', () => {
    expect(perkDescription('echo')).toBe('Your creatures Cast spells an additional time.')
    expect(perkDescription('shield-bash')).toBe(
      "Attacks and spells deal additional damage equal to 3% of the creature's Defence per level.",
    )
  })

  test('throws on an unknown id', () => {
    expect(() => perkDescription('no-such-perk')).toThrow('no stock perk no-such-perk')
  })
})

describe('the shipped text', () => {
  test('there are 61 stock traits and 32 perks', () => {
    expect(STOCK_TRAITS).toHaveLength(61)
    expect(ALL_PERKS).toHaveLength(32)
  })

  test.each([
    ['trait', STOCK_TRAITS],
    ['perk', ALL_PERKS],
  ] as const)(
    'every %s description is non-blank with no Markdown left',
    (_kind, items) => {
      for (const item of items) {
        expect(item.description.trim(), item.id).not.toBe('')
        expect(item.description, item.id).not.toMatch(/[*`]|\.md#/)
      }
    },
  )

  test('no description names a build phase', () => {
    for (const item of [...STOCK_TRAITS, ...ALL_PERKS]) {
      expect(item.description, item.id).not.toMatch(/phase/i)
    }
  })

  test('perk ids are unique across the specializations', () => {
    const ids = ALL_PERKS.map((perk) => perk.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
