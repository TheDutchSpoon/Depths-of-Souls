import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pass-order-poles.fixture'

describe('golden replay: turn-order poles in a hook pass', () => {
  it('an act-first and an act-last bearer take their poles in an observation pass, against Speed', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(fixture.expectedEvents)
  })
})
