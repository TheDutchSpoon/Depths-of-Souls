import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-retaliation-direct-only.fixture'
import { expectedEvents } from './golden-retaliation-direct-only.fixture'

describe('golden replay: the real retaliators answer only direct damage', () => {
  it('matches the committed event log exactly (an attack is answered; an indirect hit and a tick are not)', () => {
    const { events, initial, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
    expect(state.rng.position).toBe(initial.rng.position) // no RNG drawn
  })
})
