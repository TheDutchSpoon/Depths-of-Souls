import { describe, expect, test } from 'vitest'
import { SPECIALIZATIONS, SPECIALIZATIONS_BY_ID } from '../data/specializations'
import { createGameStore } from '../state/store'
import { perkPointSummary } from './perkPoints'

const summarize = (store: ReturnType<typeof createGameStore>) =>
  perkPointSummary(store.getState(), SPECIALIZATIONS_BY_ID)

describe('perkPointSummary', () => {
  test('no spec chosen: nothing earned, nothing spent', () => {
    const store = createGameStore()
    expect(summarize(store)).toEqual({ earned: 0, spent: 0, free: 0 })
  })

  test('earned is 100 a first-cleared boss; free is earned minus spent', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')
    store.getState().recordBossKill('broodmother')
    expect(summarize(store)).toEqual({ earned: 100, spent: 0, free: 100 })
    store.getState().recordBossKill('broodmother')
    expect(summarize(store).earned).toBe(100)
    expect(store.getState().setPerkLevel('might', 10)).toEqual({ ok: true })
    // 10 levels of Might at 2 points each.
    expect(summarize(store)).toEqual({ earned: 100, spent: 20, free: 80 })
  })

  // The spent figure restates the store's own sum, so the store's `over-budget` boundary is the
  // judge: for every perk that has a next level, `canSetPerkLevel` agrees exactly with
  // `costPerLevel <= free`. With `spent` dropped to 0 (or summed without `costPerLevel`) free
  // would read 100 and the dearest perks would be wrongly allowed.
  test.each(SPECIALIZATIONS.map((spec) => spec.id))(
    '%s: the spent figure agrees with canSetPerkLevel at the budget boundary',
    (specId) => {
      const store = createGameStore()
      store.getState().setSpec(specId)
      store.getState().recordBossKill('broodmother')
      const spec = SPECIALIZATIONS_BY_ID.get(specId)!
      // The 1-point perk, 50 levels: 50 spent, 50 free, between the cheapest and dearest levels.
      const cheap = spec.perks.find((perk) => perk.costPerLevel === 1)!
      expect(store.getState().setPerkLevel(cheap.id, 50)).toEqual({ ok: true })
      const summary = summarize(store)
      expect(summary).toEqual({ earned: 100, spent: 50, free: 50 })

      let allowed = 0
      let overBudget = 0
      for (const perk of spec.perks) {
        const level = store.getState().perkSpend.get(perk.id) ?? 0
        // Past maxLevel the answer is invalid-level, not a budget answer.
        if (level + 1 > perk.maxLevel) {
          expect(store.getState().canSetPerkLevel(perk.id, level + 1)).toEqual({
            ok: false,
            reason: 'invalid-level',
          })
          continue
        }
        const answer = store.getState().canSetPerkLevel(perk.id, level + 1)
        expect(answer.ok).toBe(perk.costPerLevel <= summary.free)
        if (answer.ok) allowed += 1
        else {
          expect(answer.reason).toBe('over-budget')
          overBudget += 1
        }
      }
      expect(allowed).toBeGreaterThan(0)
      expect(overBudget).toBeGreaterThan(0)
    },
  )

  test('a purchase that would spend past what is earned is over-budget', () => {
    const store = createGameStore()
    store.getState().setSpec('sorcerer')
    expect(summarize(store).free).toBe(0)
    expect(store.getState().canSetPerkLevel('spell-focus', 1)).toEqual({
      ok: false,
      reason: 'over-budget',
    })
  })
})
