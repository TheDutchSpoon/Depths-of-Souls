import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-heal-cast.fixture'
import { expectedEvents, expectedResult } from './golden-heal-cast.fixture'

describe('golden replay: heal-payload Cast (Phase 4 Slice E)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
