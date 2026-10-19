import { describe, expect, test } from 'vitest'
import { createInstanceId } from '../state/ids'
import type {
  DescendFailureReason,
  SetPartySlotFailureReason,
  SetPerkLevelFailureReason,
  SetPerkLevelResult,
  SummonFailureReason,
} from '../state/store'
import { createGameStore } from '../state/store'
import {
  descendRefusalText,
  partySlotRefusalText,
  perkRefusalText,
  seedRefusalText,
  summonRefusalText,
} from './refusals'
import { parseSeedField } from './startRun'
import type { SeedRefusal } from './startRun'

// Records keyed by the reason unions: adding a reason without a row here is a type error.
const descendReasons: Record<DescendFailureReason, true> = {
  'no-spec': true,
  'empty-party': true,
  'floor-out-of-reach': true,
}
const summonReasons: Record<SummonFailureReason, true> = {
  'unknown-creature': true,
  'soul-incomplete': true,
}
const partySlotReasons: Record<SetPartySlotFailureReason, true> = {
  'slot-out-of-range': true,
  'unknown-instance': true,
}
const perkReasons: Record<SetPerkLevelFailureReason, true> = {
  'no-spec': true,
  'perk-not-in-spec': true,
  'invalid-level': true,
  'over-budget': true,
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
    expectDistinctPlainTexts(reasons.map((reason) => descendRefusalText(reason, 5)))
  })

  test('the seed texts name the bound MAX_RUN_SEED (4294967295)', () => {
    expect(seedRefusalText('seed-out-of-range')).toBe(
      'The seed must be between 0 and 4294967295.',
    )
    expect(seedRefusalText('not-a-whole-number')).toBe(
      'The seed must be a whole number, or blank for a random one.',
    )
  })

  test('the out-of-reach text names the reach it is given', () => {
    const five = descendRefusalText('floor-out-of-reach', 5)
    const thirteen = descendRefusalText('floor-out-of-reach', 13)
    expect(thirteen).toContain('from 1 to 13,')
    expect(five).toContain('from 1 to 5,')
    expect(five).not.toBe(thirteen)
  })

  test('every seed refusal reason has its own plain text', () => {
    const reasons = Object.keys(seedReasons) as SeedRefusal[]
    expectDistinctPlainTexts(reasons.map(seedRefusalText))
  })

  test('every summon refusal reason has its own plain text', () => {
    const reasons = Object.keys(summonReasons) as SummonFailureReason[]
    expectDistinctPlainTexts(reasons.map(summonRefusalText))
  })

  test('every party slot refusal reason has its own plain text', () => {
    const reasons = Object.keys(partySlotReasons) as SetPartySlotFailureReason[]
    expectDistinctPlainTexts(reasons.map(partySlotRefusalText))
  })

  test('every perk level refusal reason has its own plain text', () => {
    const reasons = Object.keys(perkReasons) as SetPerkLevelFailureReason[]
    expectDistinctPlainTexts(reasons.map(perkRefusalText))
  })

  test('the hub reasons the real store produces all have text', () => {
    const store = createGameStore()
    const summons = new Set<SummonFailureReason>()
    for (const id of ['brute-starter', 'no-such-creature']) {
      const check = store.getState().canSummon(id)
      if (!check.ok) summons.add(check.reason)
    }
    expect([...summons].sort()).toEqual(Object.keys(summonReasons).sort())
    for (const reason of summons) expect(summonRefusalText(reason)).not.toBe('')

    const slots = new Set<SetPartySlotFailureReason>()
    for (const [slot, id] of [
      [99, null],
      [0, createInstanceId('inst-404')],
    ] as const) {
      const check = store.getState().canSetPartySlot(slot, id)
      if (!check.ok) slots.add(check.reason)
    }
    expect([...slots].sort()).toEqual(Object.keys(partySlotReasons).sort())
    for (const reason of slots) expect(partySlotRefusalText(reason)).not.toBe('')

    const perks = new Set<SetPerkLevelFailureReason>()
    const note = (check: SetPerkLevelResult) => {
      if (!check.ok) perks.add(check.reason)
    }
    note(store.getState().canSetPerkLevel('might', 1))
    store.getState().setSpec('brute')
    note(store.getState().canSetPerkLevel('no-such-perk', 1))
    note(store.getState().canSetPerkLevel('might', Number.NaN))
    note(store.getState().canSetPerkLevel('might', 1))
    expect([...perks].sort()).toEqual(Object.keys(perkReasons).sort())
    for (const reason of perks) expect(perkRefusalText(reason)).not.toBe('')
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
    for (const reason of produced) expect(descendRefusalText(reason, 5)).not.toBe('')

    for (const text of ['abc', '4294967296']) {
      const parsed = parseSeedField(text)
      expect(parsed.ok).toBe(false)
      if (!parsed.ok) expect(seedRefusalText(parsed.reason)).not.toBe('')
    }
  })
})
