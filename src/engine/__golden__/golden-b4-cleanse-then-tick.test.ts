import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b4-cleanse-then-tick.fixture'
import { expectedEvents } from './golden-b4-cleanse-then-tick.fixture'

describe('golden replay: exact-instance rule -- cleanse-then-tick', () => {
  it('matches the committed event log exactly across fight-start and the bearer’s own first turn', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
