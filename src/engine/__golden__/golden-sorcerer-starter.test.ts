import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-sorcerer-starter.fixture'
import { expectedEvents, expectedResult } from './golden-sorcerer-starter.fixture'

describe('golden replay: Sorcerer starter bonus-cast (Phase 4 Slice F, real content, new primitive)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
