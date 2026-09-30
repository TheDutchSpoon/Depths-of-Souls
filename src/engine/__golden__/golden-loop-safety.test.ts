import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-loop-safety.fixture'
import { expectedEvents, expectedResult } from './golden-loop-safety.fixture'

describe('golden replay: loop safety (self-re-entry guard)', () => {
  it('fires a self-targeting retaliate once per hit — the guard blocks the re-entry loop', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
