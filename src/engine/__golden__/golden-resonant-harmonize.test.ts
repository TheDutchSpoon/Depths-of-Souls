import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-resonant-harmonize.fixture'
import { expectedEvents } from './golden-resonant-harmonize.fixture'

describe('golden replay: Glimmerdark Resonants Harmonize/Resonate (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (a cast is observed by the caster itself and an ally)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 88 HP
  })
})
