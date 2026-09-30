import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-on-action-hooks.fixture'
import { expectedEvents } from './golden-on-action-hooks.fixture'

describe('golden replay: on-[action] hooks (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly across 4 rounds (on-defend/on-provoke/on-cast/on-attack)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // DUMMY's 1000 HP survives all 4 rounds -- fight not over
  })
})
