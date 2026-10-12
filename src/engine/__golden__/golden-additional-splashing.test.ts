import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-additional-splashing.fixture'
import { expectedEvents } from './golden-additional-splashing.fixture'

describe('golden replay: the Additional lands on every Splashing hit', () => {
  it('adds 10 to the main hit and to each neighbour hit, each recomputed', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
