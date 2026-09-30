import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-sleep-wake.fixture'
import { expectedEvents } from './golden-sleep-wake.fixture'

describe('golden replay: Sleep two-trigger composition (Phase 4 Slice E2)', () => {
  it('matches the committed event log exactly across round 1’s two turns', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
