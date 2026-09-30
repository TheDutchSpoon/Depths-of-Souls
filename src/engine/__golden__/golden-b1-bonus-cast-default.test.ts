import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b1-bonus-cast-default.fixture'
import { expectedEvents } from './golden-b1-bonus-cast-default.fixture'

describe('golden replay: B1 -- a bonus cast defaults to the lowest-HP enemy (Phase 4.1-C2b)', () => {
  it('matches the committed event log exactly -- slot 1 (lower HP) is hit, not slot 0', () => {
    const { initial, events, state } = runGolden(fixture)
    // Fight setup adds no innate spell here: the slot list is exactly the one authored spell.
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
