import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-triggered-damage.fixture'
import { expectedEvents, expectedResult } from './golden-triggered-damage.fixture'

describe('golden replay: triggered damage (retaliate), TriggerFired + death pre-emption', () => {
  it('fires RETALIATE via TriggerFired on non-lethal hits, and not on the killing blow', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
