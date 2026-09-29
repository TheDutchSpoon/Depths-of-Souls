import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-turn-order-status.fixture'
import { expectedEvents } from './golden-turn-order-status.fixture'

describe('golden replay: turn-order status (Phase 4 Slice C)', () => {
  it('matches the committed event log exactly across round 1 (act-first / normal / act-last)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // nobody dies -- fight not over
  })
})
