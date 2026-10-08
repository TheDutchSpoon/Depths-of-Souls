import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b1-wick-skips-self.fixture'
import { expectedEvents } from './golden-h2b1-wick-skips-self.fixture'

describe('golden replay: wick-skips-self (4.1-H2b1)', () => {
  it('the heal skips the Wick itself even when it is the most hurt ally', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
