import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-dead-slot-round-boundary.fixture'
import { expectedEvents } from './golden-dead-slot-round-boundary.fixture'

describe('golden replay: dead entries that end the round', () => {
  it('matches the committed event log exactly: one call runs past them through the round end', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
