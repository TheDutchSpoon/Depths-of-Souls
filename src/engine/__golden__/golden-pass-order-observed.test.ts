import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pass-order-observed.fixture'

describe('golden replay: observation hooks in turn order', () => {
  it('a faster enemy reacts before a slower player creature, on both observation passes', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(fixture.expectedEvents)
  })
})
