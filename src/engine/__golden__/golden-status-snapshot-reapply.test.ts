import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-status-snapshot-reapply.fixture'
import { expectedEvents, expectedResult } from './golden-status-snapshot-reapply.fixture'

describe('golden replay: a status re-applied keeps one instance, refreshes its timer, and replaces its snapshot only when strictly stronger', () => {
  it('matches the committed event log exactly (stronger replaces, weaker refreshes only, a tie keeps the current applier)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
