import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-sporecloud-reaper-no-spore.fixture'
import { expectedEvents } from './golden-sporecloud-reaper-no-spore.fixture'

describe('golden replay: PR #64 fix 4 -- a zero-count magnitudeSource is a full no-op (real content)', () => {
  it('matches the committed event log exactly (Reaper lands exactly one DamageDealt with no Spored enemies)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
