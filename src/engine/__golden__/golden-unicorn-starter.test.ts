import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-unicorn-starter.fixture'
import { expectedEvents, expectedResult } from './golden-unicorn-starter.fixture'

describe('golden replay: the Unicorn (Phase 4 Slice F, real content)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
