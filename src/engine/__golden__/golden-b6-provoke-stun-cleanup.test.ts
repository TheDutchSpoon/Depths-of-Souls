import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b6-provoke-stun-cleanup.fixture'
import { expectedEvents } from './golden-b6-provoke-stun-cleanup.fixture'

describe('golden replay: a provoking creature Stunned before its next turn stops provoking at that turn start', () => {
  it('matches the committed event log exactly across 2 rounds, with no stale Provoke redirect', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // PROVOKER survives -- the fight isn't over
  })
})
