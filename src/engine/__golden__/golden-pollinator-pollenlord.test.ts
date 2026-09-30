import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-pollinator-pollenlord.fixture'
import { expectedEvents } from './golden-pollinator-pollenlord.fixture'

describe('golden replay: Pollinators Pollenlord (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly across 2 rounds', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
