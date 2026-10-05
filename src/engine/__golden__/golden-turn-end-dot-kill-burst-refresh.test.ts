import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-turn-end-dot-kill-burst-refresh.fixture'
import { expectedEvents } from './golden-turn-end-dot-kill-burst-refresh.fixture'

describe('golden replay: a status refreshed by a turn-end tick on-death ticks at its bearer own turn end, at the new stack count', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison refreshes E1's existing Poison in Rotcore's turn, so E1 ticks 2 stacks at its own turn end)", () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
