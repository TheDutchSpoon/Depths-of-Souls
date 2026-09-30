import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b1-support-heals-own-side.fixture'
import { expectedEvents } from './golden-b1-support-heals-own-side.fixture'

describe('golden replay: B1 -- an enemy support caster under always-cast heals its own lowest-HP ally (Phase 4.1-C2b)', () => {
  it('matches the committed event log exactly across one round', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
