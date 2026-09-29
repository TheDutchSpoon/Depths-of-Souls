import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b6-provoke-stun-cleanup.fixture'
import { expectedEvents } from './golden-b6-provoke-stun-cleanup.fixture'

describe('golden replay: B6 -- a provoking creature Stunned before its next turn stops provoking at that turn start (Phase 4.1-C, D6)', () => {
  it('matches the committed event log exactly across 2 rounds, with no stale Provoke redirect', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // PROVOKER survives -- the fight isn't over
  })
})
