import { describe, expect, test } from 'vitest'
import { staticCreatureIdFor } from '../state/rewards'
import { createGameStore } from '../state/store'
import { descendRefusalText } from './refusals'
import { SPEC_CHOICES, startRun } from './startRun'

// The pinned seed's floor 1 clears with the first spec, so a seed that stops clearing fails here
// loudly instead of quietly weakening the checks below.
const PINNED_SEED = '424242'
const SPEC = SPEC_CHOICES[0]!

describe('the descent loop as the screen drives it', () => {
  test('start, the silent intro, floor 1, and both refusal paths', () => {
    expect(SPEC.name).toBe('Sorcerer')
    const store = createGameStore()
    const started = startRun(store.getState(), SPEC.id, PINNED_SEED)
    expect(started).toEqual({ ok: true, seed: 424242 })

    // The chosen spec's starter and the Unicorn are owned.
    const owned = [...store.getState().collection.values()].map(staticCreatureIdFor)
    expect(owned).toEqual(['sorcerer-starter', 'unicorn'])

    const run = store.getState().descend(1)
    if (!run.ok) throw new Error(`floor 1 refused: ${run.reason}`)
    expect(run.outcome.cleared).toBe(true)

    // Ten fights, each with its seed, both parties and the perk effects.
    const records = run.outcome.fightRecords
    expect(records).toHaveLength(10)
    for (const record of records) {
      expect(typeof record.seed).toBe('number')
      expect(record.playerParty.length).toBeGreaterThan(0)
      expect(record.enemyParty.length).toBeGreaterThan(0)
      expect(Array.isArray(record.playerEffects)).toBe(true)
    }

    // The party's levels after the last fight are above its levels going into the first.
    const first = records[0]!
    const last = records[records.length - 1]!
    last.partyLevelsAfter.forEach((level, index) => {
      expect(level).toBeGreaterThan(first.playerParty[index]!.level)
    })

    // Floor 31 is past the content frontier, with the text the screen shows.
    const beyond = store.getState().canDescend(31)
    expect(beyond).toEqual({ ok: false, reason: 'beyond-content-frontier' })
    expect(store.getState().descend(31)).toEqual({
      ok: false,
      reason: 'beyond-content-frontier',
    })
    expect(descendRefusalText('beyond-content-frontier')).toBe(
      'No floors that deep exist yet.',
    )

    // An emptied party is refused.
    for (let slot = 0; slot < 6; slot++) {
      expect(store.getState().setPartySlot(slot, null)).toEqual({ ok: true })
    }
    expect(store.getState().descend(1)).toEqual({ ok: false, reason: 'empty-party' })
    expect(descendRefusalText('empty-party')).toBe(
      'The party is empty: put a creature in it first.',
    )
  })
})
