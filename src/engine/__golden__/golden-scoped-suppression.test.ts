import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-scoped-suppression.fixture'
import { expectedEvents, expectedResult } from './golden-scoped-suppression.fixture'

describe('golden replay: scoped action-lock (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly -- Cast skipped, Attack still fires, no SpellCast ever emitted', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
    expect(events.some((e) => e.type === 'SpellCast')).toBe(false)
  })
})
