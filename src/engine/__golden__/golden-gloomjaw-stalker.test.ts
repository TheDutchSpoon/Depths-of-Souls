import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-gloomjaw-stalker.fixture'
import { expectedEvents, expectedResult } from './golden-gloomjaw-stalker.fixture'

describe('golden replay: Glimmerdark Gloomjaws Predatory Instinct (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (no bonus at full HP, +30% once below 30%)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
