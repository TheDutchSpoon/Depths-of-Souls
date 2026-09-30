import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-heal-scaling-stat.fixture'
import { expectedEvents } from './golden-heal-scaling-stat.fixture'

describe('golden replay: heal scalingStat mode (Phase 4 Slice E2, Treants Elder-shaped)', () => {
  it('matches the committed event log exactly across round 1’s two turns', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
