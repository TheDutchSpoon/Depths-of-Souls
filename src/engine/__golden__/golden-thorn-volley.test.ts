import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-thorn-volley.fixture'
import { expectedEvents } from './golden-thorn-volley.fixture'

describe('golden replay: Thorn Volley', () => {
  it('hits every living enemy once, each at its own Defence and affinity matchup', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
