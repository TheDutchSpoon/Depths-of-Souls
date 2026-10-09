import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b2-tick-kill-on-death.fixture'
import { expectedEvents, expectedResult } from './golden-h2b2-tick-kill-on-death.fixture'

describe('golden replay: a tick that kills its bearer offers no triggering-source to the bearer on-death either (4.1-H2b2)', () => {
  it('matches the committed event log exactly (Last Words fires and resolves to nothing)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
