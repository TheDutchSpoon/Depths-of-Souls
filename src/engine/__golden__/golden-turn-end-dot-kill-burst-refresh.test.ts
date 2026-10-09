import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-turn-end-dot-kill-burst-refresh.fixture'
import { expectedEvents } from './golden-turn-end-dot-kill-burst-refresh.fixture'

describe('golden replay: a status re-applied by a turn-end tick on-death keeps one instance, takes the stronger snapshot, and ticks at its bearer own turn end', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison replaces the weaker snapshot on E1's existing Poison in Rotcore's turn, so E1 ticks the stronger potency at its own turn end)", () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
