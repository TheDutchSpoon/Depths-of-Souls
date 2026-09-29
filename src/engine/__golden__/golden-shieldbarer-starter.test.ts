import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-shieldbarer-starter.fixture'
import { expectedFirstTurnEvents } from './golden-shieldbarer-starter.fixture'

describe('golden replay: Shieldbarer starter team-wide Defence buff (Phase 4 Slice F, real content)', () => {
  it("matches the committed event log for the provoker's first turn exactly", () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedFirstTurnEvents)
  })
})
