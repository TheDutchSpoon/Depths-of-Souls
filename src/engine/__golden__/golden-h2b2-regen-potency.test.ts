import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-regen-potency.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-regen-potency.fixture'

describe('golden replay: Regen heals the frozen potency of its healer, credited to the healer while it lives, else the bearer (4.1-H2b2)', () => {
  it('matches the committed event log exactly (potency from the healer, frozen at application, dead-healer fallback)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
