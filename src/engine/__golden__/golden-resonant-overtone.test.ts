import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-resonant-overtone.fixture'
import { expectedEvents } from './golden-resonant-overtone.fixture'

describe('golden replay: Glimmerdark Resonant Overtone echo-cast (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (one echo fires, its own re-observation fails, echo damage lands before the original)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 80 HP
  })
})
