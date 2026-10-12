import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pass-order-fight-start.fixture'

describe('golden replay: on-fight-start in turn order', () => {
  it('a fast enemy fires before a slow player creature, with no queue built yet', () => {
    const { initial, events } = runGolden(fixture)

    expect(initial.turnQueue).toEqual([])
    expect(events).toEqual(fixture.expectedEvents)
  })
})
