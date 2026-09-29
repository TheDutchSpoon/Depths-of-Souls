import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b5-fizzle-rule4-retarget.fixture'
import { expectedEvents } from './golden-b5-fizzle-rule4-retarget.fixture'

describe('golden replay: B5 fizzle + rule 4 re-target (Phase 4.1-C2c)', () => {
  it('matches the committed event log exactly -- no hit on the corpse, instance 2 lands on the lowest-HP survivor', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
