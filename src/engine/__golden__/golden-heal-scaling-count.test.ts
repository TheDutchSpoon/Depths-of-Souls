import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-heal-scaling-count.fixture'
import { expectedEvents } from './golden-heal-scaling-count.fixture'

describe('golden replay: heal magnitudeSource mode (Phase 4 Slice E2, Necromoss-shaped)', () => {
  it('matches the committed event log exactly across round 1’s two turns', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
