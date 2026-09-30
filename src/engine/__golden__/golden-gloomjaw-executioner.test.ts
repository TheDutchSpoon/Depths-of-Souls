import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-gloomjaw-executioner.fixture'
import { expectedEvents, expectedResult } from './golden-gloomjaw-executioner.fixture'

describe('golden replay: Glimmerdark Gloomjaws Executioner (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Attack snowballs, compounding, across two kills)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
