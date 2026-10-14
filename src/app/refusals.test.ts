import { describe, expect, test } from 'vitest'
import type { DescendFailureReason } from '../state/store'
import { createGameStore } from '../state/store'
import { descendRefusalText, seedRefusalText } from './refusals'
import { parseSeedField } from './startRun'
import type { SeedRefusal } from './startRun'

// Records keyed by the reason unions: adding a reason without a row here is a type error.
const descendReasons: Record<DescendFailureReason, true> = {
  'no-spec': true,
  'empty-party': true,
  'floor-out-of-reach': true,
  'beyond-content-frontier': true,
}
const seedReasons: Record<SeedRefusal, true> = {
  'not-a-whole-number': true,
  'seed-out-of-range': true,
}

function expectDistinctPlainTexts(texts: string[]) {
  expect(new Set(texts).size).toBe(texts.length)
  for (const text of texts) {
    expect(text.trim()).not.toBe('')
    // The same ids the comments check rejects: a player-facing string names no phase.
    expect(text).not.toMatch(/\b(phase|slice)\b|\b\d+\.\d+\b|\b\d+-[A-Z]\d*\b/i)
  }
}

describe('refusal text', () => {
  test('every descend refusal reason has its own plain text', () => {
    const reasons = Object.keys(descendReasons) as DescendFailureReason[]
    expectDistinctPlainTexts(reasons.map(descendRefusalText))
  })

  test('every seed refusal reason has its own plain text', () => {
    const reasons = Object.keys(seedReasons) as SeedRefusal[]
    expectDistinctPlainTexts(reasons.map(seedRefusalText))
  })

  test('the reasons the real store and the seed field produce all have text', () => {
    const store = createGameStore()
    const produced = new Set<DescendFailureReason>()
    const note = (reason: DescendFailureReason) => produced.add(reason)

    const noSpec = store.getState().canDescend(1)
    if (!noSpec.ok) note(noSpec.reason)
    store.getState().setSpec('brute')
    store.getState().setPartySlot(0, null)
    const empty = store.getState().canDescend(1)
    if (!empty.ok) note(empty.reason)
    store.getState().setSpec('sorcerer')
    store.getState().runScriptedIntro()
    for (const floor of [2.5, 99, 31]) {
      const result = store.getState().canDescend(floor)
      if (!result.ok) note(result.reason)
    }
    expect([...produced].sort()).toEqual(Object.keys(descendReasons).sort())
    for (const reason of produced) expect(descendRefusalText(reason)).not.toBe('')

    for (const text of ['abc', '4294967296']) {
      const parsed = parseSeedField(text)
      expect(parsed.ok).toBe(false)
      if (!parsed.ok) expect(seedRefusalText(parsed.reason)).not.toBe('')
    }
  })
})
