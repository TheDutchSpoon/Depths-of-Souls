import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-treant-grovekeep.fixture'
import { expectedEvents } from './golden-treant-grovekeep.fixture'

describe('golden replay: Treants Grovekeep (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly (one-time team-wide Health raise)', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
