import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b1-support-heals-own-side.fixture'
import { expectedEvents } from './golden-b1-support-heals-own-side.fixture'

describe('golden replay: an enemy support caster under always-cast heals its own lowest-HP ally', () => {
  it('matches the committed event log exactly across one round', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
