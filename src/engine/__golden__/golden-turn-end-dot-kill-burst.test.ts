import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-turn-end-dot-kill-burst.fixture'
import { expectedEvents } from './golden-turn-end-dot-kill-burst.fixture'

describe('golden replay: a status spread by a turn-end tick on-death ticks at its new bearer own turn end', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison lands in Rotcore's turn, so E1 ticks at its own turn end the same round)", () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
