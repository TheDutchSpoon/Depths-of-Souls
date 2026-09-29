import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-brute-starter.fixture'
import { expectedEvents, expectedResult } from './golden-brute-starter.fixture'

describe('golden replay: Brute starter double-strike (Phase 4 Slice F, real content)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
