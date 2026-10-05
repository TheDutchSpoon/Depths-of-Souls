import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-spore-spread-dot-kill.fixture'
import { expectedEvents } from './golden-spore-spread-dot-kill.fixture'

describe('golden replay: PR #64 fix 1 -- Spore spreads when its OWN turn-end DoT tick kills the host', () => {
  it('matches the committed event log exactly (per-trigger guard identity, not the shared status instanceId)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // MATE survives (now carrying Spore); fight continues
  })
})
