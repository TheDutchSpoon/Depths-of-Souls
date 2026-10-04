import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b2-silenced-refuses-granted-cast.fixture'
import { expectedEvents } from './golden-b2-silenced-refuses-granted-cast.fixture'

describe('golden replay: B2.2 -- Silence refuses a granted cast and draws nothing (Phase 4.1-C2c)', () => {
  it('matches the committed event log exactly', () => {
    const { initial, events, state } = runGolden(fixture)
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
