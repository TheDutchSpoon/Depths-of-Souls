import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-rot-sovereign.fixture'
import { expectedEvents } from './golden-rot-sovereign.fixture'

describe('golden replay: Rotcap Hollow Rot Sovereign attrition (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (an add death and a player death both grow her Attack at the same flat rate, compounding)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives (now carrying Spore)
  })
})
