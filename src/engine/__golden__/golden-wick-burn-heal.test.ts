import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-wick-burn-heal.fixture'
import { expectedEvents } from './golden-wick-burn-heal.fixture'

describe('golden replay: wick-burn-heal', () => {
  it('the Wick burns, the Flare reacts, the heal lands on the lowest-HP hurt ally and not on a lower-HP full-Health ally', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
