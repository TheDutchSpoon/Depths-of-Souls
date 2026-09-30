import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-snapjaw-ironjaw.fixture'
import { expectedEvents } from './golden-snapjaw-ironjaw.fixture'

describe('golden replay: Snapjaws Ironjaw (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly across 2 rounds', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
