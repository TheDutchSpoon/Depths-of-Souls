import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-status-snapshot-tick-kill-on-death.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-status-snapshot-tick-kill-on-death.fixture'

describe('golden replay: a tick that kills its bearer offers no triggering-source to the bearer on-death either', () => {
  it('matches the committed event log exactly (Last Words fires and resolves to nothing)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
