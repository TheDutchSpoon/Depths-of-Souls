import { describe, expect, test } from 'vitest'
import {
  perkDescription,
  SPECIALIZATIONS,
  SPECIALIZATIONS_BY_ID,
} from '../data/specializations'
import { createGameStore } from '../state/store'
import {
  checkPerkField,
  chosenSpecialization,
  INACTIVE_LABEL,
  parsePerkLevelField,
  perkRows,
  setPerkFromField,
} from './perkRows'
import { startRun } from './startRun'

// Copied from specializations.test.ts: a test file is not importable data.
const KNOWN_INERT_PERK_IDS = [
  'wit-mastery',
  'violence-mastery',
  'endurance-mastery',
  'vitality-mastery',
  'instinct-mastery',
  'arcane-shields',
  'arcane-versatility',
  'true-wit',
  'shield-specialist',
]

function started(specId = 'brute') {
  const store = createGameStore()
  startRun(store.getState(), specId, '9')
  return store
}

describe('the inactive label', () => {
  test('reads as a plain sentence naming no phase', () => {
    expect(INACTIVE_LABEL).toBe("inactive (its system isn't built yet)")
  })

  test('lands on exactly the nine known-inert perks, across every spec', () => {
    const labelled = SPECIALIZATIONS.flatMap((spec) =>
      perkRows(spec, new Map())
        .filter((row) => row.inactive)
        .map((row) => row.id),
    )
    expect([...labelled].sort()).toEqual([...KNOWN_INERT_PERK_IDS].sort())
  })
})

describe('chosenSpecialization', () => {
  test('no chosen spec is null', () => {
    expect(chosenSpecialization(null)).toBeNull()
  })

  test('a known id is its spec', () => {
    expect(chosenSpecialization('brute')).toBe(SPECIALIZATIONS_BY_ID.get('brute'))
  })

  test('an unknown id throws', () => {
    expect(() => chosenSpecialization('nope')).toThrow(/unknown specialization nope/)
  })
})

describe('perkRows', () => {
  test('one row per perk in data order, absent from the spend meaning level 0', () => {
    const spec = SPECIALIZATIONS_BY_ID.get('brute')!
    const rows = perkRows(spec, new Map([['might', 4]]))
    expect(rows.map((row) => row.id)).toEqual(spec.perks.map((perk) => perk.id))
    const might = rows.find((row) => row.id === 'might')!
    expect(might.level).toBe(4)
    expect(might.maxLevel).toBe(spec.perks.find((perk) => perk.id === 'might')!.maxLevel)
    expect(rows.filter((row) => row.level > 0)).toHaveLength(1)
  })

  test('level reads the spend after a set, after Refund all and after a switch', () => {
    const store = started('brute')
    store.getState().recordBossKill('broodmother')
    const levelOf = () => {
      const state = store.getState()
      const spec = SPECIALIZATIONS_BY_ID.get(state.chosenSpec!)!
      return perkRows(spec, state.perkSpend).find((row) => row.id === 'might')!.level
    }
    expect(setPerkFromField(store.getState(), 'might', '3').ok).toBe(true)
    expect(levelOf()).toBe(3)
    store.getState().refundAllPerks()
    expect(levelOf()).toBe(0)
    expect(setPerkFromField(store.getState(), 'might', '2').ok).toBe(true)
    store.getState().setSpec('sorcerer')
    const sorcerer = SPECIALIZATIONS_BY_ID.get('sorcerer')!
    expect(
      perkRows(sorcerer, store.getState().perkSpend).every((row) => row.level === 0),
    ).toBe(true)
  })
})

describe('the level field', () => {
  test('only trimmed digits are a level', () => {
    expect(parsePerkLevelField(' 3 ')).toBe(3)
    expect(parsePerkLevelField('0')).toBe(0)
    for (const text of ['', 'abc', '2.5', '-1', '0x10', '1e1']) {
      expect(parsePerkLevelField(text), text).toBeNaN()
    }
  })

  test('blank, text, a fraction, a negative and max + 1 are invalid-level and never throw', () => {
    const store = started('brute')
    store.getState().recordBossKill('broodmother')
    const max = SPECIALIZATIONS_BY_ID.get('brute')!.perks.find(
      (p) => p.id === 'might',
    )!.maxLevel
    for (const text of ['', 'abc', '2.5', '-1', String(max + 1)]) {
      expect(checkPerkField(store.getState(), 'might', text), text).toEqual({
        ok: false,
        reason: 'invalid-level',
      })
      expect(setPerkFromField(store.getState(), 'might', text), text).toEqual({
        ok: false,
        reason: 'invalid-level',
      })
    }
    expect(store.getState().perkSpend.size).toBe(0)
  })

  test('one level past the free points is over-budget', () => {
    const store = started('brute')
    store.getState().recordBossKill('broodmother')
    // No single perk costs more than one boss's 100 points, so the budget is crossed by a
    // second perk: leave two points free, then ask for one level of a dearer perk.
    const spec = SPECIALIZATIONS_BY_ID.get('brute')!
    const cheap = spec.perks.find((p) => p.costPerLevel === 2 && p.maxLevel === 50)!
    expect(setPerkFromField(store.getState(), cheap.id, '49').ok).toBe(true)
    expect(checkPerkField(store.getState(), cheap.id, '50')).toEqual({ ok: true })
    const dearer = spec.perks.find((p) => p.costPerLevel > 2)!
    expect(checkPerkField(store.getState(), dearer.id, '1')).toEqual({
      ok: false,
      reason: 'over-budget',
    })
  })

  test('a field set with no spec is refused by the store, not thrown', () => {
    const store = createGameStore()
    expect(checkPerkField(store.getState(), 'might', '1')).toEqual({
      ok: false,
      reason: 'no-spec',
    })
  })
})

describe('the description', () => {
  test('every row of every spec carries its perk’s description', () => {
    for (const spec of SPECIALIZATIONS) {
      for (const row of perkRows(spec, new Map())) {
        expect(row.description).toBe(perkDescription(row.id))
        expect(row.description.trim()).not.toBe('')
      }
    }
  })

  test('an inactive perk carries one too', () => {
    const rows = perkRows(SPECIALIZATIONS_BY_ID.get('sorcerer')!, new Map())
    const mastery = rows.find((row) => row.id === 'wit-mastery')!
    expect(mastery.inactive).toBe(true)
    expect(mastery.description).toBe(
      'Your creatures can equip Wit spell gems regardless of affinity.',
    )
  })
})
