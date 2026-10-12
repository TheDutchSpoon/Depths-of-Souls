import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-fizzle-retarget-attack.fixture'
import { expectedEvents } from './golden-fizzle-retarget-attack.fixture'

describe('golden replay: pre-hit-hook fizzle + rule 4 re-target', () => {
  it('matches the committed event log exactly -- no hit on the corpse, instance 2 lands on the lowest-HP survivor', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
