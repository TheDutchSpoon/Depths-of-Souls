import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-hollowkin-wretch.fixture'
import { expectedEvents } from './golden-hollowkin-wretch.fixture'

describe('golden replay: Rotcap Hollow Hollowkin Wretch retaliatory Confusion (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (a chip-only hit provokes a Confusion retaliation)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // WRETCH survives at 19 HP
  })
})
