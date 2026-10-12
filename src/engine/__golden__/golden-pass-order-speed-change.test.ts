import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pass-order-speed-change.fixture'

describe('golden replay: a Speed change between passes', () => {
  it('a pass keeps the order it was taken in; the next pass reads the new Speed', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(fixture.expectedEvents)
  })
})
